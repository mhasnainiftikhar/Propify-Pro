export const CONFIG = {
  jwtAccessSecret: 'JWT_ACCESS_SECRET',
  jwtAccessExpiresIn: 'JWT_ACCESS_EXPIRES_IN',
  jwtRefreshSecret: 'JWT_REFRESH_SECRET',
  refreshTokenTtlDays: 'REFRESH_TOKEN_TTL_DAYS',
  accessTokenTtlSeconds: 'ACCESS_TOKEN_TTL_SECONDS',
  frontendUrl: 'FRONTEND_URL',
  authServicePort: 'AUTH_SERVICE_PORT',
} as const;

export type ConfigKey = (typeof CONFIG)[keyof typeof CONFIG];
