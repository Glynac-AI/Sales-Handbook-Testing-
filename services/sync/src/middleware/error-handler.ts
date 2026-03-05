import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

export interface AppError extends Error {
    status?: number;
    code?: string;
}

/**
 * Express error-handling middleware.
 * Logs structured error details and returns a JSON error response.
 * Never leaks internal stack traces in the response body.
 */
export function errorHandler(
    error: AppError,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
): void {
    const status = error.status ?? 500;
    const correlationId = req.headers['x-correlation-id'] as string | undefined;

    logger.error('Unhandled request error', {
        status,
        method: req.method,
        path: req.path,
        correlationId,
        error: error.message,
        code: error.code,
        stack: error.stack,
    });

    res.status(status).json({
        error: {
            message: status >= 500 ? 'Internal server error' : error.message,
            code: error.code ?? 'UNKNOWN_ERROR',
            correlationId: correlationId ?? null,
        },
    });
}

/**
 * Middleware to attach a correlation ID from request headers (or a default).
 */
export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
    if (!req.headers['x-correlation-id']) {
        req.headers['x-correlation-id'] = `local-${Date.now()}`;
    }
    next();
}
