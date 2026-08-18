"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const aerolopa_client_1 = require("./aerolopa/aerolopa.client");
const ttl_cache_1 = require("./core/cache/ttl-cache");
const seatmap_handler_1 = require("./http/seatmap.handler");
const DEFAULT_BASE_URL = "https://www.aerolopa.com";
const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";
const cache = new ttl_cache_1.TtlCache();
let client;
function resolveClient() {
    if (!client) {
        client = new aerolopa_client_1.AerolopaClient({
            baseUrl: process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL,
            userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
            cache,
        });
    }
    return client;
}
async function main(args) {
    const { statusCode, body } = await (0, seatmap_handler_1.handleRequest)(resolveClient(), args);
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body,
    };
}
//# sourceMappingURL=function.js.map