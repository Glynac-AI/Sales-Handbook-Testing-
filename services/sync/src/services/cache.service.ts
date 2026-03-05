import { createClient, RedisClientType } from 'redis';
import { redisUrl } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('cache.service');

let client: RedisClientType;

export async function connectCache(): Promise<void> {
    client = createClient({ url: redisUrl }) as RedisClientType;

    client.on('error', (error: unknown) => {
        logger.error('Redis client error', { error: error instanceof Error ? error.message : String(error) });
    });

    client.on('reconnecting', () => {
        logger.warn('Redis reconnecting');
    });

    await client.connect();
    logger.info('Redis connected');
}

export async function disconnectCache(): Promise<void> {
    if (client) {
        await client.quit();
        logger.info('Redis disconnected');
    }
}

/**
 * Returns true if the given idempotency key has already been processed.
 */
export async function isProcessed(key: string): Promise<boolean> {
    const value = await client.get(key);
    return value !== null;
}

/**
 * Marks the given idempotency key as processed with a TTL in seconds.
 */
export async function markProcessed(key: string, ttlSeconds: number): Promise<void> {
    await client.set(key, '1', { EX: ttlSeconds });
}
