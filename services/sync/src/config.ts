import { z } from 'zod';
import { createLogger } from './utils/logger';

const logger = createLogger('config');

const ConfigSchema = z.object({
    // Server
    PORT: z.string().default('3001').transform(Number),

    // Strapi
    STRAPI_URL: z.string().url({ message: 'STRAPI_URL must be a valid URL' }),
    STRAPI_API_TOKEN: z.string().min(1, { message: 'STRAPI_API_TOKEN is required' }),

    // Wiki.js
    WIKIJS_URL: z.string().url({ message: 'WIKIJS_URL must be a valid URL' }),
    WIKIJS_API_TOKEN: z.string().min(1, { message: 'WIKIJS_API_TOKEN is required' }),

    // RabbitMQ
    RABBITMQ_URL: z.string().min(1, { message: 'RABBITMQ_URL is required' }),

    // Redis
    REDIS_URL: z.string().min(1, { message: 'REDIS_URL is required' }),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'verbose', 'debug', 'silly']).default('info'),
});

type RawConfig = z.input<typeof ConfigSchema>;
type ParsedConfig = z.output<typeof ConfigSchema>;

function loadConfig(): ParsedConfig {
    const result = ConfigSchema.safeParse(process.env as RawConfig);

    if (!result.success) {
        const formatted = result.error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
        logger.error(`Configuration validation failed:\n${formatted}`);
        process.exit(1);
    }

    return result.data;
}

const config = loadConfig();

export const {
    PORT,
    STRAPI_URL: strapiUrl,
    STRAPI_API_TOKEN: strapiApiToken,
    WIKIJS_URL: wikijsUrl,
    WIKIJS_API_TOKEN: wikijsApiToken,
    RABBITMQ_URL: rabbitmqUrl,
    REDIS_URL: redisUrl,
    LOG_LEVEL: logLevel,
} = config;

export default config;
