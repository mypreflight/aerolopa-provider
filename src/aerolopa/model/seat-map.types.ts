export type SeatRating = 'green' | 'yellow' | 'red';

export type CabinClass = 'first' | 'business' | 'premium_economy' | 'economy';

export type WindowStatus = 'great' | 'average' | 'poor' | 'none';

export type CommentSentiment = 'good' | 'bad' | 'neutral';

export type CommentSeverity = 'minor' | 'moderate' | 'major';

export type AerolopaSeatCommentApiInput = {
  slug: string;
  comment: string;
  sentiment: CommentSentiment;
  severity: CommentSeverity | null;
  score_override: number | null;
};

export type AerolopaSeatApiInput = {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  reverse: boolean;
  rating: SeatRating | null;
  color: string;
  score: number | null;
  comments: AerolopaSeatCommentApiInput[];
  seat_product: string | null;
  seat_product_name: string | null;
  cabin: CabinClass;
  blocked: boolean;
  crew_rest: boolean;
  bookable: boolean;
  window: {
    status: WindowStatus;
    count: number;
    side: 'left' | 'right';
  } | null;
};

export type AerolopaCabinApiInput = {
  cabin_type: string;
  cabin_class: string;
  num_seats: number;
  rows?: string;
  pitch?: string;
  width?: string;
  recline?: string;
  seat_description?: string;
  product_tier?: string;
};

export type AerolopaSeatMapApiInput = {
  aircraft_code: string;
  airline_iata: string;
  iata_code: string;
  standard_iata: string;
  aircraft_type: string;
  aircraft_type_displayed: string;
  aircraft_manufacturer: string;
  haul_type: string;
  is_dual_deck: boolean;
  total_seats: number;
  last_updated: string;
  seat_counts: Record<string, number>;
  cabins: AerolopaCabinApiInput[];
  viewBox: { width: number; height: number };
  image_url_cdn: string;
  image_url_neutral_cdn: string;
  svg_url: string;
  seat_rects_url: string;
  seats: Record<string, AerolopaSeatApiInput>;
};

export type AerolopaSeatComment = {
  slug: string;
  comment: string;
  sentiment: CommentSentiment;
  severity: CommentSeverity | null;
};

export type AerolopaSeat = {
  designator: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  reversed: boolean;
  cabin: CabinClass;
  rating: SeatRating | null;
  color: string;
  bookable: boolean;
  blocked: boolean;
  crewRest: boolean;
  windowStatus: WindowStatus | null;
  seatProduct: string | null;
  comments: AerolopaSeatComment[];
};

export type AerolopaCabin = {
  code: string;
  name: string;
  seatCount: number;
  rows: string | null;
  pitch: string | null;
  width: string | null;
  recline: string | null;
  description: string | null;
};

export type AerolopaAssets = {
  image: string;
  imageNeutral: string;
  svg: string;
  seatRects: string;
};

export type AerolopaSeatMap = {
  slug: string;
  airlineIata: string;
  aircraftIata: string;
  aircraftType: string;
  aircraftTypeDisplayed: string;
  manufacturer: string;
  haulType: string;
  isDualDeck: boolean;
  totalSeats: number;
  lastUpdated: string;
  seatCounts: Record<string, number>;
  canvas: { width: number; height: number };
  cabins: AerolopaCabin[];
  assets: AerolopaAssets;
  seats: AerolopaSeat[];
};

export type AerolopaConfiguration = {
  slug: string;
  airlineIata: string;
  aircraftIata: string;
};

function transformComment(
  input: AerolopaSeatCommentApiInput,
): AerolopaSeatComment {
  return {
    slug: input.slug,
    comment: input.comment,
    sentiment: input.sentiment,
    severity: input.severity,
  };
}

export function transformSeat(
  designator: string,
  input: AerolopaSeatApiInput,
): AerolopaSeat {
  return {
    designator,
    x: input.x,
    y: input.y,
    width: input.w,
    height: input.h,
    rotation: input.rot,
    reversed: input.reverse,
    cabin: input.cabin,
    rating: input.rating,
    color: input.color,
    bookable: input.bookable,
    blocked: input.blocked,
    crewRest: input.crew_rest,
    windowStatus: input.window?.status ?? null,
    seatProduct: input.seat_product_name ?? input.seat_product,
    comments: (input.comments ?? []).map(transformComment),
  };
}

function transformCabin(input: AerolopaCabinApiInput): AerolopaCabin {
  return {
    code: input.cabin_type,
    name: input.cabin_class,
    seatCount: input.num_seats,
    rows: input.rows ?? null,
    pitch: input.pitch ?? null,
    width: input.width ?? null,
    recline: input.recline ?? null,
    description: input.seat_description ?? null,
  };
}

export function transformSeatMap(
  input: AerolopaSeatMapApiInput,
): AerolopaSeatMap {
  return {
    slug: input.aircraft_code,
    airlineIata: input.airline_iata,
    aircraftIata: input.iata_code,
    aircraftType: input.aircraft_type,
    aircraftTypeDisplayed: input.aircraft_type_displayed,
    manufacturer: input.aircraft_manufacturer,
    haulType: input.haul_type,
    isDualDeck: input.is_dual_deck,
    totalSeats: input.total_seats,
    lastUpdated: input.last_updated,
    seatCounts: input.seat_counts,
    canvas: { width: input.viewBox.width, height: input.viewBox.height },
    cabins: (input.cabins ?? []).map(transformCabin),
    assets: {
      image: input.image_url_cdn,
      imageNeutral: input.image_url_neutral_cdn,
      svg: input.svg_url,
      seatRects: input.seat_rects_url,
    },
    seats: Object.entries(input.seats).map(([designator, seat]) =>
      transformSeat(designator, seat),
    ),
  };
}
