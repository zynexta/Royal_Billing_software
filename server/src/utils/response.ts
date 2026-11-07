import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(res: Response, message: string, statusCode: number = 400, errors?: any) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

