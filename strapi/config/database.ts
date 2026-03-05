export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
    connection: {
        client: env('DATABASE_CLIENT', 'postgres'),
        connection: {
            host: env('DATABASE_HOST', 'localhost'),
            port: parseInt(env('DATABASE_PORT', '5432'), 10),
            database: env('DATABASE_NAME', 'acumen_strapi'),
            user: env('DATABASE_USERNAME', 'strapi_user'),
            password: env('DATABASE_PASSWORD', ''),
            ssl: env('DATABASE_SSL', 'false') === 'true'
                ? { rejectUnauthorized: env('DATABASE_SSL_REJECT_UNAUTHORIZED', 'true') === 'true' }
                : false,
        },
        debug: false,
        acquireConnectionTimeout: 60000,
    },
});
