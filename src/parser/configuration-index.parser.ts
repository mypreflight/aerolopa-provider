import type { AerolopaConfiguration } from "../types";

const LOCATION_PATTERN = /<loc>([^<]+)<\/loc>/g;

const CONFIGURATION_SLUG_PATTERN = /^([a-z0-9]{2})-([a-z0-9]{2,6})(?:-.+)?$/;

export function parseConfigurationIndex(sitemap: string): AerolopaConfiguration[] {
  const configurations: AerolopaConfiguration[] = [];

  for (const match of sitemap.matchAll(LOCATION_PATTERN)) {
    const slug = match[1].replace(/^https?:\/\/[^/]+\/?/, "");
    const parts = CONFIGURATION_SLUG_PATTERN.exec(slug);

    if (!parts) {
      continue;
    }

    configurations.push({
      slug,
      airlineIata: parts[1].toUpperCase(),
      aircraftIata: parts[2].toUpperCase(),
    });
  }

  return configurations;
}
