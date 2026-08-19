import type { AerolopaClient } from "./client";
import { BadRequestError, ProviderError } from "./errors";
import type { AerolopaConfiguration, AerolopaSeatMap } from "./types";

export type HandlerParams = {
  op?: string;
  slug?: string;
  airline?: string;
  aircraft?: string;
  includeSeatMaps?: string | boolean;
};

export type HandlerResponse = {
  statusCode: number;
  body: unknown;
};

export type ResolveResult = {
  airlineIata: string;
  aircraftIata: string;
  candidateCount: number;
  ambiguous: boolean;
  candidates: string[];
  seatMaps: AerolopaSeatMap[];
};

const OPERATIONS = ["seatmap", "resolve", "configurations"] as const;

type Operation = (typeof OPERATIONS)[number];

function isTruthy(value: string | boolean | undefined): boolean {
  return value === true || value === "true" || value === "1";
}

function inferOperation(params: HandlerParams): Operation {
  if (params.op) {
    if (!OPERATIONS.includes(params.op as Operation)) {
      throw new BadRequestError(`Unknown operation "${params.op}". Expected one of ${OPERATIONS.join(", ")}.`);
    }
    return params.op as Operation;
  }

  if (params.slug) {
    return "seatmap";
  }

  if (params.airline || params.aircraft) {
    return "resolve";
  }

  throw new BadRequestError("Provide slug, or airline and aircraft, or op=configurations.");
}

async function seatMapOperation(client: AerolopaClient, params: HandlerParams): Promise<HandlerResponse> {
  if (!params.slug) {
    throw new BadRequestError("Parameter slug is required for op=seatmap.");
  }

  const seatMap = await client.getSeatMap(params.slug);

  return { statusCode: 200, body: { seatMap } };
}

async function resolveOperation(client: AerolopaClient, params: HandlerParams): Promise<HandlerResponse> {
  if (!params.airline || !params.aircraft) {
    throw new BadRequestError("Parameters airline and aircraft are required for op=resolve.");
  }

  const candidates = await client.findConfigurations(params.airline, params.aircraft);
  const seatMaps = isTruthy(params.includeSeatMaps) ? await collectSeatMaps(client, candidates) : [];

  const result: ResolveResult = {
    airlineIata: params.airline.toUpperCase(),
    aircraftIata: params.aircraft.toUpperCase(),
    candidateCount: candidates.length,
    ambiguous: candidates.length > 1,
    candidates: candidates.map((candidate) => candidate.slug),
    seatMaps,
  };

  return { statusCode: 200, body: result };
}

async function collectSeatMaps(
  client: AerolopaClient,
  candidates: AerolopaConfiguration[],
): Promise<AerolopaSeatMap[]> {
  const seatMaps: AerolopaSeatMap[] = [];

  for (const candidate of candidates) {
    seatMaps.push(await client.getSeatMap(candidate.slug));
  }

  return seatMaps;
}

async function configurationsOperation(client: AerolopaClient): Promise<HandlerResponse> {
  const configurations = await client.listConfigurations();

  return {
    statusCode: 200,
    body: { count: configurations.length, configurations },
  };
}

export async function handleRequest(client: AerolopaClient, params: HandlerParams): Promise<HandlerResponse> {
  try {
    switch (inferOperation(params)) {
      case "seatmap":
        return await seatMapOperation(client, params);
      case "resolve":
        return await resolveOperation(client, params);
      case "configurations":
        return await configurationsOperation(client);
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      return {
        statusCode: error.status,
        body: {
          error: {
            code: error.code,
            message: error.message,
            status: error.status,
          },
        },
      };
    }

    return {
      statusCode: 500,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "Seat map lookup failed.",
          status: 500,
        },
      },
    };
  }
}
