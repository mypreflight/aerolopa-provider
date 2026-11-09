import { handler as layouts } from "../../packages/aerolopa/layouts/src/lambda";
import {
  type FunctionUrlEvent,
  type FunctionUrlResult,
  handler as seatmap,
} from "../../packages/aerolopa/seatmap/src/lambda";

const ROUTES = new Map([
  ["/seatmap", seatmap],
  ["/layouts", layouts],
]);

const NOT_FOUND: FunctionUrlResult = {
  statusCode: 404,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    error: {
      code: "NOT_FOUND",
      message: `Unknown function. Expected one of ${[...ROUTES.keys()].join(", ")}.`,
      status: 404,
    },
  }),
};

export async function handler(event: FunctionUrlEvent): Promise<FunctionUrlResult> {
  const route = ROUTES.get(event.rawPath);

  return route ? await route(event) : NOT_FOUND;
}
