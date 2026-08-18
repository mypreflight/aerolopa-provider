import type { IncomingMessage, ServerResponse } from "node:http";
import type { AerolopaClient } from "../aerolopa/aerolopa.client";
import type { AerolopaSeatMap } from "../aerolopa/model/seat-map.types";
import { createApp } from "./server";

const seatMap = { slug: "lh-32n", seats: [] } as unknown as AerolopaSeatMap;

function fakeClient(): AerolopaClient {
  return {
    getSeatMap: jest.fn().mockResolvedValue(seatMap),
    listConfigurations: jest.fn().mockResolvedValue([]),
    findConfigurations: jest.fn().mockResolvedValue([]),
  } as unknown as AerolopaClient;
}

type Captured = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

async function call(client: AerolopaClient, url: string, method = "GET"): Promise<Captured> {
  const captured: Partial<Captured> = {};

  const response = {
    writeHead: (statusCode: number, headers: Record<string, string>) => {
      captured.statusCode = statusCode;
      captured.headers = headers;
    },
    end: (payload: string) => {
      captured.body = JSON.parse(payload);
    },
  } as unknown as ServerResponse;

  await createApp(client)({ url, method } as IncomingMessage, response);

  return captured as Captured;
}

describe("createApp", () => {
  it("answers the health probe", async () => {
    const result = await call(fakeClient(), "/health");

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ status: "ok" });
  });

  it("serves a seat map lookup", async () => {
    const result = await call(fakeClient(), "/seatmap?slug=lh-32n");

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ seatMap });
    expect(result.headers["Content-Type"]).toBe("application/json");
  });

  it("accepts lookups on the root path", async () => {
    const result = await call(fakeClient(), "/?slug=lh-32n");

    expect(result.statusCode).toBe(200);
  });

  it("rejects a request with no usable parameters", async () => {
    const result = await call(fakeClient(), "/seatmap");

    expect(result.statusCode).toBe(400);
  });

  it("rejects an unknown path", async () => {
    const result = await call(fakeClient(), "/admin");

    expect(result.statusCode).toBe(404);
    expect(result.body).toMatchObject({ error: { code: "NOT_FOUND" } });
  });

  it("rejects a non-GET method", async () => {
    const result = await call(fakeClient(), "/seatmap?slug=lh-32n", "POST");

    expect(result.statusCode).toBe(405);
  });

  it("passes query parameters through to the handler", async () => {
    const client = fakeClient();

    await call(client, "/seatmap?airline=LO&aircraft=7M8&includeSeatMaps=true");

    expect(client.findConfigurations).toHaveBeenCalledWith("LO", "7M8");
  });
});
