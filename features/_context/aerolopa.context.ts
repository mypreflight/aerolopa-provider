import { AfterAll, Before, BeforeAll, Given, Then } from "@cucumber/cucumber";
import expect from "expect";
import { htmlPayload, rscPayload, seat, seatMapRecord, sitemapXml } from "../_fixture/aerolopa.fixture";
import { startService, stopService, upstream } from "../_helper/environment";

const SITEMAP_PATH = "/sitemap.xml";

function defaultSeats() {
  return {
    "01A": seat("01A", { rating: "green" }),
    "01B": seat("01B", { window: null }),
    "01C": seat("01C", {
      rating: "red",
      window: null,
      comments: [
        {
          slug: "bathroom_door",
          comment: "Immediately adjacent to lavatory",
          sentiment: "bad",
          severity: "major",
        },
      ],
    }),
    "02A": seat("02A", { bookable: false, blocked: true, crewRest: true }),
  };
}

BeforeAll(async () => {
  await upstream.start();
});

AfterAll(async () => {
  await upstream.stop();
});

Before(async () => {
  upstream.reset();
  await stopService();
  await startService();
});

Given("AeroLOPA publishes the configurations {string}", (slugs: string) => {
  const list = slugs.split(",").map((slug) => slug.trim());

  upstream.serve(SITEMAP_PATH, {
    status: 200,
    body: sitemapXml(list),
    contentType: "application/xml",
  });
});

Given("AeroLOPA serves the seat map {string}", (slug: string) => {
  upstream.serve(`/${slug}`, {
    status: 200,
    body: rscPayload(seatMapRecord(slug, defaultSeats())),
  });
});

Given("AeroLOPA serves the seat map {string} only as HTML", (slug: string) => {
  upstream.serve(`/${slug}`, {
    status: 200,
    body: htmlPayload(seatMapRecord(slug, defaultSeats())),
    contentType: "text/html",
  });
});

Given("AeroLOPA has no seat map for {string}", (slug: string) => {
  upstream.serve(`/${slug}`, {
    status: 404,
    body: "<html>not found</html>",
    contentType: "text/html",
  });
});

Given("AeroLOPA is unavailable for {string}", (slug: string) => {
  upstream.serve(`/${slug}`, {
    status: 503,
    body: "service unavailable",
    contentType: "text/plain",
  });
});

Given("AeroLOPA serves an unreadable payload for {string}", (slug: string) => {
  upstream.serve(`/${slug}`, {
    status: 200,
    body: '2:["$","div",null,{"seats":{"01A":{"x":1,',
  });
});

Given("AeroLOPA is unavailable for the configuration index", () => {
  upstream.serve(SITEMAP_PATH, {
    status: 500,
    body: "boom",
    contentType: "text/plain",
  });
});

Then("AeroLOPA should have been asked for {string} {int} time(s)", (slug: string, count: number) => {
  expect(upstream.callsTo(`/${slug}`)).toBe(count);
});

Then("AeroLOPA should have been asked for the configuration index {int} time(s)", (count: number) => {
  expect(upstream.callsTo(SITEMAP_PATH)).toBe(count);
});
