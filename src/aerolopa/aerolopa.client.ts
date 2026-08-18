import {
  AerolopaConfiguration,
  AerolopaSeatMap,
  transformSeatMap,
} from './model/seat-map.types';
import {
  decodeRscPayload,
  extractSeatMapRecord,
} from './parser/rsc-payload.parser';
import { parseConfigurationIndex } from './parser/configuration-index.parser';
import {
  AerolopaUnavailableError,
  SeatMapNotFoundError,
  SeatMapUnreadableError,
} from './model/aerolopa.error';
import { fetchWithRetry } from '../core/http/fetch-with-retry';
import { TtlCache } from '../core/cache/ttl-cache';

const SEAT_MAP_CACHE_TTL_MS = 86_400_000;

const CONFIGURATION_INDEX_CACHE_TTL_MS = 86_400_000;

const CONFIGURATION_INDEX_CACHE_KEY = 'configurations';

const SEAT_MAP_MARKER = '"seats":{';

const seatMapCacheKey = (slug: string): string => `seat-map:${slug}`;

export type AerolopaClientOptions = {
  baseUrl: string;
  userAgent: string;
  cache?: TtlCache;
};

export class AerolopaClient {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private readonly cache: TtlCache;

  constructor(options: AerolopaClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.userAgent = options.userAgent;
    this.cache = options.cache ?? new TtlCache();
  }

  async getSeatMap(slug: string): Promise<AerolopaSeatMap> {
    const cacheKey = seatMapCacheKey(slug);
    const cached = this.cache.get<AerolopaSeatMap>(cacheKey);

    if (cached) {
      return cached;
    }

    const payload = await this.fetchSeatMapPayload(slug);
    const record = extractSeatMapRecord(decodeRscPayload(payload));

    if (!record) {
      throw new SeatMapUnreadableError(slug);
    }

    const seatMap = transformSeatMap(record);
    this.cache.set(cacheKey, seatMap, SEAT_MAP_CACHE_TTL_MS);

    return seatMap;
  }

  async listConfigurations(): Promise<AerolopaConfiguration[]> {
    const cached = this.cache.get<AerolopaConfiguration[]>(
      CONFIGURATION_INDEX_CACHE_KEY,
    );

    if (cached) {
      return cached;
    }

    const sitemap = await this.request(`${this.baseUrl}/sitemap.xml`, {
      Accept: 'application/xml',
    });
    const configurations = parseConfigurationIndex(sitemap);

    this.cache.set(
      CONFIGURATION_INDEX_CACHE_KEY,
      configurations,
      CONFIGURATION_INDEX_CACHE_TTL_MS,
    );

    return configurations;
  }

  async findConfigurations(
    airlineIata: string,
    aircraftIata: string,
  ): Promise<AerolopaConfiguration[]> {
    const configurations = await this.listConfigurations();
    const airline = airlineIata.toUpperCase();
    const aircraft = aircraftIata.toUpperCase();

    return configurations.filter(
      (configuration) =>
        configuration.airlineIata === airline &&
        configuration.aircraftIata === aircraft,
    );
  }

  private async fetchSeatMapPayload(slug: string): Promise<string> {
    const payload = await this.request(
      `${this.baseUrl}/${slug}`,
      { Accept: 'text/x-component', RSC: '1' },
      slug,
    );

    if (payload.includes(SEAT_MAP_MARKER)) {
      return payload;
    }

    return this.request(
      `${this.baseUrl}/${slug}`,
      { Accept: 'text/html' },
      slug,
    );
  }

  private async request(
    url: string,
    headers: Record<string, string>,
    slug?: string,
  ): Promise<string> {
    let response: Response;

    try {
      response = await fetchWithRetry(url, {
        headers: { 'User-Agent': this.userAgent, ...headers },
      });
    } catch {
      throw new AerolopaUnavailableError();
    }

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
}
