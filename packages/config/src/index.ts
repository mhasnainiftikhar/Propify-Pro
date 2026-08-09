export const appConfig = {
  api: {
    port: Number(process.env.AUTH_SERVICE_PORT ?? 3002),
    globalPrefix: 'api',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3001',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  },
  database: {
    url: process.env.AUTH_DATABASE_URL ?? '',
  },
} as const;

export type AppConfig = typeof appConfig;
