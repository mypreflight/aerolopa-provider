import type { AerolopaClient } from "./client";
import { ProviderError } from "./errors";
import { describeError, Logger, stackOf } from "./logger";
import type { AerolopaLayout } from "./types";

export type HandlerResponse = {
  statusCode: number;
  body: unknown;
};

export type LayoutIndex = {
  count: number;
  layouts: AerolopaLayout[];
};

const logger = new Logger("LayoutsHandler");

export async function handleRequest(client: AerolopaClient): Promise<HandlerResponse> {
  const startedAt = Date.now();

  try {
    const layouts = await client.listLayouts();
    const index: LayoutIndex = { count: layouts.length, layouts };
    logger.log(`Served ${index.count} layouts in ${Date.now() - startedAt}ms.`);

    return { statusCode: 200, body: index };
  } catch (error) {
    if (error instanceof ProviderError) {
      logger.warn(`Layout index lookup failed after ${Date.now() - startedAt}ms with ${error.status} ${error.code}.`);

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

    logger.error(
      `Layout index lookup crashed after ${Date.now() - startedAt}ms: ${describeError(error)}`,
      stackOf(error),
    );

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
