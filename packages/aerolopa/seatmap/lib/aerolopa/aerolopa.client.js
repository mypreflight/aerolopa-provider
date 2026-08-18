"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AerolopaClient = void 0;
const ttl_cache_1 = require("../core/cache/ttl-cache");
const fetch_with_retry_1 = require("../core/http/fetch-with-retry");
const aerolopa_error_1 = require("./model/aerolopa.error");
const seat_map_types_1 = require("./model/seat-map.types");
const configuration_index_parser_1 = require("./parser/configuration-index.parser");
const rsc_payload_parser_1 = require("./parser/rsc-payload.parser");
const SEAT_MAP_CACHE_TTL_MS = 86_400_000;
const CONFIGURATION_INDEX_CACHE_TTL_MS = 86_400_000;
const CONFIGURATION_INDEX_CACHE_KEY = "configurations";
const SEAT_MAP_MARKER = '"seats":{';
const seatMapCacheKey = (slug) => `seat-map:${slug}`;
class AerolopaClient {
    baseUrl;
    userAgent;
    cache;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.userAgent = options.userAgent;
        this.cache = options.cache ?? new ttl_cache_1.TtlCache();
    }
    async getSeatMap(slug) {
        const cacheKey = seatMapCacheKey(slug);
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const payload = await this.fetchSeatMapPayload(slug);
        const record = (0, rsc_payload_parser_1.extractSeatMapRecord)((0, rsc_payload_parser_1.decodeRscPayload)(payload));
        if (!record) {
            throw new aerolopa_error_1.SeatMapUnreadableError(slug);
        }
        const seatMap = (0, seat_map_types_1.transformSeatMap)(record);
        this.cache.set(cacheKey, seatMap, SEAT_MAP_CACHE_TTL_MS);
        return seatMap;
    }
    async listConfigurations() {
        const cached = this.cache.get(CONFIGURATION_INDEX_CACHE_KEY);
        if (cached) {
            return cached;
        }
        const sitemap = await this.request(`${this.baseUrl}/sitemap.xml`, {
            Accept: "application/xml",
        });
        const configurations = (0, configuration_index_parser_1.parseConfigurationIndex)(sitemap);
        this.cache.set(CONFIGURATION_INDEX_CACHE_KEY, configurations, CONFIGURATION_INDEX_CACHE_TTL_MS);
        return configurations;
    }
    async findConfigurations(airlineIata, aircraftIata) {
        const configurations = await this.listConfigurations();
        const airline = airlineIata.toUpperCase();
        const aircraft = aircraftIata.toUpperCase();
        return configurations.filter((configuration) => configuration.airlineIata === airline && configuration.aircraftIata === aircraft);
    }
    async fetchSeatMapPayload(slug) {
        const payload = await this.request(`${this.baseUrl}/${slug}`, { Accept: "text/x-component", RSC: "1" }, slug);
        if (payload.includes(SEAT_MAP_MARKER)) {
            return payload;
        }
        return this.request(`${this.baseUrl}/${slug}`, { Accept: "text/html" }, slug);
    }
    async request(url, headers, slug) {
        let response;
        try {
            response = await (0, fetch_with_retry_1.fetchWithRetry)(url, {
                headers: { "User-Agent": this.userAgent, ...headers },
            });
        }
        catch {
            throw new aerolopa_error_1.AerolopaUnavailableError();
        }
        if (response.status === 404 && slug) {
            throw new aerolopa_error_1.SeatMapNotFoundError(slug);
        }
        if (!response.ok) {
            throw new aerolopa_error_1.AerolopaUnavailableError();
        }
        try {
            return await response.text();
        }
        catch {
            throw new aerolopa_error_1.AerolopaUnavailableError();
        }
    }
}
exports.AerolopaClient = AerolopaClient;
//# sourceMappingURL=aerolopa.client.js.map