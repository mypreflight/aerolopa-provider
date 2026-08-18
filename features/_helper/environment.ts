import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { AerolopaClient } from "../../src/aerolopa/aerolopa.client";
import { TtlCache } from "../../src/core/cache/ttl-cache";
import { createHttpServer } from "../../src/http/server";
import { UpstreamStub } from "./upstream";

export const upstream = new UpstreamStub();

let service: Server | undefined;

export let serviceUrl = "";

export async function startService(): Promise<void> {
  const client = new AerolopaClient({
    baseUrl: upstream.url,
    userAgent: "MyPreflight/test",
    cache: new TtlCache(),
  });

  service = createHttpServer(client);
  await new Promise<void>((resolve) => service?.listen(0, resolve));

  const address = service.address() as AddressInfo;
  serviceUrl = `http://127.0.0.1:${address.port}`;
}

export async function stopService(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!service) return resolve();
    service.close(() => resolve());
  });
  service = undefined;
}
