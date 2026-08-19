import { AerolopaUnavailableError } from "./errors";
import { parseLayoutIndex } from "./parser/layout-index.parser";
import type { AerolopaLayout } from "./types";

const CACHE_TTL_MS = 86_400_000;

const LAYOUT_INDEX_KEY = "layouts";

const TIMEOUT_MS = 15_000;

const RETRIES = 2;

const BACKOFF_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type AerolopaClientOptions = {
  baseUrl: string;
  userAgent: string;
};

export class AerolopaClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(options: AerolopaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.userAgent = options.userAgent;
  }

  async listLayouts(): Promise<AerolopaLayout[]> {
    return this.cached(LAYOUT_INDEX_KEY, async () =>
      parseLayoutIndex(await this.request(`${this.baseUrl}/sitemap.xml`, { Accept: "application/xml" })),
    );
  }

  private async cached<T>(key: string, produce: () => Promise<T>): Promise<T> {
    const entry = this.cache.get(key);

    if (entry && entry.expiresAt > Date.now()) {
      return entry.value as T;
    }

    const value = await produce();
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });

    return value;
  }

  private async request(url: string, headers: Record<string, string>): Promise<string> {
    const response = await this.fetchWithRetry(url, headers);

    if (!response.ok) {
      throw new AerolopaUnavailableError();
    }

    try {
      return await response.text();
    } catch {
      throw new AerolopaUnavailableError();
    }
  }

  private async fetchWithRetry(url: string, headers: Record<string, string>): Promise<Response> {
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        return await fetch(url, {
          headers: { "User-Agent": this.userAgent, ...headers },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        if (attempt === RETRIES) {
          throw new AerolopaUnavailableError();
        }
        await delay(BACKOFF_MS * 2 ** attempt);
      }
    }

    throw new AerolopaUnavailableError();
  }
}
