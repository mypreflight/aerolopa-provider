import type { AerolopaClient } from "./client";
import { AerolopaUnavailableError } from "./errors";
import { handleRequest } from "./handler";

const layouts = [
  { id: "lh-32n", airlineIata: "LH", aircraftIata: "32N", variant: null },
  { id: "lo-7m8-1", airlineIata: "LO", aircraftIata: "7M8", variant: "1" },
];

function fakeClient(overrides: Partial<AerolopaClient> = {}): AerolopaClient {
  return {
    listLayouts: jest.fn().mockResolvedValue(layouts),
    ...overrides,
  } as unknown as AerolopaClient;
}

describe("handleRequest", () => {
  it("lists every layout with its count", async () => {
    const response = await handleRequest(fakeClient());

    expect(response).toEqual({ statusCode: 200, body: { count: 2, layouts } });
  });

  it("reports an empty index as a count of zero", async () => {
    const client = fakeClient({ listLayouts: jest.fn().mockResolvedValue([]) } as Partial<AerolopaClient>);

    const response = await handleRequest(client);

    expect(response).toEqual({ statusCode: 200, body: { count: 0, layouts: [] } });
  });

  it("surfaces an upstream outage as a bad gateway", async () => {
    const client = fakeClient({
      listLayouts: jest.fn().mockRejectedValue(new AerolopaUnavailableError()),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client);

    expect(response).toEqual({
      statusCode: 502,
      body: {
        error: {
          code: "AEROLOPA_UNAVAILABLE",
          message: "AeroLOPA is unavailable.",
          status: 502,
        },
      },
    });
  });

  it("hides an unexpected failure behind an internal error", async () => {
    const client = fakeClient({
      listLayouts: jest.fn().mockRejectedValue(new Error("boom")),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client);

    expect(response).toEqual({
      statusCode: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Layout index lookup failed.",
          status: 500,
        },
      },
    });
  });
});
