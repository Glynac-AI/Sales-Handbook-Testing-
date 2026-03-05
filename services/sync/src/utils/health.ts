import { strapiUrl, wikijsUrl, redisUrl, rabbitmqUrl } from '../config';
import { createLogger } from './logger';

const logger = createLogger('health');

export interface ServiceStatus {
    status: 'ok' | 'error';
    message?: string;
}

export interface HealthReport {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    timestamp: string;
    checks: {
        strapi: ServiceStatus;
        wikijs: ServiceStatus;
        redis: ServiceStatus;
        rabbitmq: ServiceStatus;
    };
}

async function checkStrapi(): Promise<ServiceStatus> {
    try {
        const response = await fetch(`${strapiUrl}/_health`, {
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            return { status: 'ok' };
        }
        return { status: 'error', message: `HTTP ${response.status}` };
    } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
}

async function checkWikijs(): Promise<ServiceStatus> {
    try {
        const response = await fetch(`${wikijsUrl}/healthz`, {
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            return { status: 'ok' };
        }
        return { status: 'error', message: `HTTP ${response.status}` };
    } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
}

async function checkRedis(): Promise<ServiceStatus> {
    try {
        const { createClient } = await import('redis');
        const client = createClient({ url: redisUrl, socket: { connectTimeout: 5000 } });
        await client.connect();
        await client.ping();
        await client.quit();
        return { status: 'ok' };
    } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
}

async function checkRabbitMQ(): Promise<ServiceStatus> {
    try {
        const amqp = await import('amqplib');
        const conn = await amqp.connect(rabbitmqUrl);
        await conn.close();
        return { status: 'ok' };
    } catch (error) {
        return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
}

export async function getHealthReport(): Promise<HealthReport> {
    const [strapi, wikijs, redis, rabbitmq] = await Promise.allSettled([
        checkStrapi(),
        checkWikijs(),
        checkRedis(),
        checkRabbitMQ(),
    ]);

    const checks = {
        strapi: strapi.status === 'fulfilled' ? strapi.value : { status: 'error' as const, message: String(strapi.reason) },
        wikijs: wikijs.status === 'fulfilled' ? wikijs.value : { status: 'error' as const, message: String(wikijs.reason) },
        redis: redis.status === 'fulfilled' ? redis.value : { status: 'error' as const, message: String(redis.reason) },
        rabbitmq: rabbitmq.status === 'fulfilled' ? rabbitmq.value : { status: 'error' as const, message: String(rabbitmq.reason) },
    };

    const errorCount = Object.values(checks).filter((c) => c.status === 'error').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (errorCount === 0) {
        status = 'healthy';
    } else if (errorCount < 3) {
        status = 'degraded';
    } else {
        status = 'unhealthy';
    }

    logger.debug('Health check completed', { status, errorCount });

    return {
        status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        checks,
    };
}
