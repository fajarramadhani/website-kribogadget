import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { listCatalog } from "@/lib/data/public";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { units } = await listCatalog({ page: 1 });
  return [
    { url: env.siteUrl, changeFrequency: "weekly" },
    { url: `${env.siteUrl}/katalog`, changeFrequency: "daily" },
    ...units.map((u) => ({
      url: `${env.siteUrl}/katalog/${u.slug}`,
      lastModified: u.updated_at,
    })),
  ];
}
