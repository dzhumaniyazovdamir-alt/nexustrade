import { z } from 'zod';

const apiEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://nexustrade:nexustrade_dev@localhost:55432/nexustrade'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(32).default('development-refresh-secret-change-me'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(3600)
    .max(60 * 60 * 24 * 90)
    .default(60 * 60 * 24 * 30),
  AUTH_ACCESS_COOKIE: z.string().min(1).default('nexustrade_access'),
  AUTH_REFRESH_COOKIE: z.string().min(1).default('nexustrade_refresh'),
  PASSWORD_HASH_MEMORY_COST: z.coerce.number().int().min(8192).default(19456),
  INVITATION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),
  WEB_ORIGIN: z.string().url().default('http://localhost:4200'),
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;

export function validateApiEnvironment(environment: Record<string, unknown>): ApiEnvironment {
  const result = apiEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(`Invalid API environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
