import type { IncomingMessage, ServerResponse } from "node:http";
import type { AerolopaClient } from "../aerolopa/aerolopa.client";
import { openapiDocument } from "./openapi.document";
import { createApp } from "./server";

function fakeClient(): AerolopaClient {
  return {
    getSeatMap: jest.fn().mockResolvedValue({ slug: "lh-32n", seats: [] }),
    listConfigurations: jest.fn().mockResolvedValue([]),
    findConfigurations: jest.fn().mockResolvedValue([]),
  } as unknown as AerolopaClient;
}

async function statusOf(url: string, method = "GET"): Promise<number> {
  let status = 0;
  const response = {
    writeHead: (code: number) => {
      status = code;
    },
    end: () => undefined,
  } as unknown as ServerResponse;

  await createApp(fakeClient())({ url, method } as IncomingMessage, response);

  return status;
}

describe("openapi document", () => {
  it("declares every path the server actually serves", async () => {
    const documented = Object.keys(openapiDocument.paths);

    for (const path of documented) {
      expect(await statusOf(path === "/seatmap" ? `${path}?slug=x` : path)).not.toBe(404);
    }
  });

  it("documents each status the server can answer with", async () => {
    const documented = Object.keys(openapiDocument.paths["/seatmap"].get.responses);

    expect(documented).toEqual(expect.arrayContaining(["200", "400", "404", "405", "500", "502"]));
    expect(String(await statusOf("/seatmap"))).toBe("400");
    expect(String(await statusOf("/seatmap?slug=x", "POST"))).toBe("405");
  });

  it("keeps the operation enum in step with the handler", () => {
    const op = openapiDocument.paths["/seatmap"].get.parameters.find((parameter) => parameter.name === "op");

    expect(op?.schema.enum).toEqual(["seatmap", "resolve", "configurations"]);
  });

  it("is served over http", async () => {
    let body: unknown;
    const response = {
      writeHead: () => undefined,
      end: (payload: string) => {
        body = JSON.parse(payload);
      },
    } as unknown as ServerResponse;

    await createApp(fakeClient())({ url: "/openapi.json", method: "GET" } as IncomingMessage, response);

    expect(body).toMatchObject({ openapi: "3.1.0" });
  });
});
