import {
  type AerolopaSeatApiInput,
  type AerolopaSeatMapApiInput,
  transformSeat,
  transformSeatMap,
} from "./seat-map.types";

const seat: AerolopaSeatApiInput = {
  x: 177.5,
  y: 3318.3,
  w: 36.6,
  h: 52.2,
  rot: -13.1,
  reverse: true,
  rating: "yellow",
  color: "#f0c030",
  score: null,
  comments: [
    {
      slug: "bassinet_mount",
      comment: "Bassinet position at this seat",
      sentiment: "bad",
      severity: null,
      score_override: null,
    },
  ],
  seat_product: null,
  seat_product_name: null,
  cabin: "economy",
  blocked: false,
  crew_rest: false,
  bookable: true,
  window: { status: "average", count: 1, side: "left" },
};

const seatMap: AerolopaSeatMapApiInput = {
  aircraft_code: "lh-32n",
  airline_iata: "LH",
  iata_code: "32N",
  standard_iata: "32N",
  aircraft_type: "Airbus A320-271N",
  aircraft_type_displayed: "Airbus A320neo",
  aircraft_manufacturer: "Airbus",
  haul_type: "Short Haul",
  is_dual_deck: false,
  total_seats: 1,
  last_updated: "2025-08-23",
  seat_counts: { business: 48, economy: 132, total: 180 },
  cabins: [{ cabin_type: "M", cabin_class: "Economy seats", num_seats: 180 }],
  viewBox: { width: 800, height: 3970 },
  image_url_cdn: "https://cdn.example/lh-32n.webp",
  image_url_neutral_cdn: "https://cdn.example/lh-32n.neutral.webp",
  svg_url: "https://maptool.example/lh-32n/svg",
  seat_rects_url: "https://maptool.example/lh-32n/seat-rects",
  seats: { "30A": seat },
};

describe("transformSeat", () => {
  it("maps payload keys onto the domain shape", () => {
    expect(transformSeat("30A", seat)).toEqual({
      designator: "30A",
      x: 177.5,
      y: 3318.3,
      width: 36.6,
      height: 52.2,
      rotation: -13.1,
      reversed: true,
      cabin: "economy",
      rating: "yellow",
      color: "#f0c030",
      bookable: true,
      blocked: false,
      crewRest: false,
      windowStatus: "average",
      seatProduct: null,
      comments: [
        {
          slug: "bassinet_mount",
          comment: "Bassinet position at this seat",
          sentiment: "bad",
          severity: null,
        },
      ],
    });
  });

  it("reports a missing window as no window status", () => {
    expect(transformSeat("30B", { ...seat, window: null }).windowStatus).toBeNull();
  });

  it("prefers the seat product name over its identifier", () => {
    const named = {
      ...seat,
      seat_product: "zim01",
      seat_product_name: "ZIM Aero",
    };

    expect(transformSeat("01A", named).seatProduct).toBe("ZIM Aero");
  });

  it("tolerates a seat carrying no comments", () => {
    const bare = { ...seat, comments: undefined as never };

    expect(transformSeat("30C", bare).comments).toEqual([]);
  });
});

describe("transformSeatMap", () => {
  it("flattens the seat dictionary and keeps the canvas", () => {
    const map = transformSeatMap(seatMap);

    expect(map.slug).toBe("lh-32n");
    expect(map.canvas).toEqual({ width: 800, height: 3970 });
    expect(map.seats.map((entry) => entry.designator)).toEqual(["30A"]);
    expect(map.assets.seatRects).toBe("https://maptool.example/lh-32n/seat-rects");
  });

  it("keeps the commercial seat split even when one physical cabin is listed", () => {
    const map = transformSeatMap(seatMap);

    expect(map.cabins).toHaveLength(1);
    expect(map.seatCounts).toEqual({ business: 48, economy: 132, total: 180 });
  });
});
