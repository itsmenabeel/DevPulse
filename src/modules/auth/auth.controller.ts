import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import pool from '../../config/db';
import env from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { validateSignup, validateLogin } from '../../utils/validation';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'contributor' | 'maintainer';
  created_at: Date;
  updated_at: Date;
}

type SafeUser = Omit<UserRow, 'password'>;

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { valid, errors } = validateSignup(body);
    if (!valid) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
      return;
    }

    const name = (body['name'] as string).trim();
    const email = (body['email'] as string).toLowerCase().trim();
    const password = body['password'] as string;
    const role = (body['role'] as 'contributor' | 'maintainer') ?? 'contributor';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount && existing.rowCount > 0) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Email already registered');
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, hashed, role]
    );

    const user: SafeUser = result.rows[0];
    sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { valid, errors } = validateLogin(body);
    if (!valid) {
      sendError(res, StatusCodes.BAD_REQUEST, 'Validation failed', errors);
      return;
    }

    const email = (body['email'] as string).toLowerCase().trim();
    const password = body['password'] as string;

    const result = await pool.query<UserRow>(
      'SELECT id, name, email, password, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (!result.rowCount || result.rowCount === 0) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password');
      return;
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid email or password');
      return;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
    );

    const { password: _pw, ...safeUser } = user;
    void _pw;

    sendSuccess(res, StatusCodes.OK, 'Login successful', { token, user: safeUser });
  } catch (err) {
    next(err);
  }
}
