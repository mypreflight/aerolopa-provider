import type { AerolopaClient } from "./client";
import { ProviderError } from "./errors";
import type { AerolopaLayout } from "./types";

export type HandlerResponse = {
  statusCode: number;
  body: unknown;
};

export type LayoutIndex = {
  count: number;
  layouts: AerolopaLayout[];
};

export async function handleRequest(client: AerolopaClient): Promise<HandlerResponse> {
  try {
    const layouts = await client.listLayouts();
    const index: LayoutIndex = { count: layouts.length, layouts };

    return { statusCode: 200, body: index };
  } catch (error) {
    if (error instanceof ProviderError) {
      return {
        statusCode: error.status,
        body: {
          error: {
            code: error.code,
            message: error.message,
            status: error.status,
          },
        },
      };
    }

    return {
      statusCode: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Layout index lookup failed.",
          status: 500,
        },
      },
    };
  }
}
