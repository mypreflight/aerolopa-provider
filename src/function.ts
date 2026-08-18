import { AerolopaClient } from "./aerolopa/aerolopa.client";
import { TtlCache } from "./core/cache/ttl-cache";
import { type HandlerParams, handleRequest } from "./http/seatmap.handler";

const DEFAULT_BASE_URL = "https://www.aerolopa.com";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const cache = new TtlCache();

let client: AerolopaClient | undefined;

function resolveClient(): AerolopaClient {
  if (!client) {
    client = new AerolopaClient({
      baseUrl: process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL,
      userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
      cache,
    });
  }

  return client;
}

export async function main(args: HandlerParams): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const { statusCode, body } = await handleRequest(resolveClient(), args);

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body,
  };
}
