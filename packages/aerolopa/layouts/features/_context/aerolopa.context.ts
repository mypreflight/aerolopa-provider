import { AfterAll, Before, Given, Then } from "@cucumber/cucumber";
import expect from "expect";
import { resetClient } from "../../src/function";
import { sitemapXml } from "../_helper/aerolopa.fixture";
import { callsTo, reset, restoreFixtures, expect as stub } from "../_helper/mockserver";

const SITEMAP_PATH = "/sitemap.xml";

Before(async () => {
  await reset();
  resetClient();
});

Given("AeroLOPA publishes the layouts {string}", async (slugs: string) => {
  await stub({
    path: SITEMAP_PATH,
    status: 200,
    body: sitemapXml(slugs.split(",").map((slug) => slug.trim())),
    contentType: "application/xml; charset=utf-8",
  });
});

Given("AeroLOPA is unavailable for the layout index", async () => {
  await stub({ path: SITEMAP_PATH, status: 500, body: "boom", contentType: "text/plain" });
});

Then("AeroLOPA should have been asked for the layout index {int} time(s)", async (count: number) => {
  expect(await callsTo(SITEMAP_PATH)).toBe(count);
});

AfterAll(async () => {
  await restoreFixtures();
});
