import type { AerolopaSeatMapApiInput } from "../types";

const CHUNK_PATTERN = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;

const SEAT_MAP_MARKER = '"seats":{';

export function decodeRscPayload(raw: string): string {
  if (!raw.includes("self.__next_f.push")) {
    return raw;
  }

  const chunks: string[] = [];

  for (const match of raw.matchAll(CHUNK_PATTERN)) {
    chunks.push(JSON.parse(match[1]) as string);
  }

  return chunks.join("");
}

function findObjectStart(payload: string, from: number): number {
  let depth = 0;

  for (let index = from; index >= 0; index--) {
    const character = payload[index];

    if (character === "}") {
      depth++;
      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        return index;
      }
      depth--;
    }
  }

  return -1;
}

function findObjectEnd(payload: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < payload.length; index++) {
    const character = payload[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

export function extractSeatMapRecord(payload: string): AerolopaSeatMapApiInput | null {
  const marker = payload.indexOf(SEAT_MAP_MARKER);
  if (marker < 0) {
    return null;
  }

  const start = findObjectStart(payload, marker);
  if (start < 0) {
    return null;
  }

  const end = findObjectEnd(payload, start);
  if (end < 0) {
    return null;
  }

  try {
    return JSON.parse(payload.slice(start, end + 1)) as AerolopaSeatMapApiInput;
  } catch {
    return null;
  }
}
