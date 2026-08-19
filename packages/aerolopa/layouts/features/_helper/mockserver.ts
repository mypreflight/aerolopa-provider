const MOCKSERVER_URL = process.env.AEROLOPA_API_HOST ?? "http://aerolopa-mock:1080";

type Expectation = {
  path: string;
  status: number;
  body: string;
  contentType?: string;
};

async function control(action: string, body: unknown, query = ""): Promise<Response> {
  return fetch(`${MOCKSERVER_URL}/mockserver/${action}${query}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function reset(): Promise<void> {
  await fetch(`${MOCKSERVER_URL}/mockserver/reset`, { method: "PUT" });
}

export async function expect(expectation: Expectation): Promise<void> {
  await control("expectation", {
    httpRequest: { method: "GET", path: expectation.path },
    httpResponse: {
      statusCode: expectation.status,
      headers: { "Content-Type": [expectation.contentType ?? "text/x-component; charset=utf-8"] },
      body: expectation.body,
    },
  });
}

export async function callsTo(path: string): Promise<number> {
  const response = await control("retrieve", { path }, "?type=REQUESTS&format=JSON");
  const recorded = (await response.json()) as unknown[];

  return recorded.length;
}

export async function restoreFixtures(): Promise<void> {
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const file = join(__dirname, "..", "..", "..", "..", "..", "docker", "mock", "aerolopa.json");
  const expectations = JSON.parse(readFileSync(file, "utf-8")) as unknown[];

  await reset();
  for (const expectation of expectations) {
    await control("expectation", expectation);
  }
}

export const upstreamUrl = MOCKSERVER_URL;
