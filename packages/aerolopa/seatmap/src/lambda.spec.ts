import { createHandler, type FunctionUrlEvent } from "./lambda";

const SECRET = "s3cr3t-value";

const unauthorized = {
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

function fakeMain(body: unknown = { seatMap: { slug: "lh-32n" } }) {
  return jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function event(overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent {
  return {
    rawPath: "/seatmap",
    headers: { "x-require-whisk-auth": SECRET },
    queryStringParameters: { slug: "lh-32n" },
    requestContext: { http: { method: "GET" } },
    ...overrides,
  };
}

describe("handler", () => {
  const original = process.env.AEROLOPA_FUNCTION_SECRET;

  beforeEach(() => {
    process.env.AEROLOPA_FUNCTION_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.AEROLOPA_FUNCTION_SECRET;
    } else {
      process.env.AEROLOPA_FUNCTION_SECRET = original;
    }
  });

  it("refuses a request without the secret header", async () => {
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: {} }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("refuses a request without any headers", async () => {
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: undefined }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("refuses a wrong secret of the same length", async () => {
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: { "x-require-whisk-auth": "s3cr3t-valuX" } }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("refuses a wrong secret of a different length", async () => {
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: { "x-require-whisk-auth": `${SECRET}-and-more` } }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("refuses every request when the secret is empty", async () => {
    process.env.AEROLOPA_FUNCTION_SECRET = "";
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: { "x-require-whisk-auth": "" } }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("refuses every request when the secret is not set", async () => {
    delete process.env.AEROLOPA_FUNCTION_SECRET;
    const main = fakeMain();

    const response = await createHandler(main)(event({ headers: { "x-require-whisk-auth": "" } }));

    expect(response).toEqual(unauthorized);
    expect(main).not.toHaveBeenCalled();
  });

  it("forwards the query and the lowercased method to the function", async () => {
    const main = fakeMain();

    await createHandler(main)(
      event({ queryStringParameters: { airline: "LO", aircraft: "7M8", includeSeatMaps: "true" } }),
    );

    expect(main).toHaveBeenCalledWith({ airline: "LO", aircraft: "7M8", includeSeatMaps: "true", __ow_method: "get" });
  });

  it("forwards only the method when there is no query", async () => {
    const main = fakeMain();

    await createHandler(main)(event({ queryStringParameters: undefined }));

    expect(main).toHaveBeenCalledWith({ __ow_method: "get" });
  });

  it("serialises the function's body", async () => {
    const response = await createHandler(fakeMain())(event());

    expect(response).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: '{"seatMap":{"slug":"lh-32n"}}',
    });
  });

  it("passes a body that is already a string through", async () => {
    const response = await createHandler(fakeMain('{"seatMap":null}'))(event());

    expect(response.body).toBe('{"seatMap":null}');
  });

  it("keeps the function's error status", async () => {
    const main = jest.fn().mockResolvedValue({
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: {
        error: {
          code: "SEAT_MAP_NOT_FOUND",
          message: "Seat map for configuration xx-000 does not exist.",
          status: 404,
        },
      },
    });

    const response = await createHandler(main)(event({ queryStringParameters: { slug: "xx-000" } }));

    expect(response).toEqual({
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: {
          code: "SEAT_MAP_NOT_FOUND",
          message: "Seat map for configuration xx-000 does not exist.",
          status: 404,
        },
      }),
    });
  });
});
