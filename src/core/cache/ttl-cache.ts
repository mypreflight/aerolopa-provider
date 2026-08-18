type Entry<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache {
  private readonly entries = new Map<string, Entry<unknown>>();

  constructor(private readonly now: () => number = Date.now) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  get size(): number {
    return this.entries.size;
  }
}
