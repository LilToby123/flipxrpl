import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

const entries = [
  { path: "/", priority: "1.0", changefreq: "weekly" as const },
  { path: "/games/coinflip", priority: "0.9", changefreq: "weekly" as const },
  { path: "/games/dice", priority: "0.7", changefreq: "weekly" as const },
  { path: "/games/crash", priority: "0.7", changefreq: "weekly" as const },
  { path: "/games/lottery", priority: "0.7", changefreq: "weekly" as const },
  { path: "/tools", priority: "0.6", changefreq: "monthly" as const },
  { path: "/tools/explorer", priority: "0.5", changefreq: "monthly" as const },
  { path: "/tools/send", priority: "0.5", changefreq: "monthly" as const },
  { path: "/tools/trustlines", priority: "0.5", changefreq: "monthly" as const },
  { path: "/auth", priority: "0.4", changefreq: "monthly" as const },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
        );
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
