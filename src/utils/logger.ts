import type { Env } from '../config/env';

export function buildLogger(env: Env): { level: string } {
  return {
    level: env.LOG_LEVEL
  };
}
