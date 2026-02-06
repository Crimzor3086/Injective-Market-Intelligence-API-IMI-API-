type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  constructor(private defaultTtlMs = 10_000) {}

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}
