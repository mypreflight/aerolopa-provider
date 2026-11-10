import type { AerolopaLayout } from "../types";

const LOCATION_PATTERN = /<loc>([^<]+)<\/loc>/g;

const LAYOUT_SLUG_PATTERN = /^([a-z0-9]{2})-([a-z0-9]{2,6})(?:-(.+))?$/;

export function parseLayoutIndex(sitemap: string): AerolopaLayout[] {
  const layouts: AerolopaLayout[] = [];

  for (const match of sitemap.matchAll(LOCATION_PATTERN)) {
    const id = match[1].replace(/^https?:\/\/[^/]+\/?/, "");
    const parts = LAYOUT_SLUG_PATTERN.exec(id);

    if (!parts) {
      continue;
    }

    layouts.push({
      id,
      airlineIata: parts[1].toUpperCase(),
      aircraftIata: parts[2].toUpperCase(),
      variant: parts[3] ?? null,
    });
  }

  return layouts;
}
