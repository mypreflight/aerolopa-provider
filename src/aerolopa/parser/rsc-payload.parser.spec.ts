import { decodeRscPayload, extractSeatMapRecord } from './rsc-payload.parser';

const seatMapRecord = {
  aircraft_code: 'lh-359',
  airline_iata: 'LH',
  iata_code: '359',
  standard_iata: '359',
  aircraft_type: 'Airbus A350-941',
  aircraft_type_displayed: 'Airbus A350-900',
  aircraft_manufacturer: 'Airbus',
  haul_type: 'Long Haul',
  is_dual_deck: false,
  total_seats: 2,
  last_updated: '2025-08-16',
  seat_counts: { business: 1, economy: 1, total: 2 },
  cabins: [{ cabin_type: 'J', cabin_class: 'Business seats', num_seats: 1 }],
  viewBox: { width: 800, height: 4521 },
  image_url_cdn: 'https://cdn.example/lh-359.webp',
  image_url_neutral_cdn: 'https://cdn.example/lh-359.neutral.webp',
  svg_url: 'https://maptool.example/lh-359/svg',
  seat_rects_url: 'https://maptool.example/lh-359/seat-rects',
  seats: {
    '01A': {
      x: 185.8,
      y: 754.5,
      w: 41.6,
      h: 60.3,
      rot: -13.1,
      reverse: false,
      rating: null,
      color: '',
      score: null,
      comments: [],
      seat_product: null,
      seat_product_name: null,
      cabin: 'business',
      blocked: false,
      crew_rest: false,
      bookable: true,
      window: { status: 'great', count: 1, side: 'left' },
    },
    '30A': {
      x: 177.5,
      y: 3318.3,
      w: 36.6,
      h: 52.2,
      rot: 0,
      reverse: false,
      rating: 'yellow',
      color: '#f0c030',
      score: null,
      comments: [
        {
          slug: 'misaligned_window',
          comment: 'Window set behind the seat — restricted view',
          sentiment: 'bad',
          severity: 'moderate',
          score_override: null,
        },
      ],
      seat_product: null,
      seat_product_name: null,
      cabin: 'economy',
      blocked: false,
      crew_rest: false,
      bookable: true,
      window: { status: 'poor', count: 1, side: 'left' },
    },
  },
};

function asRscChunks(record: unknown, chunkCount: number): string {
  const serialized = `2:["$","div",null,{"aircraft":${JSON.stringify(record)}}]`;
  const size = Math.ceil(serialized.length / chunkCount);
  const chunks: string[] = [];

  for (let index = 0; index < serialized.length; index += size) {
    const slice = serialized.slice(index, index + size);
    chunks.push(`self.__next_f.push([1,${JSON.stringify(slice)}])`);
  }

  return `<html><script>${chunks.join('</script><script>')}</script></html>`;
}

describe('decodeRscPayload', () => {
  it('returns the raw body when it is not an HTML-embedded payload', () => {
    const raw = '2:{"seats":{}}';

    expect(decodeRscPayload(raw)).toBe(raw);
  });

  it('joins payload split across multiple push chunks', () => {
    const html = asRscChunks(seatMapRecord, 5);

    const decoded = decodeRscPayload(html);

    expect(decoded).toContain('"aircraft_code":"lh-359"');
    expect(decoded).toContain('"seats":{');
  });
});

describe('extractSeatMapRecord', () => {
  it('carves the seat map record out of a decoded payload', () => {
    const decoded = decodeRscPayload(asRscChunks(seatMapRecord, 7));

    const record = extractSeatMapRecord(decoded);

    expect(record).not.toBeNull();
    expect(record?.aircraft_code).toBe('lh-359');
    expect(record?.viewBox).toEqual({ width: 800, height: 4521 });
    expect(Object.keys(record!.seats)).toEqual(['01A', '30A']);
  });

  it('carves correctly when sibling records precede the seat map', () => {
    const sibling = { aircraft_code: 'lh-333', total_seats: 255 };
    const payload = `1:${JSON.stringify(sibling)}\n2:${JSON.stringify({ aircraft: seatMapRecord })}`;

    const record = extractSeatMapRecord(payload);

    expect(record?.aircraft_code).toBe('lh-359');
  });

  it('is not confused by braces inside seat comments', () => {
    const withBraces = structuredClone(seatMapRecord);
    withBraces.seats['30A'].comments[0].comment = 'Bulkhead {row} — "tight" }{';
    const decoded = decodeRscPayload(asRscChunks(withBraces, 3));

    const record = extractSeatMapRecord(decoded);

    expect(record?.seats['30A'].comments[0].comment).toBe(
      'Bulkhead {row} — "tight" }{',
    );
  });

  it('returns null when the payload carries no seat map', () => {
    expect(extractSeatMapRecord('2:["$","div",null,{}]')).toBeNull();
  });

  it('returns null when the seat map record is truncated', () => {
    const decoded = decodeRscPayload(asRscChunks(seatMapRecord, 1));

    expect(extractSeatMapRecord(decoded.slice(0, 400))).toBeNull();
  });
});
