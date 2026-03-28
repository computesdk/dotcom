import type { APIRoute } from "astro";
import { fetchLatestResults } from "../../../utils/benchmark-data";
import { generateLeaderboardOgImage } from "../../../utils/og-image";

export const GET: APIRoute = async () => {
  const results = await fetchLatestResults("sequential_tti");
  const providers = results.map((r) => ({
    provider: r.provider,
    median: r.summary.ttiMs.median,
  }));

  const png = await generateLeaderboardOgImage(providers);
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
