import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultSeats, rscPayload, seatMapRecord, sitemapXml } from "../features/_helper/aerolopa.fixture";

const SLUGS = ["lh-32n", "lh-321", "lo-7m8-1", "lo-7m8-2", "lo-7m8-3", "aa-a321t"];

const expectation = (path: string, body: string, contentType: string) => ({
  httpRequest: { method: "GET", path },
  httpResponse: {
    statusCode: 200,
    headers: { "Content-Type": [contentType] },
    body,
  },
});

const expectations = [
  expectation("/sitemap.xml", sitemapXml(SLUGS), "application/xml; charset=utf-8"),
  ...SLUGS.map((slug) =>
    expectation(`/${slug}`, rscPayload(seatMapRecord(slug, defaultSeats())), "text/x-component; charset=utf-8"),
  ),
];

const target = join(__dirname, "..", "..", "..", "..", "docker", "mock", "aerolopa.json");
writeFileSync(target, `${JSON.stringify(expectations, null, 2)}\n`, "utf-8");

console.log(`wrote ${target} (${expectations.length} expectations)`);
