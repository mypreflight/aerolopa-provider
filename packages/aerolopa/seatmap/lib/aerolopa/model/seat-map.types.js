"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformSeat = transformSeat;
exports.transformSeatMap = transformSeatMap;
function transformComment(input) {
    return {
        slug: input.slug,
        comment: input.comment,
        sentiment: input.sentiment,
        severity: input.severity,
    };
}
function transformSeat(designator, input) {
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
function transformCabin(input) {
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
function transformSeatMap(input) {
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
        seats: Object.entries(input.seats).map(([designator, seat]) => transformSeat(designator, seat)),
    };
}
//# sourceMappingURL=seat-map.types.js.map