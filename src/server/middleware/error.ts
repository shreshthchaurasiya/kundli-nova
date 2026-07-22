import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError';
import { z } from 'zod';
import { ProviderError } from '../errors/ProviderError';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = undefined;
  let code = undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ProviderError) {
    statusCode = err.statusCode || 503;
    message = err.message;
    code = err.errorCode;
  } else if (err instanceof z.ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.issues;
  } else {
    // Log unexpected errors
    console.error(`[Error] Unhandled Exception:`, err);
  }

  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    errors,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};
