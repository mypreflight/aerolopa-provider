export function sitemapXml(slugs: string[]): string {
  const entries = [
    "https://www.aerolopa.com",
    "https://www.aerolopa.com/airlines",
    ...slugs.map((slug) => `https://www.aerolopa.com/${slug}`),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => `<url><loc>${entry}</loc></url>`),
    "</urlset>",
  ].join("\n");
}
