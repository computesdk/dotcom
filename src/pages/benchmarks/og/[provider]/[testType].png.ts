import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestResults } from "../../../../utils/benchmark-data";
import { generateProviderOgImage } from "../../../../utils/og-image";

const TEST_TYPES_MAP: Record<
  string,
  { key: "sequential_tti" | "burst_tti" | "staggered_tti"; label: string }
> = {
  "sequential-tti": { key: "sequential_tti", label: "Sequential TTI" },
  "burst-tti": { key: "burst_tti", label: "Burst TTI" },
  "staggered-tti": { key: "staggered_tti", label: "Staggered TTI" },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [sequential, burst, staggered] = await Promise.all([
    fetchLatestResults("sequential_tti"),
    fetchLatestResults("burst_tti"),
    fetchLatestResults("staggered_tti"),
  ]);

  const timestamp = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const testTypeSlugs = Object.keys(TEST_TYPES_MAP);

  return sequential.flatMap((r) =>
    testTypeSlugs.map((testType) => {
      const { key, label } = TEST_TYPES_MAP[testType];
      const source =
        key === "sequential_tti"
          ? sequential
          : key === "burst_tti"
            ? burst
            : staggered;
      const match = source.find((p) => p.provider === r.provider);
      const stats = match
        ? {
            median: match.summary.ttiMs.median,
            p95: match.summary.ttiMs.p95,
            p99: match.summary.ttiMs.p99,
          }
        : { median: 0, p95: 0, p99: 0 };

      const findStats = (results: typeof sequential) => {
        const m = results.find((p) => p.provider === r.provider);
        return m
          ? { median: m.summary.ttiMs.median, p95: m.summary.ttiMs.p95, p99: m.summary.ttiMs.p99 }
          : { median: 0, p95: 0, p99: 0 };
      };

      return {
        params: { provider: r.provider, testType },
        props: {
          provider: r.provider,
          sequential: findStats(sequential),
          burst: findStats(burst),
          staggered: findStats(staggered),
          timestamp,
          testTypeLabel: label,
          stats,
        },
      };
    }),
  );
};

export const GET: APIRoute = async ({ props }) => {
  const png = await generateProviderOgImage(props as any);
  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
