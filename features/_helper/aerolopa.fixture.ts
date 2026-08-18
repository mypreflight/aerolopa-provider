type SeatOverrides = Partial<{
  rating: string | null;
  cabin: string;
  bookable: boolean;
  blocked: boolean;
  crewRest: boolean;
  window: { status: string; count: number; side: string } | null;
  comments: unknown[];
}>;

export function seat(designator: string, overrides: SeatOverrides = {}) {
  return {
    designator,
    x: 100,
    y: 200,
    w: 40,
    h: 60,
    rot: 0,
    reverse: false,
    rating: overrides.rating ?? null,
    color: overrides.rating === "red" ? "#dc3c3c" : "",
    score: null,
    comments: overrides.comments ?? [],
    seat_product: null,
    seat_product_name: null,
    cabin: overrides.cabin ?? "economy",
    blocked: overrides.blocked ?? false,
    crew_rest: overrides.crewRest ?? false,
    bookable: overrides.bookable ?? true,
    window: overrides.window === undefined ? { status: "great", count: 1, side: "left" } : overrides.window,
  };
}

export function seatMapRecord(slug: string, seats: Record<string, unknown>) {
  const [airline, type] = slug.split("-");

  return {
    aircraft_code: slug,
    airline_iata: airline.toUpperCase(),
    iata_code: type.toUpperCase(),
    standard_iata: type.toUpperCase(),
    aircraft_type: "Airbus A320-271N",
    aircraft_type_displayed: "Airbus A320neo",
    aircraft_manufacturer: "Airbus",
    haul_type: "Short Haul",
    is_dual_deck: false,
    total_seats: Object.keys(seats).length,
    last_updated: "2025-08-23",
    seat_counts: {
      first: 0,
      business: 0,
      premium_economy: 0,
      economy: Object.keys(seats).length,
      total: Object.keys(seats).length,
    },
    cabins: [
      {
        cabin_type: "M",
        cabin_class: "Economy seats",
        num_seats: Object.keys(seats).length,
        rows: "1 to 2",
        pitch: '30"',
        width: '18"',
        recline: '2"',
        seat_description: "Slimline seats",
      },
    ],
    viewBox: { width: 800, height: 3970 },
    image_url_cdn: `https://cdn.example/${slug}.webp`,
    image_url_neutral_cdn: `https://cdn.example/${slug}.neutral.webp`,
    svg_url: `https://maptool.example/${slug}/svg`,
    seat_rects_url: `https://maptool.example/${slug}/seat-rects`,
    seats,
  };
}

export function rscPayload(record: unknown): string {
  return `2:["$","div",null,${JSON.stringify({ aircraft: record })}]`;
}

export function htmlPayload(record: unknown): string {
  const serialized = rscPayload(record);
  const size = Math.ceil(serialized.length / 3);
  const chunks: string[] = [];

  for (let index = 0; index < serialized.length; index += size) {
    const slice = serialized.slice(index, index + size);
    chunks.push(`self.__next_f.push([1,${JSON.stringify(slice)}])`);
  }

  return `<html><script>${chunks.join("</script><script>")}</script></html>`;
}

export function sitemapXml(slugs: string[]): string {
  const entries = [
    "https://www.aerolopa.com",
    "https://www.aerolopa.com/airlines",
    ...slugs.map((slug) => `https://www.aerolopa.com/${slug}`),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => `<url><loc>${entry}</loc></url>`),
    "</urlset>",
  ].join("\n");
}

export function defaultSeats(): Record<string, unknown> {
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
