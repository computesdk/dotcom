import type { APIRoute } from "astro";
import { fetchLatestResults } from "../../../utils/benchmark-data";
import { generateLeaderboardOgImage } from "../../../utils/og-image";

export const GET: APIRoute = async () => {
  // Only fetch latest to get the timestamp
  const results = await fetchLatestResults("sequential_tti");
  const timestamp =
    results.length > 0
      ? new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })
      : "N/A";

  const png = await generateLeaderboardOgImage({ timestamp });
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
