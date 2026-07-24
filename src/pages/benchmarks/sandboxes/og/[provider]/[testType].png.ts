import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestResults, fetchLatestTimestamp } from "../../../../../utils/benchmark-data";
import { generateProviderOgImage, formatMs, type StatItem } from "../../../../../utils/og-image";
import { logomarkSlug } from "../../../../../components/benchmarkConstants";

const TEST_TYPES_MAP: Record<
  string,
  { key: "sequential_tti" | "burst_tti" | "staggered_tti"; label: string }
> = {
  "sequential-tti": { key: "sequential_tti", label: "Sequential TTI" },
  "burst-tti": { key: "burst_tti", label: "Burst TTI" },
  "staggered-tti": { key: "staggered_tti", label: "Staggered TTI" },
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [sequential, burst, staggered, timestamp] = await Promise.all([
    fetchLatestResults("sequential_tti"),
    fetchLatestResults("burst_tti"),
    fetchLatestResults("staggered_tti"),
    fetchLatestTimestamp("sequential_tti"),
  ]);

  const sourceByKey = { sequential_tti: sequential, burst_tti: burst, staggered_tti: staggered };
  const testTypeSlugs = Object.keys(TEST_TYPES_MAP);

  return sequential.flatMap((r) =>
    testTypeSlugs.map((testType) => {
      const { key, label } = TEST_TYPES_MAP[testType];
      const match = sourceByKey[key].find((p) => p.provider === r.provider);

      const metrics: StatItem[] = [
        { label: "Median", value: formatMs(match?.summary.ttiMs.median ?? 0) },
        { label: "P95", value: formatMs(match?.summary.ttiMs.p95 ?? 0) },
        { label: "P99", value: formatMs(match?.summary.ttiMs.p99 ?? 0) },
      ];

      return {
        params: { provider: r.provider, testType },
        props: {
          provider: r.provider,
          timestamp,
          testTypeLabel: label,
          metrics,
        },
      };
    }),
  );
};

export const GET: APIRoute = async ({ props }) => {
  const { provider, timestamp, testTypeLabel, metrics } = props as {
    provider: string;
    timestamp: string;
    testTypeLabel: string;
    metrics: StatItem[];
  };
  const png = await generateProviderOgImage({
    provider,
    categoryLabel: "Sandbox Benchmarks",
    timestamp,
    logoSrc: `/benchmarks/normal-${logomarkSlug(provider)}-dark.svg`,
    testTypeLabel,
    metrics,
  });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
