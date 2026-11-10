import { AerolopaClient } from "./client";
import { type FunctionUrlEvent, handler, resetClient } from "./lambda";
import { handleRequest as listLayouts } from "./layouts/handler";
import { handleRequest as lookUpSeatMaps } from "./seatmap/handler";

jest.mock("./seatmap/handler", () => ({ handleRequest: jest.fn() }));
jest.mock("./layouts/handler", () => ({ handleRequest: jest.fn() }));

const SECRET = "s3cr3t-value";

const seatMapBody = { seatMap: { slug: "lh-32n" } };

const layoutsBody = { count: 1, layouts: [{ id: "lh-32n", airlineIata: "LH", aircraftIata: "32N", variant: null }] };

const unauthorized = {
  statusCode: 401,
  headers: { "Content-Type": "application/json", "WWW-Authenticate": "Bearer" },
  body: JSON.stringify({
    error: {
      code: "UNAUTHORIZED",
      message: "The Authorization header is missing or wrong.",
      status: 401,
    },
  }),
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

function event(overrides: Partial<FunctionUrlEvent> = {}): FunctionUrlEvent {
  return {
    rawPath: "/seatmap",
    headers: { authorization: `Bearer ${SECRET}` },
    queryStringParameters: { slug: "lh-32n" },
    requestContext: { http: { method: "GET" } },
    ...overrides,
  };
}

const original = process.env.AEROLOPA_FUNCTION_SECRET;

beforeEach(() => {
  process.env.AEROLOPA_FUNCTION_SECRET = SECRET;
  resetClient();
  jest.mocked(lookUpSeatMaps).mockReset().mockResolvedValue({ statusCode: 200, body: seatMapBody });
  jest.mocked(listLayouts).mockReset().mockResolvedValue({ statusCode: 200, body: layoutsBody });
});

afterEach(() => {
  if (original === undefined) {
    delete process.env.AEROLOPA_FUNCTION_SECRET;
  } else {
    process.env.AEROLOPA_FUNCTION_SECRET = original;
  }
});

function expectNothingServed(): void {
  expect(lookUpSeatMaps).not.toHaveBeenCalled();
  expect(listLayouts).not.toHaveBeenCalled();
}

describe("the bearer secret", () => {
  it("lets a request with the right secret through", async () => {
    const response = await handler(event());

    expect(response.statusCode).toBe(200);
    expect(lookUpSeatMaps).toHaveBeenCalledTimes(1);
  });

  it("accepts the scheme in any case", async () => {
    const response = await handler(event({ headers: { authorization: `bearer ${SECRET}` } }));

    expect(response.statusCode).toBe(200);
  });

  it.each([
    ["missing", {}],
    ["empty", { authorization: "" }],
    ["the bare secret without a scheme", { authorization: SECRET }],
    ["another scheme", { authorization: `Basic ${SECRET}` }],
    ["the scheme alone", { authorization: "Bearer " }],
    ["wrong but the same length", { authorization: "Bearer s3cr3t-valuX" }],
    ["a prefix of the secret", { authorization: `Bearer ${SECRET.slice(0, 6)}` }],
    ["longer than the secret", { authorization: `Bearer ${SECRET}-and-more` }],
  ])("refuses a request when the header is %s", async (_label, headers) => {
    const response = await handler(event({ headers }));

    expect(response).toEqual(unauthorized);
    expectNothingServed();
  });

  it("refuses a request without any headers", async () => {
    const response = await handler(event({ headers: undefined }));

    expect(response).toEqual(unauthorized);
    expectNothingServed();
  });

  it("refuses every request when the secret is empty", async () => {
    process.env.AEROLOPA_FUNCTION_SECRET = "";

    const response = await handler(event({ headers: { authorization: "Bearer " } }));

    expect(response).toEqual(unauthorized);
    expectNothingServed();
  });

  it("refuses every request when the secret is not set", async () => {
    delete process.env.AEROLOPA_FUNCTION_SECRET;

    const response = await handler(event({ headers: { authorization: "Bearer undefined" } }));

    expect(response).toEqual(unauthorized);
    expectNothingServed();
  });

  it("checks the secret before the path, so an unauthorised caller learns nothing about routes", async () => {
    const response = await handler(event({ rawPath: "/elsewhere", headers: {} }));

    expect(response).toEqual(unauthorized);
  });
});

describe("routing", () => {
  it("hands /seatmap and its query to the seat map handler", async () => {
    const query = { airline: "LO", aircraft: "7M8", includeSeatMaps: "true" };

    const response = await handler(event({ queryStringParameters: query }));

    expect(response.body).toBe(JSON.stringify(seatMapBody));
    expect(lookUpSeatMaps).toHaveBeenCalledWith(expect.any(AerolopaClient), query);
    expect(listLayouts).not.toHaveBeenCalled();
  });

  it("hands /layouts to the layouts handler", async () => {
    const response = await handler(event({ rawPath: "/layouts", queryStringParameters: undefined }));

    expect(response.body).toBe(JSON.stringify(layoutsBody));
    expect(listLayouts).toHaveBeenCalledWith(expect.any(AerolopaClient));
    expect(lookUpSeatMaps).not.toHaveBeenCalled();
  });

  it("copes with a request that has no query string", async () => {
    await handler(event({ queryStringParameters: undefined }));

    expect(lookUpSeatMaps).toHaveBeenCalledWith(expect.any(AerolopaClient), {});
  });

  it("shares one client between both routes and across calls", async () => {
    await handler(event());
    await handler(event({ rawPath: "/layouts" }));
    await handler(event());

    const clients = [...jest.mocked(lookUpSeatMaps).mock.calls, ...jest.mocked(listLayouts).mock.calls].map(
      ([client]) => client,
    );

    expect(new Set(clients).size).toBe(1);
  });

  it.each(["/", "/resolve", "/seatmap/", "/seatmap/lh-32n", "/Seatmap", "/aerolopa/seatmap"])(
    "answers %s with not found",
    async (rawPath) => {
      const response = await handler(event({ rawPath }));

      expect(response).toEqual(notFound);
      expectNothingServed();
    },
  );
});

describe("the response", () => {
  it("serialises the handler's body as JSON", async () => {
    const response = await handler(event());

    expect(response).toEqual({
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: '{"seatMap":{"slug":"lh-32n"}}',
    });
  });

  it("keeps the handler's error status", async () => {
    const body = {
      error: {
        code: "SEAT_MAP_NOT_FOUND",
        message: "Seat map for configuration xx-000 does not exist.",
        status: 404,
      },
    };
    jest.mocked(lookUpSeatMaps).mockResolvedValue({ statusCode: 404, body });

    const response = await handler(event({ queryStringParameters: { slug: "xx-000" } }));

    expect(response).toEqual({
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  });

  it("keeps an upstream outage on the layouts route", async () => {
    const body = { error: { code: "AEROLOPA_UNAVAILABLE", message: "AeroLOPA is unavailable.", status: 502 } };
    jest.mocked(listLayouts).mockResolvedValue({ statusCode: 502, body });

    const response = await handler(event({ rawPath: "/layouts" }));

    expect(response.statusCode).toBe(502);
    expect(JSON.parse(response.body)).toEqual(body);
  });
});
