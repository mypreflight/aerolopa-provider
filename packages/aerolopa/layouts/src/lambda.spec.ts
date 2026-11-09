import { createHandler, type FunctionUrlEvent } from "./lambda";

const SECRET = "s3cr3t-value";

const layouts = [{ id: "lh-32n", airlineIata: "LH", aircraftIata: "32N", variant: null }];

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

function fakeMain(body: unknown = { count: 1, layouts }) {
  return jest.fn().mockResolvedValue({
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function event(overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent {
  return {
    rawPath: "/layouts",
    headers: { "x-require-whisk-auth": SECRET },
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

    await createHandler(main)(event({ queryStringParameters: { refresh: "true" } }));

    expect(main).toHaveBeenCalledWith({ refresh: "true", __ow_method: "get" });
  });

  it("forwards only the method when there is no query", async () => {
    const main = fakeMain();

    await createHandler(main)(event());

    expect(main).toHaveBeenCalledWith({ __ow_method: "get" });
  });

  it("serialises the function's body", async () => {
    const response = await createHandler(fakeMain())(event());

    expect(response).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: 1, layouts }),
    });
  });

  it("passes a body that is already a string through", async () => {
    const response = await createHandler(fakeMain('{"count":0,"layouts":[]}'))(event());

    expect(response.body).toBe('{"count":0,"layouts":[]}');
  });

  it("keeps the function's error status", async () => {
    const main = jest.fn().mockResolvedValue({
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: { error: { code: "AEROLOPA_UNAVAILABLE", message: "AeroLOPA is unavailable.", status: 502 } },
    });

    const response = await createHandler(main)(event());

    expect(response).toEqual({
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: { code: "AEROLOPA_UNAVAILABLE", message: "AeroLOPA is unavailable.", status: 502 },
      }),
    });
  });
});
