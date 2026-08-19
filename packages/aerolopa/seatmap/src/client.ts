import { AerolopaUnavailableError, SeatMapNotFoundError, SeatMapUnreadableError } from "./errors";
import { parseConfigurationIndex } from "./parser/configuration-index.parser";
import { decodeRscPayload, extractSeatMapRecord } from "./parser/rsc-payload.parser";
import { type AerolopaConfiguration, type AerolopaSeatMap, transformSeatMap } from "./types";

const CACHE_TTL_MS = 86_400_000;

const CONFIGURATION_INDEX_KEY = "configurations";

const SEAT_MAP_MARKER = '"seats":{';

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

  async getSeatMap(slug: string): Promise<AerolopaSeatMap> {
    return this.cached(`seat-map:${slug}`, async () => {
      const record = extractSeatMapRecord(decodeRscPayload(await this.fetchSeatMapPayload(slug)));

      if (!record) {
        throw new SeatMapUnreadableError(slug);
      }

      return transformSeatMap(record);
    });
  }

  async listConfigurations(): Promise<AerolopaConfiguration[]> {
    return this.cached(CONFIGURATION_INDEX_KEY, async () =>
      parseConfigurationIndex(await this.request(`${this.baseUrl}/sitemap.xml`, { Accept: "application/xml" })),
    );
  }

  async findConfigurations(airlineIata: string, aircraftIata: string): Promise<AerolopaConfiguration[]> {
    const airline = airlineIata.toUpperCase();
    const aircraft = aircraftIata.toUpperCase();

    return (await this.listConfigurations()).filter(
      (configuration) => configuration.airlineIata === airline && configuration.aircraftIata === aircraft,
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

  private async fetchSeatMapPayload(slug: string): Promise<string> {
    const payload = await this.request(`${this.baseUrl}/${slug}`, { Accept: "text/x-component", RSC: "1" }, slug);

    if (payload.includes(SEAT_MAP_MARKER)) {
      return payload;
    }

    return this.request(`${this.baseUrl}/${slug}`, { Accept: "text/html" }, slug);
  }

  private async request(url: string, headers: Record<string, string>, slug?: string): Promise<string> {
    const response = await this.fetchWithRetry(url, headers);

    if (response.status === 404 && slug) {
      throw new SeatMapNotFoundError(slug);
    }

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
