import { timingSafeEqual } from "node:crypto";
import { AerolopaClient } from "./client";
import { handleRequest as listLayouts } from "./layouts/handler";
import { Logger } from "./logger";
import { type HandlerResponse, handleRequest as lookUpSeatMaps } from "./seatmap/handler";

export type FunctionUrlEvent = {
  rawPath: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  requestContext: { http: { method: string } };
};

export type FunctionUrlResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type Query = Record<string, string | undefined>;

type Route = (client: AerolopaClient, query: Query) => Promise<HandlerResponse>;

const DEFAULT_BASE_URL = "https://www.aerolopa.com";

const DEFAULT_USER_AGENT = "MyPreflight/1.0 (+https://mypreflight.io)";

const BEARER = /^Bearer +(.+)$/i;

const ROUTES = new Map<string, Route>([
  ["/seatmap", (client, query) => lookUpSeatMaps(client, query)],
  ["/layouts", (client) => listLayouts(client)],
]);

const JSON_HEADERS = { "Content-Type": "application/json" };

const UNAUTHORIZED: FunctionUrlResult = {
  statusCode: 401,
  headers: { ...JSON_HEADERS, "WWW-Authenticate": "Bearer" },
  body: JSON.stringify({
    error: {
      code: "UNAUTHORIZED",
      message: "The Authorization header is missing or wrong.",
      status: 401,
    },
  }),
};

const NOT_FOUND: FunctionUrlResult = {
  statusCode: 404,
  headers: JSON_HEADERS,
  body: JSON.stringify({
    error: {
      code: "NOT_FOUND",
      message: `Unknown function. Expected one of ${[...ROUTES.keys()].join(", ")}.`,
      status: 404,
    },
  }),
};

const logger = new Logger("AerolopaLambda");

let client: AerolopaClient | undefined;

function resolveClient(): AerolopaClient {
  if (!client) {
    const baseUrl = process.env.AEROLOPA_API_HOST ?? DEFAULT_BASE_URL;

    client = new AerolopaClient({
      baseUrl,
      userAgent: process.env.AEROLOPA_USER_AGENT ?? DEFAULT_USER_AGENT,
    });

    logger.log(`Cold start. Reading AeroLOPA from ${baseUrl}.`);
  }

  return client;
}

export function resetClient(): void {
  client = undefined;
}

function isAuthorized(authorization: string | undefined): boolean {
  const secret = process.env.AEROLOPA_FUNCTION_SECRET ?? "";
  const token = authorization === undefined ? undefined : BEARER.exec(authorization)?.[1];

  if (secret === "" || token === undefined) {
    return false;
  }

  const expected = Buffer.from(secret);
  const actual = Buffer.from(token);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  if (!isAuthorized(event.headers?.authorization)) {
    return UNAUTHORIZED;
  }

  const route = ROUTES.get(event.rawPath);

  if (!route) {
    return NOT_FOUND;
  }

  const { statusCode, body } = await route(resolveClient(), event.queryStringParameters ?? {});

  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
