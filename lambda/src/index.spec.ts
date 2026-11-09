import { handler as layouts } from "../../packages/aerolopa/layouts/src/lambda";
import { type FunctionUrlEvent, handler as seatmap } from "../../packages/aerolopa/seatmap/src/lambda";
import { handler } from "./index";

jest.mock("../../packages/aerolopa/seatmap/src/lambda", () => ({ handler: jest.fn() }));
jest.mock("../../packages/aerolopa/layouts/src/lambda", () => ({ handler: jest.fn() }));

const answer = {
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: '{"ok":true}',
};

const notFound = {
  statusCode: 404,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    error: {
      code: "NOT_FOUND",
      message: "Unknown function. Expected one of /seatmap, /layouts.",
      status: 404,
    },
  }),
};

function event(rawPath: string): FunctionUrlEvent {
  return {
    rawPath,
    headers: { "x-require-whisk-auth": "secret" },
    queryStringParameters: { slug: "lh-32n" },
    requestContext: { http: { method: "GET" } },
  };
}

describe("handler", () => {
  beforeEach(() => {
    jest.mocked(seatmap).mockReset().mockResolvedValue(answer);
    jest.mocked(layouts).mockReset().mockResolvedValue(answer);
  });

  it("hands /seatmap to the seatmap function", async () => {
    const request = event("/seatmap");

    const response = await handler(request);

    expect(response).toEqual(answer);
    expect(seatmap).toHaveBeenCalledWith(request);
    expect(layouts).not.toHaveBeenCalled();
  });

  it("hands /layouts to the layouts function", async () => {
    const request = event("/layouts");

    const response = await handler(request);

    expect(response).toEqual(answer);
    expect(layouts).toHaveBeenCalledWith(request);
    expect(seatmap).not.toHaveBeenCalled();
  });

  it.each(["/", "/resolve", "/seatmap/", "/seatmap/lh-32n", "/Seatmap", "/aerolopa/seatmap"])(
    "answers %s with not found",
    async (rawPath) => {
      const response = await handler(event(rawPath));

      expect(response).toEqual(notFound);
      expect(seatmap).not.toHaveBeenCalled();
      expect(layouts).not.toHaveBeenCalled();
    },
  );
});
