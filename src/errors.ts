export abstract class ProviderError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends ProviderError {
  readonly status = 400;
  readonly code = "BAD_REQUEST";
}

export class SeatMapNotFoundError extends ProviderError {
  readonly status = 404;
  readonly code = "SEAT_MAP_NOT_FOUND";

  constructor(slug: string) {
    super(`Seat map for configuration ${slug} does not exist.`);
  }
}

export class AerolopaUnavailableError extends ProviderError {
  readonly status = 502;
  readonly code = "AEROLOPA_UNAVAILABLE";

  constructor() {
    super("AeroLOPA is unavailable.");
  }
}

export class SeatMapUnreadableError extends ProviderError {
  readonly status = 502;
  readonly code = "SEAT_MAP_UNREADABLE";

  constructor(slug: string) {
    super(`Seat map payload for configuration ${slug} could not be read.`);
  }
}
