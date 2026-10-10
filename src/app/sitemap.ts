import type { MetadataRoute } from "next";

const SITE_URL = "https://captainx.vn";

// Only the live dashboard is indexable for now. The feature pages are
// `noindex` placeholders (see their per-page metadata) until built out, so
// they're intentionally omitted here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
