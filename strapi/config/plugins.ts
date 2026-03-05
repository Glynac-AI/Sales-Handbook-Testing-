export default ({ env }: { env: (key: string, defaultValue?: string) => string }) => ({
    'users-permissions': {
        enabled: true,
        config: {
            jwtSecret: env('JWT_SECRET'),
        },
    },
});


