"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const aerolopa_client_1 = require("./aerolopa/aerolopa.client");
const ttl_cache_1 = require("./core/cache/ttl-cache");
const server_1 = require("./http/server");
const DEFAULT_PORT = 3000;
const DEFAULT_BASE_URL = "https://www.aerolopa.com";
const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";
function bootstrap() {
    const port = Number(process.env.PORT ?? DEFAULT_PORT);
    const client = new aerolopa_client_1.AerolopaClient({
        baseUrl: process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL,
        userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
        cache: new ttl_cache_1.TtlCache(),
    });
    (0, server_1.createHttpServer)(client).listen(port, () => {
        console.log(`aerolopa-provider listening on :${port}`);
    });
}
if (require.main === module) {
    bootstrap();
}
//# sourceMappingURL=main.js.map