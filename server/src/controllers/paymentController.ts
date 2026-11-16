
import type { Request, Response } from 'express';
import { Transaction } from 'sequelize';

import { sequelize } from '../config/database.js';
import { config } from '../config/env.js';

import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
}

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function parseId(value: unknown): number | null {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) ? parsed : null;
}

function getUserId(req: Request): number {
  const userId = req.user?.userId;

  if (
    typeof userId !== 'number' ||
    !Number.isSafeInteger(userId) ||
    userId <= 0
  ) {
    throw new HttpError(401, 'Authentication required.');
  }

  return userId;
}

function toPaisa(amount: string | number): number {
  const amountString = String(amount);

  if (!/^\d+(\.\d{1,2})?$/.test(amountString)) {
    throw new HttpError(400, 'Invalid payment amount.');
  }

  const [rupees, paisa = ''] = amountString.split('.');
  const result =
    Number(rupees) * 100 +
    Number(paisa.padEnd(2, '0'));

  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new HttpError(400, 'Invalid payment amount.');
  }

  return result;
}

function getErrorResponse(error: unknown): {
  statusCode: number;
  message: string;
} {
  if (error instanceof HttpError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message: 'An unexpected error occurred.',
  };
}


async function khaltiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  if (!config.khaltiSecretKey) {
    throw new HttpError(
      500,
      'Khalti payment is not configured.'
    );
  }

  let response: globalThis.Response;

  try {
    response = await fetch(
      `${config.khaltiBaseUrl}/${endpoint}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${config.khaltiSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      }
    );
  } catch {
    throw new HttpError(
      502,
      'Unable to connect to Khalti. Please try again.'
    );
  }

  const responseData: unknown = await response.json().catch(
    () => null
  );

  if (!response.ok) {
    console.error('Khalti API error:', response.status, responseData);

    throw new HttpError(
      502,
      'Khalti could not process the payment request.'
    );
  }

  if (
    typeof responseData !== 'object' ||
    responseData === null
  ) {
    throw new HttpError(
      502,
      'Invalid response received from Khalti.'
    );
  }

  return responseData as T;
}

async function lookupKhaltiPayment(pidx: string) {
  return khaltiRequest<KhaltiLookupResponse>(
    'epayment/lookup/',
    { pidx }
  );
}


function isTerminalKhaltiStatus(status: string): boolean {
  return [
    'User canceled',
    'Expired',
    'Failed',
    'Canceled',
  ].includes(status);
}

// POST /api/orders/:id/pay

export async function initiateKhaltiPayment(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orderId = parseId(req.params.id);
    const userId = getUserId(req);

    if (!orderId) {
      throw new HttpError(400, 'Invalid order ID.');
    }

    const paymentDetails = await sequelize.transaction(
      async (transaction) => {
        const order = await Order.findOne({
          where: { id: orderId, userId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!order) {
          throw new HttpError(404, 'Order not found.');
        }

        if (order.status !== 'pending') {
          throw new HttpError(
            400,
            'Only pending orders can be paid.'
          );
        }

        const payment = await Payment.findOne({
          where: { orderId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!payment) {
          throw new HttpError(404, 'Payment record not found.');
        }

        if (payment.status === 'completed') {
          throw new HttpError(409, 'This order has already been paid.');
        }

        const user = await User.findByPk(userId, { transaction });

        if (!user) {
          throw new HttpError(404, 'User not found.');
        }

        const amount = toPaisa(payment.amount);

        if (amount < 1000) {
          throw new HttpError(
            400,
            'Khalti payments must be at least NPR 10.'
          );
        }

        return {
          amount,
          customerName: user.name,
          customerEmail: user.email,
          pidx: payment.pidx,
          paymentUrl: payment.paymentUrl,
          expiresAt: payment.expiresAt,
          paymentStatus: payment.status,
        };
      }
    );

    // Check an existing Khalti session before creating another one.
    if (paymentDetails.pidx) {
      const lookupResponse = await lookupKhaltiPayment(
        paymentDetails.pidx
      );

      if (
        lookupResponse.pidx !== paymentDetails.pidx ||
        lookupResponse.total_amount !== paymentDetails.amount
      ) {
        throw new HttpError(
          400,
          'Khalti payment details do not match this order.'
        );
      }

      if (lookupResponse.status === 'Completed') {
        if (!lookupResponse.transaction_id) {
          throw new HttpError(
            502,
            'Khalti did not return a transaction ID.'
          );
        }

        await sequelize.transaction(async (transaction) => {
          const order = await Order.findOne({
            where: { id: orderId, userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          const payment = await Payment.findOne({
            where: { orderId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (
            order?.status === 'pending' &&
            payment?.status === 'pending' &&
            payment.pidx === paymentDetails.pidx
          ) {
            payment.status = 'completed';
            payment.transactionId = lookupResponse.transaction_id;
            order.status = 'paid';

            await payment.save({ transaction });
            await order.save({ transaction });
          }
        });

        res.status(200).json({
          message: 'Payment has already been completed.',
          data: {
            orderId,
            paymentStatus: 'completed',
            orderStatus: 'paid',
            transactionId: lookupResponse.transaction_id,
            currency: 'NPR',
          },
        });
        return;
      }

      if (isTerminalKhaltiStatus(lookupResponse.status)) {
        // The old session is confirmed terminal, so it is safe
        // to release its unique pidx and allow a new attempt.
        await sequelize.transaction(async (transaction) => {
          const order = await Order.findOne({
            where: { id: orderId, userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          const payment = await Payment.findOne({
            where: { orderId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (
            !order ||
            order.status !== 'pending' ||
            !payment ||
            payment.pidx !== paymentDetails.pidx ||
            payment.status === 'completed'
          ) {
            throw new HttpError(
              409,
              'Order or payment changed. Refresh the order and try again.'
            );
          }

          payment.pidx = null;
          payment.paymentUrl = null;
          payment.expiresAt = null;
          payment.transactionId = null;
          payment.status = 'pending';

          await payment.save({ transaction });
        });
      } else {
        // The session is still active or Khalti has not confirmed
        // a terminal state. Reuse the existing payment URL.
        if (!paymentDetails.paymentUrl) {
          throw new HttpError(
            409,
            'A payment session is still active, but its payment URL is unavailable.'
          );
        }

        res.status(200).json({
          message: 'Resuming existing Khalti payment session.',
          data: {
            orderId,
            pidx: paymentDetails.pidx,
            paymentUrl: paymentDetails.paymentUrl,
            expiresAt: paymentDetails.expiresAt,
            expiresIn: paymentDetails.expiresAt
              ? Math.max(
                  0,
                  Math.floor(
                    (paymentDetails.expiresAt.getTime() - Date.now()) /
                      1000
                  )
                )
              : 0,
          },
        });
        return;
      }
    }

    // Create a fresh Khalti session.
    const khaltiResponse =
      await khaltiRequest<KhaltiInitiateResponse>(
        'epayment/initiate/',
        {
          return_url: `${config.clientUrl}/payment/return`,
          website_url: config.clientUrl,
          amount: paymentDetails.amount,
          purchase_order_id: String(orderId),
          purchase_order_name: `BookNest Order #${orderId}`,
          customer_info: {
            name: paymentDetails.customerName,
            email: paymentDetails.customerEmail,
          },
        }
      );

    const expiresAt = new Date(khaltiResponse.expires_at);

    if (
      !khaltiResponse.pidx ||
      !khaltiResponse.payment_url ||
      Number.isNaN(expiresAt.getTime())
    ) {
      throw new HttpError(
        502,
        'Khalti returned an invalid payment session.'
      );
    }

    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const payment = await Payment.findOne({
        where: { orderId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (
        !order ||
        order.status !== 'pending' ||
        !payment ||
        payment.status !== 'pending' ||
        payment.pidx
      ) {
        throw new HttpError(
          409,
          'Order or payment changed while initiating payment.'
        );
      }

      payment.pidx = khaltiResponse.pidx;
      payment.paymentUrl = khaltiResponse.payment_url;
      payment.expiresAt = expiresAt;

      await payment.save({ transaction });
    });

    res.status(200).json({
      message: 'Khalti payment initiated successfully.',
      data: {
        orderId,
        pidx: khaltiResponse.pidx,
        paymentUrl: khaltiResponse.payment_url,
        expiresAt: khaltiResponse.expires_at,
        expiresIn: khaltiResponse.expires_in,
      },
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.statusCode).json({
      message: result.message,
    });
  }
}


