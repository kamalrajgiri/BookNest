
import type { Request, Response } from 'express';

import { sequelize } from '../config/database.js';
import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import CartItem from '../models/CartItem.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

// Convert a database rupee amount into integer paisa.
// Example: "250.50" -> 25050
function toPaisa(value: string | number): number {
  const amount = String(value);

  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error('Invalid book price stored in database.');
  }

  const [rupees, paisa = ''] = amount.split('.');

  return Number(rupees) * 100 +
    Number((paisa + '00').slice(0, 2));
}

// Convert integer paisa into a rupee amount.
// Example: 25050 -> "250.50"
function fromPaisa(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error('Invalid currency amount.');
  }

  const rupees = Math.floor(amount / 100);
  const paisa = amount % 100;

  return `${rupees}.${String(paisa).padStart(2, '0')}`;
}

function parseId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function getUserId(req: Request): number | null {
  const userId = req.user?.userId;

  return typeof userId === 'number' && Number.isSafeInteger(userId) && userId > 0
    ? userId
    : null;
}

type AdminUpdatableOrderStatus = 'processing' | 'shipped' | 'delivered';

function isAdminUpdatableOrderStatus(
  value: unknown
): value is AdminUpdatableOrderStatus {
  return (
    value === 'processing' ||
    value === 'shipped' ||
    value === 'delivered'
  );
}

function getErrorResponse(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof HttpError) {
    return {
      status: error.statusCode,
      message: error.message
    };
  }

  return {
    status: 500,
    message: 'An unexpected error occurred.'
  };
}

