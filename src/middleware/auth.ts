import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import env from '../config/env';
import { sendError } from '../utils/response';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['authorization'];
  if (!token) {
    sendError(res, StatusCodes.UNAUTHORIZED, 'Access token required');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Token expired');
    } else {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid token');
    }
  }
}

export function requireRole(...roles: Array<'contributor' | 'maintainer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, StatusCodes.FORBIDDEN, 'Insufficient permissions');
      return;
    }
    next();
  };
}
