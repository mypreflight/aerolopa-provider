import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AerolopaClient } from '../aerolopa/aerolopa.client';
import { handleRequest, HandlerParams } from './seatmap.handler';
import { openapiDocument } from './openapi.document';

const SEAT_MAP_PATH = '/seatmap';

const HEALTH_PATH = '/health';

const OPENAPI_PATH = '/openapi.json';

function jsonResponse(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);

  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  response.end(payload);
}

function paramsOf(url: URL): HandlerParams {
  const params: HandlerParams = {};

  for (const [key, value] of url.searchParams) {
    params[key as keyof HandlerParams] = value;
  }

  return params;
}

export function createApp(client: AerolopaClient) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    if (request.method !== 'GET') {
      jsonResponse(response, 405, {
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only GET is supported.',
          status: 405,
        },
      });
      return;
    }

    if (url.pathname === HEALTH_PATH) {
      jsonResponse(response, 200, { status: 'ok' });
      return;
    }

    if (url.pathname === OPENAPI_PATH) {
      jsonResponse(response, 200, openapiDocument);
      return;
    }

    if (url.pathname !== SEAT_MAP_PATH && url.pathname !== '/') {
      jsonResponse(response, 404, {
        error: {
          code: 'NOT_FOUND',
          message: `Unknown path ${url.pathname}.`,
          status: 404,
        },
      });
      return;
    }

    const result = await handleRequest(client, paramsOf(url));
    jsonResponse(response, result.statusCode, result.body);
  };
}

export function createHttpServer(client: AerolopaClient) {
  const app = createApp(client);

  return createServer((request, response) => {
    void app(request, response);
  });
}
