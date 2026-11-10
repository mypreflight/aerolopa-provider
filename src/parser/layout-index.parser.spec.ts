import { parseLayoutIndex } from "./layout-index.parser";

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

describe("parseLayoutIndex", () => {
  it("keeps only layout slugs", () => {
    const layouts = parseLayoutIndex(sitemap);

    expect(layouts.map((entry) => entry.id)).toEqual([
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

  it("splits airline and aircraft codes in upper case", () => {
    const layouts = parseLayoutIndex(sitemap);

    expect(layouts[0]).toEqual({
      id: "lh-359",
      airlineIata: "LH",
      aircraftIata: "359",
      variant: null,
    });
  });

  it("keeps aircraft codes longer than three characters", () => {
    const layouts = parseLayoutIndex(sitemap);

    expect(layouts).toContainEqual({
      id: "aa-a321t",
      airlineIata: "AA",
      aircraftIata: "A321T",
      variant: null,
    });
  });

  it("captures the trailing discriminator as the variant", () => {
    const layouts = parseLayoutIndex(sitemap);

    expect(layouts).toContainEqual({
      id: "aa-a319s-2",
      airlineIata: "AA",
      aircraftIata: "A319S",
      variant: "2",
    });
    expect(layouts).toContainEqual({
      id: "af-77w-leisure",
      airlineIata: "AF",
      aircraftIata: "77W",
      variant: "leisure",
    });
    expect(layouts).toContainEqual({
      id: "ba-38a-u",
      airlineIata: "BA",
      aircraftIata: "38A",
      variant: "u",
    });
  });

  it("distinguishes every variant of an ambiguous airline and type pair", () => {
    const layouts = parseLayoutIndex(sitemap).filter(
      (entry) => entry.airlineIata === "LH" && entry.aircraftIata === "320",
    );

    expect(layouts.map((entry) => entry.variant)).toEqual(["1", "2"]);
  });
});
