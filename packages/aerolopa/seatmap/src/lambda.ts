import { timingSafeEqual } from "node:crypto";
import { main } from "./function";

export type FunctionUrlEvent = {
  rawPath: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string>;
  requestContext: { http: { method: string } };
};

export type FunctionUrlResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

type FunctionMain = (args: Record<string, string>) => Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}>;

const SECRET_HEADER = "x-require-whisk-auth";

const UNAUTHORIZED: FunctionUrlResult = {
  statusCode: 401,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    error: {
      code: "UNAUTHORIZED",
      message: "The X-Require-Whisk-Auth header is missing or wrong.",
      status: 401,
    },
  }),
};

function isAuthorized(received: string | undefined): boolean {
  const secret = process.env.AEROLOPA_FUNCTION_SECRET ?? "";

  if (secret === "" || received === undefined) {
    return false;
  }

  const expected = Buffer.from(secret);
  const actual = Buffer.from(received);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createHandler(entry: FunctionMain): (event: FunctionUrlEvent) => Promise<FunctionUrlResult> {
  return async (event) => {
    if (!isAuthorized(event.headers?.[SECRET_HEADER])) {
      return UNAUTHORIZED;
    }

    const args = { ...event.queryStringParameters, __ow_method: event.requestContext.http.method.toLowerCase() };
    const { statusCode, headers, body } = await entry(args);

    return { statusCode, headers, body: typeof body === "string" ? body : JSON.stringify(body) };
  };
}

export const handler = createHandler(main);
