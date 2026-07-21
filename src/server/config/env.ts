import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  VITE_AUTH_MODE: z.string().optional(),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(process.env.NODE_ENV === 'test' ? 10000 : 100),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_HEARTBEAT_MAX: z.coerce.number().int().positive().default(process.env.NODE_ENV === 'test' ? 10000 : 50),
  RATE_LIMIT_HEARTBEAT_WINDOW_MS: z.coerce.number().int().positive().default(900000), // 15 mins
  RATE_LIMIT_PREAUTH_MAX: z.coerce.number().int().positive().default(process.env.NODE_ENV === 'test' ? 10000 : 20),
  RATE_LIMIT_PREAUTH_WINDOW_MS: z.coerce.number().int().positive().default(60000), // 1 min
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