// POST /api/orders/:id/verify-payment
export async function verifyKhaltiPayment(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const orderId = parseId(req.params.id);
    const userId = getUserId(req);

    if (!orderId) {
      throw new HttpError(400, 'Invalid order ID.');
    }

    const paymentDetails = await sequelize.transaction(
      async (transaction) => {
        const order = await Order.findOne({
          where: {
            id: orderId,
            userId,
          },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!order) {
          throw new HttpError(404, 'Order not found.');
        }

        const payment = await Payment.findOne({
          where: { orderId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!payment) {
          throw new HttpError(
            404,
            'Payment record not found.'
          );
        }

        if (payment.status === 'completed') {
          return {
            alreadyCompleted: true,
            amount: toPaisa(payment.amount),
            pidx: payment.pidx,
            orderStatus: order.status,
          };
        }

        if (
          order.status !== 'pending' ||
          payment.status !== 'pending'
        ) {
          throw new HttpError(
            400,
            'This order is not eligible for payment verification.'
          );
        }

        if (!payment.pidx) {
          throw new HttpError(
            400,
            'No Khalti payment session exists for this order.'
          );
        }

        return {
          alreadyCompleted: false,
          amount: toPaisa(payment.amount),
          pidx: payment.pidx,
          orderStatus: order.status,
        };
      }
    );

    if (paymentDetails.alreadyCompleted) {
      res.status(200).json({
        message: 'Payment has already been verified.',
        data: {
          orderId,
          paymentStatus: 'completed',
          orderStatus: paymentDetails.orderStatus,
        },
      });
      return;
    }

    const lookupResponse =
      await khaltiRequest<KhaltiLookupResponse>(
        'epayment/lookup/',
        {
          pidx: paymentDetails.pidx,
        }
      );

    // Verify both the Khalti identifier and the actual amount.
    if (
      lookupResponse.pidx !== paymentDetails.pidx ||
      lookupResponse.total_amount !== paymentDetails.amount
    ) {
      throw new HttpError(
        400,
        'Khalti payment details do not match this order.'
      );
    }

    if (lookupResponse.status !== 'Completed') {
      const failedStatuses = [
        'User canceled',
        'Expired',
        'Refunded',
        'Partially refunded',
        'Failed',
        'Canceled',
      ];

      if (failedStatuses.includes(lookupResponse.status)) {
        await sequelize.transaction(async (transaction) => {
          const order = await Order.findOne({
            where: {
              id: orderId,
              userId,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          const payment = await Payment.findOne({
            where: { orderId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (
            order?.status === 'pending' &&
            payment?.status === 'pending' &&
            payment.pidx === paymentDetails.pidx
          ) {
            payment.status = 'failed';
            await payment.save({ transaction });
          }
        });
      }

      res.status(200).json({
        message: 'Payment has not been completed.',
        data: {
          orderId,
          khaltiStatus: lookupResponse.status,
          paymentStatus: failedStatuses.includes(
            lookupResponse.status
          )
            ? 'failed'
            : 'pending',
        },
      });
      return;
    }

    if (!lookupResponse.transaction_id) {
      throw new HttpError(
        502,
        'Khalti did not return a transaction ID.'
      );
    }

    // Only a confirmed, matching payment can update the order.
    await sequelize.transaction(async (transaction) => {
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const payment = await Payment.findOne({
        where: { orderId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (
        payment?.status === 'completed' &&
        order?.status === 'paid'
      ) {
        return;
      }

      if (
        !order ||
        order.status !== 'pending' ||
        !payment ||
        payment.status !== 'pending' ||
        payment.pidx !== paymentDetails.pidx
      ) {
        throw new HttpError(
          409,
          'Order or payment changed before verification completed.'
        );
      }

      payment.status = 'completed';
      payment.transactionId = lookupResponse.transaction_id;

      order.status = 'paid';

      await payment.save({ transaction });
      await order.save({ transaction });
    });

    res.status(200).json({
      message: 'Payment verified successfully.',
      data: {
        orderId,
        paymentStatus: 'completed',
        orderStatus: 'paid',
        transactionId: lookupResponse.transaction_id,
        currency: 'NPR',
      },
    });
  } catch (error) {
    const result = getErrorResponse(error);

    res.status(result.statusCode).json({
      message: result.message,
    });
  }
}
