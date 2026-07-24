import type { APIRoute } from "astro";
import { fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateLeaderboardOgImage } from "../../../../utils/og-image";

export const GET: APIRoute = async () => {
  const timestamp = await fetchLatestTimestamp("browser");

  const png = await generateLeaderboardOgImage({
    timestamp,
    titleLines: ["Browser", "Benchmarks"],
    subtitle: "Independently verified headless browser benchmarks run weekly across providers.",
  });
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