// POST /api/orders
export async function createOrder(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getUserId(req);

  if (!userId) {
    res.status(401).json({
      message: 'Authentication required.'
    });
    return;
  }

  try {
    const orderData = await sequelize.transaction(
      async (transaction) => {
        // Lock the customer's cart during checkout.
        const cart = await Cart.findOne({
          where: { userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!cart) {
          throw new HttpError(400, 'Your cart is empty.');
        }

        const cartItems = await CartItem.findAll({
          where: { cartId: cart.id },
          order: [['bookId', 'ASC']],
          transaction
        });

        if (cartItems.length === 0) {
          throw new HttpError(400, 'Your cart is empty.');
        }

        const orderItems: Array<{
          bookId: number;
          bookTitle: string;
          unitPrice: string;
          quantity: number;
        }> = [];

        // All monetary calculations are performed in paisa.
        let totalPaisa = 0;

        for (const cartItem of cartItems) {
          // Lock each book to prevent concurrent checkouts
          // from overselling the available stock.
          const book = await Book.findByPk(cartItem.bookId, {
            transaction,
            lock: transaction.LOCK.UPDATE
          });

          if (!book) {
            throw new HttpError(
              400,
              `Book ID ${cartItem.bookId} is no longer available.`
            );
          }

          const quantity = Number(cartItem.quantity);
          const stock = Number(book.stock);

          if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0 ||
            !Number.isSafeInteger(stock) ||
            stock < quantity
          ) {
            throw new HttpError(
              400,
              `Insufficient stock for "${book.title}".`
            );
          }

          const unitPricePaisa = toPaisa(book.price);
          const itemTotalPaisa = unitPricePaisa * quantity;

          if (!Number.isSafeInteger(itemTotalPaisa)) {
            throw new HttpError(400, 'Order amount is too large.');
          }

          totalPaisa += itemTotalPaisa;

          if (!Number.isSafeInteger(totalPaisa)) {
            throw new HttpError(400, 'Order total is too large.');
          }

          // Preserve purchase-time book information.
          orderItems.push({
            bookId: book.id,
            bookTitle: book.title,
            unitPrice: fromPaisa(unitPricePaisa),
            quantity
          });

          // Deduct stock inside the same transaction.
          await book.update(
            { stock: stock - quantity },
            { transaction }
          );
        }

        // Convert the final paisa total into rupees for MySQL.
        const totalAmount = fromPaisa(totalPaisa);

        const order = await Order.create(
          {
            userId,
            totalAmount,
            status: 'pending'
          },
          { transaction }
        );

        await OrderItem.bulkCreate(
          orderItems.map((item) => ({
            orderId: order.id,
            ...item
          })),
          { transaction }
        );

        // Create a pending Khalti payment record.
        await Payment.create(
          {
            orderId: order.id,
            amount: totalAmount,
            provider: 'khalti',
            status: 'pending'
          },
          { transaction }
        );

        // Clear cart items only after successful order creation.
        await CartItem.destroy({
          where: { cartId: cart.id },
          transaction
        });

        return {
          id: order.id,
          totalAmount,
          currency: 'NPR',
          status: order.status,
          items: orderItems,
          paymentStatus: 'pending'
        };
      }
    );

    res.status(201).json({
      message: 'Order created successfully.',
      data: orderData
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.status).json({
      message: result.message
    });
  }
}

// GET /api/orders
export async function getOrders(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getUserId(req);

  if (!userId) {
    res.status(401).json({
      message: 'Authentication required.'
    });
    return;
  }

  try {
    const isAdmin = req.user?.role === 'admin';

    const orders = await Order.findAll({
      where: isAdmin ? {} : { userId },
      include: [
        {
          model: OrderItem,
          include: [{ model: Book }]
        },
        { model: Payment },
        ...(isAdmin
          ? [
              {
                model: User,
                attributes: ['id', 'name', 'email']
              }
            ]
          : [])
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      message: 'Orders fetched successfully.',
      currency: 'NPR',
      data: orders
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.status).json({
      message: result.message
    });
  }
}

// GET /api/orders/:id
export async function getOrderById(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getUserId(req);
  const orderId = parseId(req.params.id);

  if (!userId) {
    res.status(401).json({
      message: 'Authentication required.'
    });
    return;
  }

  if (!orderId) {
    res.status(400).json({
      message: 'Invalid order ID.'
    });
    return;
  }

  try {
    const isAdmin = req.user?.role === 'admin';

    const order = await Order.findOne({
      where: isAdmin
        ? { id: orderId }
        : { id: orderId, userId },
      include: [
        {
          model: OrderItem,
          include: [{ model: Book }]
        },
        { model: Payment },
        ...(isAdmin
          ? [
              {
                model: User,
                attributes: ['id', 'name', 'email']
              }
            ]
          : [])
      ]
    });

    if (!order) {
      res.status(404).json({
        message: 'Order not found.'
      });
      return;
    }

    res.status(200).json({
      message: 'Order fetched successfully.',
      currency: 'NPR',
      data: order
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.status).json({
      message: result.message
    });
  }
}

// PATCH /api/orders/:id/cancel
export async function cancelOrder(
  req: Request,
  res: Response
): Promise<void> {
  const userId = getUserId(req);
  const orderId = parseId(req.params.id);

  if (!userId) {
    res.status(401).json({
      message: 'Authentication required.'
    });
    return;
  }

  if (!orderId) {
    res.status(400).json({
      message: 'Invalid order ID.'
    });
    return;
  }

  try {
    const cancelledOrder = await sequelize.transaction(
      async (transaction) => {
        const order = await Order.findOne({
          where: { id: orderId, userId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (!order) {
          throw new HttpError(404, 'Order not found.');
        }

        if (order.status !== 'pending') {
          throw new HttpError(
            400,
            'Only pending orders can be cancelled.'
          );
        }

        const orderItems = await OrderItem.findAll({
          where: { orderId },
          order: [['bookId', 'ASC']],
          transaction
        });

        // Restore stock, even if a book was soft-deleted later.
        for (const item of orderItems) {
          const book = await Book.findByPk(item.bookId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
            paranoid: false
          });

          if (book) {
            await book.update(
              {
                stock:
                  Number(book.stock) + Number(item.quantity)
              },
              { transaction }
            );
          }
        }

        await order.update(
          { status: 'cancelled' },
          { transaction }
        );

        const payment = await Payment.findOne({
          where: { orderId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (payment && payment.status === 'pending') {
          await payment.update(
            { status: 'failed' },
            { transaction }
          );
        }

        return order;
      }
    );

    res.status(200).json({
      message: 'Order cancelled successfully.',
      data: cancelledOrder
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.status).json({
      message: result.message
    });
  }
}

// PATCH /api/orders/:id/status
export async function updateOrderStatus(
  req: Request,
  res: Response
): Promise<void> {
  const orderId = parseId(req.params.id);
  const { status } = req.body ?? {};

  if (!orderId) {
    res.status(400).json({
      message: 'Invalid order ID.'
    });
    return;
  }

 const allowedTransitions: Record<string, readonly AdminUpdatableOrderStatus[]> = {
    paid: ['processing'],
    processing: ['shipped'],
    shipped: ['delivered']
  };

  if (!isAdminUpdatableOrderStatus(status)) {
    res.status(400).json({
      message: 'Invalid order status.'
    });
    return;
  }

  try {
    const order = await Order.findByPk(orderId);

    if (!order) {
      res.status(404).json({
        message: 'Order not found.'
      });
      return;
    }

    const allowedNextStatuses = allowedTransitions[order.status];

    if (!allowedNextStatuses?.includes(status)) {
      res.status(400).json({
        message:
          `Cannot change order status from "${order.status}" to "${status}".`
      });
      return;
    }

    await order.update({ status });

    res.status(200).json({
      message: 'Order status updated successfully.',
      data: order
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.status).json({
      message: result.message
    });
  }
}
