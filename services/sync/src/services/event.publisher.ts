import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import { rabbitmqUrl } from '../config';
import { createLogger } from '../utils/logger';
import type { EventEnvelope, EventType } from '../types/events.types';

const logger = createLogger('event.publisher');

const EXCHANGE_NAME = 'playbook_events';
const EXCHANGE_TYPE = 'topic';
const DLQ_NAME = 'playbook_dlq';

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>;

let connection: AmqpConnection | null = null;
let channel: AmqpChannel | null = null;

export async function connectPublisher(): Promise<void> {
    const conn = await amqplib.connect(rabbitmqUrl);
    connection = conn;
    const ch = await conn.createChannel();
    channel = ch;

    await ch.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    await ch.assertQueue(DLQ_NAME, { durable: true });

    conn.on('error', (error: Error) => {
        logger.error('RabbitMQ connection error', { error: error.message });
        connection = null;
        channel = null;
    });

    conn.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        connection = null;
        channel = null;
    });

    logger.info('RabbitMQ connected', { exchange: EXCHANGE_NAME });
}

export async function disconnectPublisher(): Promise<void> {
    try {
        if (channel) {
            await channel.close();
        }
        if (connection) {
            await connection.close();
        }
        logger.info('RabbitMQ disconnected');
    } catch (error) {
        logger.error('Error closing RabbitMQ connection', {
            error: error instanceof Error ? error.message : String(error),
        });
    } finally {
        channel = null;
        connection = null;
    }
}

export function publishEvent(
    eventType: EventType,
    routingKey: string,
    data: Record<string, unknown>,
): void {
    if (!channel) {
        logger.warn('RabbitMQ channel not available, skipping publish', { eventType, routingKey });
        return;
    }

    const envelope: EventEnvelope = {
        event_id: uuidv4(),
        event_type: eventType,
        timestamp: new Date().toISOString(),
        source: 'sync-service',
        data,
    };

    const content = Buffer.from(JSON.stringify(envelope));

    channel.publish(EXCHANGE_NAME, routingKey, content, {
        persistent: true,
        contentType: 'application/json',
    });

    logger.debug('Event published', { eventType, routingKey, event_id: envelope.event_id });
}

export function sendToDLQ(payload: Record<string, unknown>, reason: string): void {
    if (!channel) {
        logger.warn('RabbitMQ channel not available, cannot send to DLQ', { reason });
        return;
    }

    const message = {
        ...payload,
        dlq_reason: reason,
        dlq_timestamp: new Date().toISOString(),
    };

    channel.sendToQueue(DLQ_NAME, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
    });

    logger.warn('Message sent to DLQ', { reason });
}
