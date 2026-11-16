import type { Request, Response } from 'express';
import { Op } from 'sequelize';

import Book from '../models/Book.js';

export async function getBooks(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const {
            search,
            minPrice,
            maxPrice,
            minRating,
            page = '1',
            limit = '10',
        } = req.query;

        if (
            (search !== undefined && typeof search !== 'string') ||
            (minPrice !== undefined && typeof minPrice !== 'string') ||
            (maxPrice !== undefined && typeof maxPrice !== 'string') ||
            (minRating !== undefined && typeof minRating !== 'string') ||
            typeof page !== 'string' || typeof limit !== 'string'
        ) {
            res.status(400).json({
                message: 'Invalid query parameters.',
            });
            return;
        }

        const parsedMinPrice = minPrice !== undefined ? Number(minPrice) : undefined;

        const parsedMaxPrice = maxPrice !== undefined ? Number(maxPrice) : undefined;

        const parsedMinRating = minRating !== undefined ? Number(minRating) : undefined;

        const parsedPage = Number(page);
        const parsedLimit = Number(limit);

        if (
            (parsedMinPrice !== undefined &&
                (!Number.isFinite(parsedMinPrice) || parsedMinPrice <= 0)) ||
            (parsedMaxPrice !== undefined &&
                (!Number.isFinite(parsedMaxPrice) || parsedMaxPrice <= 0)) ||
            (parsedMinRating !== undefined &&
                (!Number.isFinite(parsedMinRating) ||
                    parsedMinRating < 0 ||
                    parsedMinRating > 5)) ||
            !Number.isInteger(parsedPage) ||
            parsedPage < 1 ||
            !Number.isInteger(parsedLimit) ||
            parsedLimit < 1 ||
            parsedLimit > 100
        ) {
            res.status(400).json({
                message: 'Invalid filter or pagination values.',
            });
            return;
        }

        const where: Record<string | symbol, unknown> = {};

        if (search?.trim()) {
            where[Op.or] = [
                { title: { [Op.like]: `%${search.trim()}%` } },
                { author: { [Op.like]: `%${search.trim()}%` } },
            ];
        }

        if (
            parsedMinPrice !== undefined &&
            parsedMaxPrice !== undefined &&
            parsedMinPrice > parsedMaxPrice
        ) {
            res.status(400).json({
                message: 'Minimum price cannot exceed maximum price.',
            });
            return;
        }

        const priceFilter: Record<symbol, number> = {};

        if (parsedMinPrice !== undefined) {
            priceFilter[Op.gte] = parsedMinPrice;
        }

        if (parsedMaxPrice !== undefined) {
            priceFilter[Op.lte] = parsedMaxPrice;
        }

        if (
            parsedMinPrice !== undefined ||
            parsedMaxPrice !== undefined
        ) {
            where.price = priceFilter;
        }

        if (parsedMinRating !== undefined) {
            where.rating = {
                [Op.gte]: parsedMinRating,
            };
        }

        const offset = (parsedPage - 1) * parsedLimit;

        const { rows: books, count: totalBooks } =
            await Book.findAndCountAll({
                where,
                limit: parsedLimit,
                offset,
                order: [['createdAt', 'DESC']],
            });

        res.status(200).json({
            message: 'Books fetched successfully.',
            data: books,
            pagination: {
                currentPage: parsedPage,
                pageSize: parsedLimit,
                totalBooks,
                totalPages: Math.ceil(totalBooks / parsedLimit),
                hasNextPage: offset + books.length < totalBooks,
                hasPreviousPage: parsedPage > 1,
            },
        });

    } catch (error) {
        console.error('Get books error:', error);

        res.status(500).json({
            message: 'Internal server error while fetching books.',
        });
    }
}


export async function getBookById(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { id } = req.params;

        if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
            res.status(400).json({
                message: 'Invalid book ID. ID must be a positive integer.',
            });
            return;
        }

        const bookId = Number(id);

        if (!Number.isSafeInteger(bookId)) {
            res.status(400).json({
                message: 'Invalid book ID.',
            });
            return;
        }

        const book = await Book.findByPk(bookId);

        if (!book) {
            res.status(404).json({
                message: 'Book not found.',
            });
            return;
        }

        res.status(200).json({
            message: 'Book fetched successfully.',
            data: book,
        });
    } catch (error) {
        console.error('Get book by ID error:', error);

        res.status(500).json({
            message: 'Internal server error while fetching book.',
        });
    }
}

