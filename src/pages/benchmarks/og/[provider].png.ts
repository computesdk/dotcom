import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestResults } from "../../../utils/benchmark-data";
import { generateProviderOgImage } from "../../../utils/og-image";

const TEST_TYPES = ["sequential_tti", "burst_tti", "staggered_tti"] as const;

export const getStaticPaths: GetStaticPaths = async () => {
  const [sequential, burst, staggered] = await Promise.all(
    TEST_TYPES.map((t) => fetchLatestResults(t)),
  );

  const timestamp = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Use sequential results as the canonical provider list
  return sequential.map((r) => {
    const findStats = (results: typeof sequential) => {
      const match = results.find((p) => p.provider === r.provider);
      return match
        ? {
            median: match.summary.ttiMs.median,
            p95: match.summary.ttiMs.p95,
            p99: match.summary.ttiMs.p99,
          }
        : { median: 0, p95: 0, p99: 0 };
    };

    return {
      params: { provider: r.provider },
      props: {
        provider: r.provider,
        sequential: findStats(sequential),
        burst: findStats(burst),
        staggered: findStats(staggered),
        timestamp,
      },
    };
  });
};

export const GET: APIRoute = async ({ props }) => {
  const png = await generateProviderOgImage(props as any);
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
