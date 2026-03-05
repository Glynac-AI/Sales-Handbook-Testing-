import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

export function createLogger(service: string): winston.Logger {
    return winston.createLogger({
        level: process.env['LOG_LEVEL'] ?? 'info',
        format: combine(
            errors({ stack: true }),
            timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
            json(),
        ),
        defaultMeta: { service: `sync-service:${service}` },
        transports: [new winston.transports.Console()],
    });
}