export async function createBook(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const allowedFields = [
            'title',
            'author',
            'description',
            'price',
            'stock',
        ];

        const unknownFields = Object.keys(req.body).filter(
            (field) => !allowedFields.includes(field)
        );

        if (unknownFields.length > 0) {
            res.status(400).json({
                message: 'Unknown fields provided.',
                fields: unknownFields,
            });
            return;
        }

        const { title, author, description, price, stock } = req.body;

        if (typeof title !== 'string' || !title.trim()) {
            res.status(400).json({
                message: 'Title is required and must be a non-empty string.',
            });
            return;
        }

        if (typeof author !== 'string' || !author.trim()) {
            res.status(400).json({
                message: 'Author is required and must be a non-empty string.',
            });
            return;
        }

        if (description !== undefined && typeof description !== 'string') {
            res.status(400).json({
                message: 'Description must be a string if provided.',
            });
            return;
        }

        if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
            res.status(400).json({
                message: 'Price is required and must be a finite number greater than 0.',
            });
            return;
        }

        let parsedStock = 0;
        if (stock !== undefined) {
            if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
                res.status(400).json({
                    message: 'Stock must be a non-negative integer if provided.',
                });
                return;
            }
            parsedStock = stock;
        }

        const book = await Book.create({
            title: title.trim(),
            author: author.trim(),
            description: description !== undefined ? description.trim() : null,
            price: price.toFixed(2),
            stock: parsedStock,
        });

        res.status(201).json({
            message: 'Book created successfully.',
            data: book,
        });
    } catch (error) {
        console.error('Create book error:', error);

        res.status(500).json({
            message: 'Internal server error while creating book.',
        });
    }
}

const ALLOWED_BOOK_UPDATE_FIELDS = new Set([
  'title',
  'author',
  'description',
  'price',
  'stock',
]);

export async function updateBook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
      res.status(400).json({
        message: 'Invalid book ID. ID must be a positive integer.',
      });
      return;
    }

    const bookId = Number(id);

if (!Number.isSafeInteger(bookId)) {
    res.status(400).json({
        message: 'Invalid book ID.',
    });
    return;
}


    if (
      typeof req.body !== 'object' ||
      req.body === null ||
      Array.isArray(req.body)
    ) {
      res.status(400).json({
        message: 'Request body must be a valid JSON object.',
      });
      return;
    }

    const keys = Object.keys(req.body);

    if (keys.length === 0) {
      res.status(400).json({
        message: 'At least one field must be provided for update.',
      });
      return;
    }

    const unknownFields = keys.filter(
      (key) => !ALLOWED_BOOK_UPDATE_FIELDS.has(key)
    );

    if (unknownFields.length > 0) {
      res.status(400).json({
        message: `Unknown or restricted fields are not allowed: ${unknownFields.join(', ')}.`,
      });
      return;
    }

    const updates: Partial<{
      title: string;
      author: string;
      description: string | null;
      price: string;
      stock: number;
    }> = {};

    if ('title' in req.body) {
      const { title } = req.body;
      if (typeof title !== 'string' || !title.trim()) {
        res.status(400).json({
          message: 'Title must be a non-empty string.',
        });
        return;
      }
      updates.title = title.trim();
    }

    if ('author' in req.body) {
      const { author } = req.body;
      if (typeof author !== 'string' || !author.trim()) {
        res.status(400).json({
          message: 'Author must be a non-empty string.',
        });
        return;
      }
      updates.author = author.trim();
    }

    if ('description' in req.body) {
      const { description } = req.body;
      if (description !== null && typeof description !== 'string') {
        res.status(400).json({
          message: 'Description must be a string or null.',
        });
        return;
      }
      updates.description =
        typeof description === 'string' ? description.trim() : null;
    }

    if ('price' in req.body) {
      const { price } = req.body;
      if (
        typeof price !== 'number' ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        res.status(400).json({
          message: 'Price must be a finite number greater than 0.',
        });
        return;
      }
      updates.price = price.toFixed(2);
    }

    if ('stock' in req.body) {
      const { stock } = req.body;
      if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
        res.status(400).json({
          message: 'Stock must be a non-negative integer.',
        });
        return;
      }
      updates.stock = stock;
    }

    const book = await Book.findByPk(bookId);

    if (!book) {
      res.status(404).json({
        message: 'Book not found.',
      });
      return;
    }

    await book.update(updates);

    res.status(200).json({
      message: 'Book updated successfully.',
      data: book,
    });
  } catch (error) {
    console.error('Update book error:', error);

    res.status(500).json({
      message: 'Internal server error while updating book.',
    });
  }
}



export async function deleteBook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { id } = req.params;

    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
      res.status(400).json({
        message: 'Invalid book ID. ID must be a positive integer.',
      });
      return;
    }

    const bookId = Number(id);

if (!Number.isSafeInteger(bookId)) {
    res.status(400).json({
        message: 'Invalid book ID.',
    });
    return;
}

const book = await Book.findByPk(bookId);

    if (!book) {
      res.status(404).json({
        message: 'Book not found.',
      });
      return;
    }

    await book.destroy();

    res.status(200).json({
      message: 'Book deleted successfully.',
    });
  } catch (error) {
    console.error('Delete book error:', error);

    res.status(500).json({
      message: 'Internal server error while deleting book.',
    });
  }
}