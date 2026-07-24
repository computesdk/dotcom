import type { APIRoute } from "astro";
import { fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateLeaderboardOgImage } from "../../../../utils/og-image";

const FILE_SIZE = "10mb";

export const GET: APIRoute = async () => {
  const timestamp = await fetchLatestTimestamp(`storage/${FILE_SIZE}`);

  const png = await generateLeaderboardOgImage({
    timestamp,
    titleLines: ["Storage", "Benchmarks"],
    subtitle: "Independently verified object storage benchmarks run weekly across providers.",
  });
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
