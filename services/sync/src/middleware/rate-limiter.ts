import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limiter');

interface RateLimiterOptions {
    windowMs: number;
    maxRequests: number;
}

interface ClientRecord {
    count: number;
    windowStart: number;
}

/**
 * Simple in-memory sliding window rate limiter.
 * Suitable for single-instance deployment; for multi-instance use Redis.
 */
export function createRateLimiter(options: RateLimiterOptions) {
    const { windowMs, maxRequests } = options;
    const clients = new Map<string, ClientRecord>();

    // Periodically clean up expired client records to prevent memory leaks
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of clients.entries()) {
            if (now - record.windowStart > windowMs) {
                clients.delete(key);
            }
        }
    }, windowMs);

    cleanupInterval.unref();

    return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
        const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
        const now = Date.now();
        const existing = clients.get(ip);

        if (!existing || now - existing.windowStart > windowMs) {
            clients.set(ip, { count: 1, windowStart: now });
            next();
            return;
        }

        existing.count += 1;

        if (existing.count > maxRequests) {
            logger.warn('Rate limit exceeded', {
                ip,
                count: existing.count,
                maxRequests,
                windowMs,
                path: req.path,
            });
            res.status(429).json({
                error: {
                    message: 'Too many requests. Please slow down.',
                    code: 'RATE_LIMIT_EXCEEDED',
                },
            });
            return;
        }

        next();
    };
}
