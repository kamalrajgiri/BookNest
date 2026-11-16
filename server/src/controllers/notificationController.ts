import type { Request, Response } from 'express';

import { Notification } from '../models/index.js';

class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
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

function parseId(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw new HttpError(400, 'Invalid notification ID.');
  }

  const id = Number(value);

  if (!Number.isSafeInteger(id)) {
    throw new HttpError(400, 'Invalid notification ID.');
  }

  return id;
}

function getErrorResponse(error: unknown, res: Response): void {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      message: error.message,
    });
    return;
  }

  console.error('Notification API error:', error);

  res.status(500).json({
    message: 'An unexpected error occurred.',
  });
}

// GET /api/notifications
// Get the authenticated user's notifications.
export async function getNotifications(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);

    const page =
      req.query.page === undefined ? 1 : Number(req.query.page);

    const limit =
      req.query.limit === undefined ? 10 : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new HttpError(400, 'Invalid pagination values.');
    }

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    const unreadCount = await Notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.status(200).json({
      message: 'Notifications fetched successfully.',
      data: rows,
      unreadCount,
      pagination: {
        page,
        limit,
        totalNotifications: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}

// PATCH /api/notifications/:id/read
// Mark one of the authenticated user's notifications as read.
export async function markNotificationAsRead(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);
    const notificationId = parseId(req.params.id);

    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new HttpError(404, 'Notification not found.');
    }

    if (!notification.isRead) {
      await notification.update({
        isRead: true,
      });
    }

    res.status(200).json({
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}

// PATCH /api/notifications/read-all
// Mark all of the authenticated user's notifications as read.
export async function markAllNotificationsAsRead(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = getUserId(req);

    const [updatedCount] = await Notification.update(
      {
        isRead: true,
      },
      {
        where: {
          userId,
          isRead: false,
        },
      }
    );

    res.status(200).json({
      message: 'All notifications marked as read.',
      updatedCount,
    });
  } catch (error) {
    getErrorResponse(error, res);
  }
}