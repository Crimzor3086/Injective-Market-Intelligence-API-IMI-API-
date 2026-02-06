import dotenv from 'dotenv';

export type Env = {
  PORT: number;
  HOST: string;
  LOG_LEVEL: string;
  CACHE_TTL_MS: number;
  BASELINE_WINDOW: string;
  NODE_ENV: string;
};

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  dotenv.config();

  cachedEnv = {
    PORT: Number.parseInt(process.env.PORT ?? '3000', 10),
    HOST: process.env.HOST ?? '0.0.0.0',
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    CACHE_TTL_MS: Number.parseInt(process.env.CACHE_TTL_MS ?? '10000', 10),
    BASELINE_WINDOW: process.env.BASELINE_WINDOW ?? '7d',
    NODE_ENV: process.env.NODE_ENV ?? 'development'
  };

  return cachedEnv;
}
