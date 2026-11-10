import { parseConfigurationIndex } from "./configuration-index.parser";

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://www.aerolopa.com</loc></url>
<url><loc>https://www.aerolopa.com/airlines</loc></url>
<url><loc>https://www.aerolopa.com/aircraft/airbus-a350-900</loc></url>
<url><loc>https://www.aerolopa.com/lh-359</loc></url>
<url><loc>https://www.aerolopa.com/lh-320-1</loc></url>
<url><loc>https://www.aerolopa.com/lh-320-2</loc></url>
<url><loc>https://www.aerolopa.com/ba-38a-u</loc></url>
<url><loc>https://www.aerolopa.com/af-77w-leisure</loc></url>
<url><loc>https://www.aerolopa.com/aa-a321t</loc></url>
<url><loc>https://www.aerolopa.com/aa-a319s-2</loc></url>
<url><loc>https://www.aerolopa.com/ke-739er</loc></url>
<url><loc>https://www.aerolopa.com/seatguru-alternative</loc></url>
<url><loc>https://www.aerolopa.com/best-business-class/emirates</loc></url>
</urlset>`;

describe("parseConfigurationIndex", () => {
  it("keeps only configuration slugs", () => {
    const configurations = parseConfigurationIndex(sitemap);

    expect(configurations.map((entry) => entry.slug)).toEqual([
      "lh-359",
      "lh-320-1",
      "lh-320-2",
      "ba-38a-u",
      "af-77w-leisure",
      "aa-a321t",
      "aa-a319s-2",
      "ke-739er",
    ]);
  });

  it("keeps aircraft codes longer than three characters", () => {
    const configurations = parseConfigurationIndex(sitemap);

    expect(configurations).toContainEqual({
      slug: "aa-a321t",
      airlineIata: "AA",
      aircraftIata: "A321T",
    });
    expect(configurations).toContainEqual({
      slug: "aa-a319s-2",
      airlineIata: "AA",
      aircraftIata: "A319S",
    });
  });

  it("splits airline and aircraft codes in upper case", () => {
    const configurations = parseConfigurationIndex(sitemap);

    expect(configurations[0]).toEqual({
      slug: "lh-359",
      airlineIata: "LH",
      aircraftIata: "359",
    });
    expect(configurations[4]).toEqual({
      slug: "af-77w-leisure",
      airlineIata: "AF",
      aircraftIata: "77W",
    });
  });

  it("retains every variant of an ambiguous airline and type pair", () => {
    const configurations = parseConfigurationIndex(sitemap).filter(
      (entry) => entry.airlineIata === "LH" && entry.aircraftIata === "320",
    );

    expect(configurations.map((entry) => entry.slug)).toEqual(["lh-320-1", "lh-320-2"]);
  });
});
