import { Response } from 'express';

export function sendSuccess(
  res: Response,
  status: number,
  message: string,
  data: unknown
): void {
  res.status(status).json({ success: true, message, data });
}

export function sendSuccessNoData(res: Response, status: number, message: string): void {
  res.status(status).json({ success: true, message });
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  errors?: unknown
): void {
  res.status(status).json({ success: false, message, ...(errors !== undefined && { errors }) });
}
