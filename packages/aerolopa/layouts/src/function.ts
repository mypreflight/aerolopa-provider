import { AerolopaClient } from "./client";
import { handleRequest } from "./handler";

const DEFAULT_BASE_URL = "https://www.aerolopa.com";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

let client: AerolopaClient | undefined;

function resolveClient(): AerolopaClient {
  if (!client) {
    client = new AerolopaClient({
      baseUrl: process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL,
      userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
    });
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
