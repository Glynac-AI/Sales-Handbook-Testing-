export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
    'plugin::users-permissions': {
        enabled: true,
        config: {
            jwtSecret: env('JWT_SECRET'),
        },
    },
    'plugin::i18n': {
        enabled: true,
        config: {
            defaultLocale: 'en',
        },
    },
});
