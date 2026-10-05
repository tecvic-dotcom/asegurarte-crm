import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const hoy = new Date();
  return [
    { url: `${base}/`, lastModified: hoy, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tarjeta`, lastModified: hoy, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/gracias`, lastModified: hoy, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidad`, lastModified: hoy, changeFrequency: "yearly", priority: 0.2 },
  ];
}
