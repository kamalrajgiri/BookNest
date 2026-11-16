import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '../models/User.js';

export function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
}