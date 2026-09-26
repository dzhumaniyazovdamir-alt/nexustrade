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
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;

export function validateApiEnvironment(environment: Record<string, unknown>): ApiEnvironment {
  const result = apiEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error(`Invalid API environment: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
