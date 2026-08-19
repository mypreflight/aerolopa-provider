export abstract class ProviderError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AerolopaUnavailableError extends ProviderError {
  readonly status = 502;
  readonly code = "AEROLOPA_UNAVAILABLE";

  constructor() {
    super("AeroLOPA is unavailable.");
  }
}
