import { AfterAll, Before, Given, Then } from "@cucumber/cucumber";
import expect from "expect";
import { resetClient } from "../../src/function";
import { defaultSeats, htmlPayload, rscPayload, seatMapRecord, sitemapXml } from "../_helper/aerolopa.fixture";
import { callsTo, reset, restoreFixtures, expect as stub } from "../_helper/mockserver";

const SITEMAP_PATH = "/sitemap.xml";

Before(async () => {
  await reset();
  resetClient();
});

Given("AeroLOPA publishes the configurations {string}", async (slugs: string) => {
  await stub({
    path: SITEMAP_PATH,
    status: 200,
    body: sitemapXml(slugs.split(",").map((slug) => slug.trim())),
    contentType: "application/xml; charset=utf-8",
  });
});

Given("AeroLOPA serves the seat map {string}", async (slug: string) => {
  await stub({
    path: `/${slug}`,
    status: 200,
    body: rscPayload(seatMapRecord(slug, defaultSeats())),
  });
});

Given("AeroLOPA serves the seat map {string} only as HTML", async (slug: string) => {
  await stub({
    path: `/${slug}`,
    status: 200,
    body: htmlPayload(seatMapRecord(slug, defaultSeats())),
    contentType: "text/html; charset=utf-8",
  });
});

Given("AeroLOPA has no seat map for {string}", async (slug: string) => {
  await stub({
    path: `/${slug}`,
    status: 404,
    body: "<html>not found</html>",
    contentType: "text/html; charset=utf-8",
  });
});

Given("AeroLOPA is unavailable for {string}", async (slug: string) => {
  await stub({ path: `/${slug}`, status: 503, body: "service unavailable", contentType: "text/plain" });
});

Given("AeroLOPA serves an unreadable payload for {string}", async (slug: string) => {
  await stub({ path: `/${slug}`, status: 200, body: '2:["$","div",null,{"seats":{"01A":{"x":1,' });
});

Given("AeroLOPA is unavailable for the configuration index", async () => {
  await stub({ path: SITEMAP_PATH, status: 500, body: "boom", contentType: "text/plain" });
});

Then("AeroLOPA should have been asked for {string} {int} time(s)", async (slug: string, count: number) => {
  expect(await callsTo(`/${slug}`)).toBe(count);
});

Then("AeroLOPA should have been asked for the configuration index {int} time(s)", async (count: number) => {
  expect(await callsTo(SITEMAP_PATH)).toBe(count);
});

AfterAll(async () => {
  await restoreFixtures();
});
