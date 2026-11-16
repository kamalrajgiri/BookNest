
import type { Request, Response } from 'express';

import Book from '../models/Book.js';
import Cart from '../models/Cart.js';
import CartItem from '../models/CartItem.js';

export async function getCart(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const cart = await Cart.findOne({
            where: { userId },
            include: [
                {
                    model: CartItem,
                    include: [Book],
                },
            ],
        });

        res.status(200).json({
            message: 'Cart fetched successfully.',
            data: cart,
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({
            message: 'Internal server error while fetching cart.',
        });
    }
}

export async function addCartItem(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        if (
            typeof req.body !== 'object' ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({ message: 'Invalid request body.' });
            return;
        }

        const unknownFields = Object.keys(req.body).filter(
            (key) => !['bookId', 'quantity'].includes(key)
        );

        if (unknownFields.length > 0) {
            res.status(400).json({
                message: 'Unknown fields provided.',
                fields: unknownFields,
            });
            return;
        }

        const { bookId, quantity = 1 } = req.body;

        if (
            typeof bookId !== 'number' ||
            !Number.isSafeInteger(bookId) ||
            bookId <= 0
        ) {
            res.status(400).json({
                message: 'Book ID must be a positive integer.',
            });
            return;
        }

        if (
            typeof quantity !== 'number' ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            res.status(400).json({
                message: 'Quantity must be a positive integer.',
            });
            return;
        }

        const book = await Book.findByPk(bookId);

        if (!book) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        const [cart] = await Cart.findOrCreate({
            where: { userId },
            defaults: { userId },
        });

        const existingItem = await CartItem.findOne({
            where: {
                cartId: cart.id,
                bookId,
            },
        });

        const newQuantity = existingItem
            ? existingItem.quantity + quantity
            : quantity;

        if (newQuantity > book.stock) {
            res.status(409).json({
                message: `Insufficient stock. Available stock: ${book.stock}.`,
            });
            return;
        }

        const isNewItem = !existingItem;

        let item;

        if (existingItem) {
            item = await existingItem.update({
                quantity: newQuantity,
            });
        } else {
            item = await CartItem.create({
                cartId: cart.id,
                bookId,
                quantity,
            });
        }

        res.status(isNewItem ? 201 : 200).json({
            message: 'Item added to cart successfully.',
            data: item,
        });
    } catch (error) {
        console.error('Add cart item error:', error);
        res.status(500).json({
            message: 'Internal server error while adding cart item.',
        });
    }
}

export async function updateCartItem(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const { itemId } = req.params;

        if (
            typeof itemId !== 'string' ||
            !/^[1-9]\d*$/.test(itemId) ||
            !Number.isSafeInteger(Number(itemId))
        ) {
            res.status(400).json({ message: 'Invalid cart item ID.' });
            return;
        }

        if (
            typeof req.body !== 'object' ||
            req.body === null ||
            Array.isArray(req.body)
        ) {
            res.status(400).json({ message: 'Invalid request body.' });
            return;
        }

        const keys = Object.keys(req.body);

        if (keys.length !== 1 || keys[0] !== 'quantity') {
            res.status(400).json({
                message: 'Only quantity can be updated.',
            });
            return;
        }

        const { quantity } = req.body;

        if (
            typeof quantity !== 'number' ||
            !Number.isSafeInteger(quantity) ||
            quantity <= 0
        ) {
            res.status(400).json({
                message: 'Quantity must be a positive integer.',
            });
            return;
        }

        const cart = await Cart.findOne({ where: { userId } });

        if (!cart) {
            res.status(404).json({ message: 'Cart not found.' });
            return;
        }

        const item = await CartItem.findOne({
            where: {
                id: Number(itemId),
                cartId: cart.id,
            },
            include: [Book],
        });

        if (!item) {
            res.status(404).json({ message: 'Cart item not found.' });
            return;
        }

        const book = await Book.findByPk(item.bookId);

        if (!book) {
            res.status(404).json({
                message: 'The book is no longer available.',
            });
            return;
        }

        if (quantity > book.stock) {
            res.status(409).json({
                message: `Insufficient stock. Available stock: ${book.stock}.`,
            });
            return;
        }

        await item.update({ quantity });

        res.status(200).json({
            message: 'Cart item updated successfully.',
            data: item,
        });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({
            message: 'Internal server error while updating cart item.',
        });
    }
}

export async function removeCartItem(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const { itemId } = req.params;

        if (
            typeof itemId !== 'string' ||
            !/^[1-9]\d*$/.test(itemId) ||
            !Number.isSafeInteger(Number(itemId))
        ) {
            res.status(400).json({ message: 'Invalid cart item ID.' });
            return;
        }

        const cart = await Cart.findOne({ where: { userId } });

        if (!cart) {
            res.status(404).json({ message: 'Cart not found.' });
            return;
        }

        const item = await CartItem.findOne({
            where: {
                id: Number(itemId),
                cartId: cart.id,
            },
        });

        if (!item) {
            res.status(404).json({ message: 'Cart item not found.' });
            return;
        }

        await item.destroy();

        res.status(200).json({
            message: 'Cart item removed successfully.',
        });
    } catch (error) {
        console.error('Remove cart item error:', error);
        res.status(500).json({
            message: 'Internal server error while removing cart item.',
        });
    }
}

export async function clearCart(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const cart = await Cart.findOne({ where: { userId } });

        if (!cart) {
            res.status(404).json({ message: 'Cart not found.' });
            return;
        }

        await CartItem.destroy({
            where: { cartId: cart.id },
        });

        res.status(200).json({
            message: 'Cart cleared successfully.',
        });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({
            message: 'Internal server error while clearing cart.',
        });
    }
}
