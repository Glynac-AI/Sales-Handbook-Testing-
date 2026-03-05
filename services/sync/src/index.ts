import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { PORT } from './config';
import { createLogger } from './utils/logger';
import { getHealthReport } from './utils/health';
import { connectCache, disconnectCache } from './services/cache.service';
import { connectPublisher, disconnectPublisher } from './services/event.publisher';
import { processWebhook } from './services/sync.service';
import { errorHandler, correlationIdMiddleware } from './middleware/error-handler';
import { createRateLimiter } from './middleware/rate-limiter';
import type { StrapiWebhookPayload } from './types/strapi.types';

const logger = createLogger('index');
const app = express();

// =========================================================
// Middleware
// =========================================================
app.use(express.json({ limit: '1mb' }));
app.use(correlationIdMiddleware);
app.use('/webhooks', createRateLimiter({ windowMs: 60_000, maxRequests: 100 }));

// =========================================================
// Routes
// =========================================================

/**
 * Health check endpoint.
 * Returns 200 if healthy/degraded, 503 if unhealthy.
 */
app.get('/health', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const report = await getHealthReport();
        const statusCode = report.status === 'unhealthy' ? 503 : 200;
        res.status(statusCode).json(report);
    } catch (error) {
        next(error);
    }
});

/**
 * Strapi webhook receiver.
 * Accepts POST requests from Strapi 5 webhook events and delegates to sync.service.
 */
app.post('/webhooks/strapi', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const correlationId = req.headers['x-correlation-id'] as string;

    try {
        const payload = req.body as StrapiWebhookPayload;

        if (!payload?.event || !payload?.model || !payload?.entry?.documentId) {
            res.status(400).json({
                error: {
                    message: 'Invalid webhook payload: missing event, model, or entry.documentId',
                    code: 'INVALID_PAYLOAD',
                },
            });
            return;
        }

        logger.info('Received Strapi webhook', {
            event: payload.event,
            model: payload.model,
            documentId: payload.entry.documentId,
            correlationId,
        });

        // Acknowledge receipt immediately; processing is async best-effort
        res.status(200).json({ received: true, correlationId });

        // Process asynchronously — errors here go to DLQ, not to Strapi
        processWebhook(payload).catch((error: unknown) => {
            logger.error('Async webhook processing failed', {
                error: error instanceof Error ? error.message : String(error),
                correlationId,
                model: payload.model,
                documentId: payload.entry.documentId,
            });
        });
    } catch (error) {
        next(error);
    }
});

// =========================================================
// Error handling
// =========================================================
app.use(errorHandler);

// =========================================================
// Bootstrap
// =========================================================
async function bootstrap(): Promise<void> {
    logger.info('Connecting to Redis...');
    await connectCache();

    logger.info('Connecting to RabbitMQ...');
    await connectPublisher();

    const server = app.listen(PORT, () => {
        logger.info(`Sync service listening on port ${PORT}`);
    });

    // -------------------------------------------------------
    // Graceful shutdown
    // -------------------------------------------------------
    async function shutdown(signal: string): Promise<void> {
        logger.info(`Received ${signal}, starting graceful shutdown`);

        server.close(async () => {
            logger.info('HTTP server closed');

            try {
                await disconnectCache();
                await disconnectPublisher();
                logger.info('All connections closed. Exiting.');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown', {
                    error: error instanceof Error ? error.message : String(error),
                });
                process.exit(1);
            }
        });

        // Force exit if graceful shutdown takes too long
        setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, 30_000).unref();
    }

    process.on('SIGTERM', () => {
        shutdown('SIGTERM').catch((err: unknown) =>
            logger.error('SIGTERM handler error', { error: err instanceof Error ? err.message : String(err) }),
        );
    });
    process.on('SIGINT', () => {
        shutdown('SIGINT').catch((err: unknown) =>
            logger.error('SIGINT handler error', { error: err instanceof Error ? err.message : String(err) }),
        );
    });
}

bootstrap().catch((error: unknown) => {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('Failed to start sync service', { error: msg });
    process.exit(1);
});
