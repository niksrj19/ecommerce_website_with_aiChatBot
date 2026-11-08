interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export class CatalogCache {
  private static entries = new Map<string, CacheEntry>();
  private static cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
  }, 60 * 1000).unref();

  static async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value as T;
  }

  static async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  static async invalidate(): Promise<void> {
    this.entries.clear();
  }
}
