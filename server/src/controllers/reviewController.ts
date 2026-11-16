import type { Request, Response } from 'express';
import { UniqueConstraintError, type Transaction } from 'sequelize';

import { sequelize } from '../config/database.js';
import Book from '../models/Book.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

function parseId(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw new HttpError(400, 'Invalid ID.');
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'Invalid ID.');
  }

  return id;
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

function validateRating(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 5
  ) {
    throw new HttpError(400, 'Rating must be an integer between 1 and 5.');
  }

  return value;
}

function validateComment(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new HttpError(400, 'Comment must be a string or null.');
  }

  const comment = value.trim();

  if (comment.length > 2000) {
    throw new HttpError(400, 'Comment cannot exceed 2000 characters.');
  }

  return comment || null;
}

function getErrorResponse(error: unknown, res: Response): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof UniqueConstraintError) {
    res.status(409).json({
      message: 'You have already reviewed this book.',
    });
    return;
  }

  console.error('Review API error:', error);

  res.status(500).json({
    message: 'An unexpected error occurred.',
  });
}

async function updateBookAverageRating(
  book: Book,
  bookId: number,
  transaction: Transaction
): Promise<void> {
  const average = await Review.aggregate('rating', 'avg', {
    where: { bookId },
    transaction,
  });

  const rating =
    average === null
      ? 0
      : Math.round(Number(average) * 10) / 10;

  await book.update(
    { rating: rating.toFixed(1) },
    { transaction }
  );
}

// GET /api/reviews/books/:bookId
// Public: get reviews for a book.
export async function getBookReviews(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const bookId = parseId(req.params.bookId);

    const book = await Book.findByPk(bookId);

    if (!book) {
      throw new HttpError(404, 'Book not found.');
    }

    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 10
      : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new HttpError(400, 'Invalid pagination values.');
    }

    const { count, rows } = await Review.findAndCountAll({
      where: { bookId },
      include: [
        {
          model: User,
          attributes: ['id', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.status(200).json({
      message: 'Reviews fetched successfully.',
      data: rows,
      pagination: {
        page,
        limit,
        totalReviews: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}

// POST /api/reviews
// Authenticated: create a review.
export async function createReview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      throw new HttpError(400, 'Request body must be an object.');
    }

    const allowedFields = ['bookId', 'rating', 'comment'];

    if (Object.keys(req.body).some(
      (key) => !allowedFields.includes(key)
    )) {
      throw new HttpError(400, 'Request contains unsupported fields.');
    }

    const bookId = parseId(
      typeof req.body.bookId === 'number'
        ? String(req.body.bookId)
        : req.body.bookId
    );

    const rating = validateRating(req.body.rating);

    const comment =
      req.body.comment === undefined
        ? null
        : validateComment(req.body.comment);

    const review = await sequelize.transaction(async (transaction) => {
      const book = await Book.findByPk(bookId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!book) {
        throw new HttpError(404, 'Book not found.');
      }

      const existingReview = await Review.findOne({
        where: { userId, bookId },
        transaction,
      });

      if (existingReview) {
        throw new HttpError(
          409,
          'You have already reviewed this book.'
        );
      }

      const newReview = await Review.create(
        {
          userId,
          bookId,
          rating,
          comment,
        },
        { transaction }
      );

      await updateBookAverageRating(
        book,
        bookId,
        transaction
      );

      return newReview;
    });

    res.status(201).json({
      message: 'Review created successfully.',
      data: review,
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}

// PATCH /api/reviews/:id
// Authenticated: update your own review.
export async function updateReview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reviewId = parseId(req.params.id);

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      throw new HttpError(400, 'Request body must be an object.');
    }

    const allowedFields = ['rating', 'comment'];
    const keys = Object.keys(req.body);

    if (
      keys.length === 0 ||
      keys.some((key) => !allowedFields.includes(key))
    ) {
      throw new HttpError(
        400,
        'Provide rating or comment only.'
      );
    }

    const result = await sequelize.transaction(async (transaction) => {
      const review = await Review.findByPk(reviewId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!review) {
        throw new HttpError(404, 'Review not found.');
      }

      if (review.userId !== userId) {
        throw new HttpError(
          403,
          'You can only update your own review.'
        );
      }

      const book = await Book.findByPk(review.bookId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!book) {
        throw new HttpError(404, 'Book not found.');
      }

      const updates: {
        rating?: number;
        comment?: string | null;
      } = {};

      if (Object.hasOwn(req.body, 'rating')) {
        updates.rating = validateRating(req.body.rating);
      }

      if (Object.hasOwn(req.body, 'comment')) {
        updates.comment = validateComment(req.body.comment);
      }

      await review.update(updates, { transaction });

      await updateBookAverageRating(
        book,
        review.bookId,
        transaction
      );

      return review;
    });

    res.status(200).json({
      message: 'Review updated successfully.',
      data: result,
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}

// DELETE /api/reviews/:id
// Authenticated: delete your own review.
export async function deleteReview(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);
    const reviewId = parseId(req.params.id);

    await sequelize.transaction(async (transaction) => {
      const review = await Review.findByPk(reviewId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!review) {
        throw new HttpError(404, 'Review not found.');
      }

      if (review.userId !== userId) {
        throw new HttpError(
          403,
          'You can only delete your own review.'
        );
      }

      const book = await Book.findByPk(review.bookId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!book) {
        throw new HttpError(404, 'Book not found.');
      }

      const bookId = review.bookId;

      await review.destroy();

      await updateBookAverageRating(
        book,
        bookId,
        transaction
      );
    });

    res.status(200).json({
      message: 'Review deleted successfully.',
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}