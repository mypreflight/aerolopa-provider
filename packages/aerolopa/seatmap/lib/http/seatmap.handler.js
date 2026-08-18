"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleRequest = handleRequest;
const aerolopa_error_1 = require("../aerolopa/model/aerolopa.error");
const OPERATIONS = ["seatmap", "resolve", "configurations"];
function isTruthy(value) {
    return value === true || value === "true" || value === "1";
}
function inferOperation(params) {
    if (params.op) {
        if (!OPERATIONS.includes(params.op)) {
            throw new aerolopa_error_1.BadRequestError(`Unknown operation "${params.op}". Expected one of ${OPERATIONS.join(", ")}.`);
        }
        return params.op;
    }
    if (params.slug) {
        return "seatmap";
    }
    if (params.airline || params.aircraft) {
        return "resolve";
    }
    throw new aerolopa_error_1.BadRequestError("Provide slug, or airline and aircraft, or op=configurations.");
}
async function seatMapOperation(client, params) {
    if (!params.slug) {
        throw new aerolopa_error_1.BadRequestError("Parameter slug is required for op=seatmap.");
    }
    const seatMap = await client.getSeatMap(params.slug);
    return { statusCode: 200, body: { seatMap } };
}
async function resolveOperation(client, params) {
    if (!params.airline || !params.aircraft) {
        throw new aerolopa_error_1.BadRequestError("Parameters airline and aircraft are required for op=resolve.");
    }
    const candidates = await client.findConfigurations(params.airline, params.aircraft);
    const seatMaps = isTruthy(params.includeSeatMaps) ? await collectSeatMaps(client, candidates) : [];
    const result = {
        airlineIata: params.airline.toUpperCase(),
        aircraftIata: params.aircraft.toUpperCase(),
        candidateCount: candidates.length,
        ambiguous: candidates.length > 1,
        candidates: candidates.map((candidate) => candidate.slug),
        seatMaps,
    };
    return { statusCode: 200, body: result };
}
async function collectSeatMaps(client, candidates) {
    const seatMaps = [];
    for (const candidate of candidates) {
        seatMaps.push(await client.getSeatMap(candidate.slug));
    }
    return seatMaps;
}
async function configurationsOperation(client) {
    const configurations = await client.listConfigurations();
    return {
        statusCode: 200,
        body: { count: configurations.length, configurations },
    };
}
async function handleRequest(client, params) {
    try {
        switch (inferOperation(params)) {
            case "seatmap":
                return await seatMapOperation(client, params);
            case "resolve":
                return await resolveOperation(client, params);
            case "configurations":
                return await configurationsOperation(client);
        }
    }
    catch (error) {
        if (error instanceof aerolopa_error_1.ProviderError) {
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
//# sourceMappingURL=seatmap.handler.js.map