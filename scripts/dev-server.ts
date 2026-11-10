import { createServer, type IncomingHttpHeaders } from "node:http";
import { handler } from "../src/lambda";
import { Logger } from "../src/logger";

const logger = new Logger("AerolopaDevServer");

const PORT = Number(process.env.PORT ?? 3000);

function flatten(headers: IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers)
      .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
      .map(([name, value]) => [name, Array.isArray(value) ? value.join(",") : value]),
  );
}

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }

  const query = Object.fromEntries(url.searchParams);

  handler({
    rawPath: url.pathname,
    headers: flatten(request.headers),
    queryStringParameters: Object.keys(query).length > 0 ? query : undefined,
    requestContext: { http: { method: request.method ?? "GET" } },
  })
    .then((result) => {
      response.writeHead(result.statusCode, { ...result.headers, "Content-Length": Buffer.byteLength(result.body) });
      response.end(result.body);
    })
    .catch(() => {
      response.writeHead(500, { "Content-Type": "application/json" });
      response.end('{"error":{"code":"INTERNAL_ERROR","status":500}}');
    });
}).listen(PORT, () => {
  logger.log(`Dev server listening on :${PORT}.`);
});
