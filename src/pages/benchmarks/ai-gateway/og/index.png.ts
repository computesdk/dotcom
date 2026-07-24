import type { APIRoute } from "astro";
import { fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateLeaderboardOgImage } from "../../../../utils/og-image";

export const GET: APIRoute = async () => {
  const timestamp = await fetchLatestTimestamp("ai-gateway");

  const png = await generateLeaderboardOgImage({
    timestamp,
    titleLines: ["AI Gateway", "Benchmarks"],
    subtitle: "Independently verified AI gateway benchmarks run weekly across providers.",
  });
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
