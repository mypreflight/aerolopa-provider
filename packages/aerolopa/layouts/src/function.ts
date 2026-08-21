import { AerolopaClient } from "./client";
import { handleRequest } from "./handler";
import { Logger } from "./logger";

const DEFAULT_BASE_URL = "https://www.aerolopa.com";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const logger = new Logger("LayoutsFunction");

let client: AerolopaClient | undefined;

function resolveClient(): AerolopaClient {
  if (!client) {
    const baseUrl = process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL;

    client = new AerolopaClient({
      baseUrl,
      userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
    });

    logger.log(`Cold start. Reading layouts from ${baseUrl}.`);
  }

  return client;
}

export function resetClient(): void {
  client = undefined;
}

export async function main(): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const { statusCode, body } = await handleRequest(resolveClient());

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body,
  };
}
