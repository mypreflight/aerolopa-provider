"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatMapUnreadableError = exports.AerolopaUnavailableError = exports.SeatMapNotFoundError = exports.BadRequestError = exports.ProviderError = void 0;
class ProviderError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}
exports.ProviderError = ProviderError;
class BadRequestError extends ProviderError {
    status = 400;
    code = "BAD_REQUEST";
}
exports.BadRequestError = BadRequestError;
class SeatMapNotFoundError extends ProviderError {
    status = 404;
    code = "SEAT_MAP_NOT_FOUND";
    constructor(slug) {
        super(`Seat map for configuration ${slug} does not exist.`);
    }
}
exports.SeatMapNotFoundError = SeatMapNotFoundError;
class AerolopaUnavailableError extends ProviderError {
    status = 502;
    code = "AEROLOPA_UNAVAILABLE";
    constructor() {
        super("AeroLOPA is unavailable.");
    }
}
exports.AerolopaUnavailableError = AerolopaUnavailableError;
class SeatMapUnreadableError extends ProviderError {
    status = 502;
    code = "SEAT_MAP_UNREADABLE";
    constructor(slug) {
        super(`Seat map payload for configuration ${slug} could not be read.`);
    }
}
exports.SeatMapUnreadableError = SeatMapUnreadableError;
//# sourceMappingURL=aerolopa.error.js.map