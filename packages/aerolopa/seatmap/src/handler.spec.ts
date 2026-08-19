import type { AerolopaClient } from "./client";
import { AerolopaUnavailableError, SeatMapNotFoundError } from "./errors";
import { handleRequest } from "./handler";
import type { AerolopaSeatMap } from "./types";

const seatMap = {
  slug: "lh-32n",
  totalSeats: 180,
} as unknown as AerolopaSeatMap;

function fakeClient(overrides: Partial<AerolopaClient> = {}): AerolopaClient {
  return {
    getSeatMap: jest.fn().mockResolvedValue(seatMap),
    listConfigurations: jest.fn().mockResolvedValue([{ slug: "lh-32n", airlineIata: "LH", aircraftIata: "32N" }]),
    findConfigurations: jest.fn().mockResolvedValue([
      { slug: "lo-7m8-1", airlineIata: "LO", aircraftIata: "7M8" },
      { slug: "lo-7m8-2", airlineIata: "LO", aircraftIata: "7M8" },
    ]),
    ...overrides,
  } as unknown as AerolopaClient;
}

describe("handleRequest", () => {
  it("returns a seat map when a slug is given", async () => {
    const response = await handleRequest(fakeClient(), { slug: "lh-32n" });

    expect(response).toEqual({ statusCode: 200, body: { seatMap } });
  });

  it("resolves candidates without fetching seat maps by default", async () => {
    const client = fakeClient();

    const response = await handleRequest(client, {
      airline: "lo",
      aircraft: "7m8",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      airlineIata: "LO",
      aircraftIata: "7M8",
      candidateCount: 2,
      ambiguous: true,
      candidates: ["lo-7m8-1", "lo-7m8-2"],
      seatMaps: [],
    });
    expect(client.getSeatMap).not.toHaveBeenCalled();
  });

  it("fetches every candidate when seat maps are requested", async () => {
    const client = fakeClient();

    const response = await handleRequest(client, {
      airline: "LO",
      aircraft: "7M8",
      includeSeatMaps: "true",
    });

    expect(client.getSeatMap).toHaveBeenCalledTimes(2);
    expect((response.body as { seatMaps: unknown[] }).seatMaps).toHaveLength(2);
  });

  it("reports a single candidate as unambiguous", async () => {
    const client = fakeClient({
      findConfigurations: jest.fn().mockResolvedValue([{ slug: "lh-32n", airlineIata: "LH", aircraftIata: "32N" }]),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client, {
      airline: "LH",
      aircraft: "32N",
    });

    expect(response.body).toMatchObject({
      ambiguous: false,
      candidateCount: 1,
    });
  });

  it("lists the configuration index", async () => {
    const response = await handleRequest(fakeClient(), {
      op: "configurations",
    });

    expect(response.body).toEqual({
      count: 1,
      configurations: [{ slug: "lh-32n", airlineIata: "LH", aircraftIata: "32N" }],
    });
  });

  it("rejects a request carrying no usable parameters", async () => {
    const response = await handleRequest(fakeClient(), {});

    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ error: { code: "BAD_REQUEST" } });
  });

  it("rejects an unknown operation", async () => {
    const response = await handleRequest(fakeClient(), { op: "teleport" });

    expect(response.statusCode).toBe(400);
  });

  it("rejects a resolve request missing the aircraft", async () => {
    const response = await handleRequest(fakeClient(), { airline: "LH" });

    expect(response.statusCode).toBe(400);
  });

  it("maps a missing seat map onto 404", async () => {
    const client = fakeClient({
      getSeatMap: jest.fn().mockRejectedValue(new SeatMapNotFoundError("zz-999")),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client, { slug: "zz-999" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: { code: "SEAT_MAP_NOT_FOUND", status: 404 },
    });
  });

  it("maps an upstream outage onto 502", async () => {
    const client = fakeClient({
      getSeatMap: jest.fn().mockRejectedValue(new AerolopaUnavailableError()),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client, { slug: "lh-32n" });

    expect(response.statusCode).toBe(502);
  });

  it("hides unexpected failures behind 500", async () => {
    const client = fakeClient({
      getSeatMap: jest.fn().mockRejectedValue(new Error("socket exploded")),
    } as Partial<AerolopaClient>);

    const response = await handleRequest(client, { slug: "lh-32n" });

    expect(response.statusCode).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain("socket exploded");
  });
});
