import dotenv from 'dotenv';

export type Env = {
  PORT: number;
  HOST: string;
  LOG_LEVEL: string;
  CACHE_TTL_MS: number;
  BASELINE_WINDOW: string;
  NODE_ENV: string;
  INJECTIVE_API_URL: string;
  INJECTIVE_API_TIMEOUT_MS: number;
  INJECTIVE_API_CACHE_TTL_MS: number;
  INJECTIVE_API_RATE_LIMIT_PER_MINUTE: number;
  ENABLE_API_METRICS: boolean;
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
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    INJECTIVE_API_URL: process.env.INJECTIVE_API_URL ?? 'https://api.injective.exchange',
    INJECTIVE_API_TIMEOUT_MS: Number.parseInt(process.env.INJECTIVE_API_TIMEOUT_MS ?? '10000', 10),
    INJECTIVE_API_CACHE_TTL_MS: Number.parseInt(process.env.INJECTIVE_API_CACHE_TTL_MS ?? '5000', 10),
    INJECTIVE_API_RATE_LIMIT_PER_MINUTE: Number.parseInt(process.env.INJECTIVE_API_RATE_LIMIT_PER_MINUTE ?? '60', 10),
    ENABLE_API_METRICS: process.env.ENABLE_API_METRICS !== 'false'
  };

  return cachedEnv;
}
