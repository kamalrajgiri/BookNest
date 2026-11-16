
import type { Request, Response } from 'express';

import Book from '../models/Book.js';
import Wishlist from '../models/Wishlist.js';
import WishlistItem from '../models/WishlistItem.js';

export async function getWishlist(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const wishlist = await Wishlist.findOne({
            where: { userId },
            include: [
                {
                    model: WishlistItem,
                    include: [Book],
                },
            ],
        });

        res.status(200).json({
            message: 'Wishlist fetched successfully.',
            data: wishlist,
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({
            message: 'Internal server error while fetching wishlist.',
        });
    }
}

export async function addWishlistItem(
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

        const keys = Object.keys(req.body);

        if (keys.length !== 1 || keys[0] !== 'bookId') {
            res.status(400).json({
                message: 'Only bookId is allowed.',
            });
            return;
        }

        const { bookId } = req.body;

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

        const book = await Book.findByPk(bookId);

        if (!book) {
            res.status(404).json({ message: 'Book not found.' });
            return;
        }

        const [wishlist] = await Wishlist.findOrCreate({
            where: { userId },
            defaults: { userId },
        });

        const [item, created] = await WishlistItem.findOrCreate({
            where: {
                wishlistId: wishlist.id,
                bookId,
            },
            defaults: {
                wishlistId: wishlist.id,
                bookId,
            },
        });

        res.status(created ? 201 : 200).json({
            message: created
                ? 'Book added to wishlist successfully.'
                : 'Book is already in your wishlist.',
            data: item,
        });
    } catch (error) {
        console.error('Add wishlist item error:', error);
        res.status(500).json({
            message: 'Internal server error while adding wishlist item.',
        });
    }
}

export async function removeWishlistItem(
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
            res.status(400).json({
                message: 'Invalid wishlist item ID.',
            });
            return;
        }

        const wishlist = await Wishlist.findOne({
            where: { userId },
        });

        if (!wishlist) {
            res.status(404).json({ message: 'Wishlist not found.' });
            return;
        }

        const item = await WishlistItem.findOne({
            where: {
                id: Number(itemId),
                wishlistId: wishlist.id,
            },
        });

        if (!item) {
            res.status(404).json({
                message: 'Wishlist item not found.',
            });
            return;
        }

        await item.destroy();

        res.status(200).json({
            message: 'Wishlist item removed successfully.',
        });
    } catch (error) {
        console.error('Remove wishlist item error:', error);
        res.status(500).json({
            message: 'Internal server error while removing wishlist item.',
        });
    }
}

export async function clearWishlist(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ message: 'Authentication required.' });
            return;
        }

        const wishlist = await Wishlist.findOne({
            where: { userId },
        });

        if (!wishlist) {
            res.status(404).json({ message: 'Wishlist not found.' });
            return;
        }

        await WishlistItem.destroy({
            where: { wishlistId: wishlist.id },
        });

        res.status(200).json({
            message: 'Wishlist cleared successfully.',
        });
    } catch (error) {
        console.error('Clear wishlist error:', error);
        res.status(500).json({
            message: 'Internal server error while clearing wishlist.',
        });
    }
}
