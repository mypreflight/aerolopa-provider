"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
exports.createHttpServer = createHttpServer;
const node_http_1 = require("node:http");
const openapi_document_1 = require("./openapi.document");
const seatmap_handler_1 = require("./seatmap.handler");
const SEAT_MAP_PATH = "/seatmap";
const HEALTH_PATH = "/health";
const OPENAPI_PATH = "/openapi.json";
function jsonResponse(response, statusCode, body) {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
    });
    response.end(payload);
}
function paramsOf(url) {
    const params = {};
    for (const [key, value] of url.searchParams) {
        params[key] = value;
    }
    return params;
}
function createApp(client) {
    return async (request, response) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (request.method !== "GET") {
            jsonResponse(response, 405, {
                error: {
                    code: "METHOD_NOT_ALLOWED",
                    message: "Only GET is supported.",
                    status: 405,
                },
            });
            return;
        }
        if (url.pathname === HEALTH_PATH) {
            jsonResponse(response, 200, { status: "ok" });
            return;
        }
        if (url.pathname === OPENAPI_PATH) {
            jsonResponse(response, 200, openapi_document_1.openapiDocument);
            return;
        }
        if (url.pathname !== SEAT_MAP_PATH && url.pathname !== "/") {
            jsonResponse(response, 404, {
                error: {
                    code: "NOT_FOUND",
                    message: `Unknown path ${url.pathname}.`,
                    status: 404,
                },
            });
            return;
        }
        const result = await (0, seatmap_handler_1.handleRequest)(client, paramsOf(url));
        jsonResponse(response, result.statusCode, result.body);
    };
}
function createHttpServer(client) {
    const app = createApp(client);
    return (0, node_http_1.createServer)((request, response) => {
        void app(request, response);
    });
}
//# sourceMappingURL=server.js.map