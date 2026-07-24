import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestResults, fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateProviderOgImage, formatMs, type StatItem } from "../../../../utils/og-image";
import { logomarkSlug } from "../../../../components/benchmarkConstants";

type ProviderResults = Awaited<ReturnType<typeof fetchLatestResults>>;

export const getStaticPaths: GetStaticPaths = async () => {
  const [sequential, burst, staggered, timestamp] = await Promise.all([
    fetchLatestResults("sequential_tti"),
    fetchLatestResults("burst_tti"),
    fetchLatestResults("staggered_tti"),
    fetchLatestTimestamp("sequential_tti"),
  ]);

  const medianFor = (results: ProviderResults, provider: string) =>
    results.find((p) => p.provider === provider)?.summary.ttiMs.median ?? 0;

  // Use sequential results as the canonical provider list
  return sequential.map((r) => {
    const metrics: StatItem[] = [
      { label: "Sequential", value: formatMs(medianFor(sequential, r.provider)) },
      { label: "Burst", value: formatMs(medianFor(burst, r.provider)) },
      { label: "Staggered", value: formatMs(medianFor(staggered, r.provider)) },
    ];

    return {
      params: { provider: r.provider },
      props: {
        provider: r.provider,
        timestamp,
        metrics,
      },
    };
  });
};

export const GET: APIRoute = async ({ props }) => {
  const { provider, timestamp, metrics } = props as {
    provider: string;
    timestamp: string;
    metrics: StatItem[];
  };
  const png = await generateProviderOgImage({
    provider,
    categoryLabel: "Sandbox Benchmarks",
    timestamp,
    logoSrc: `/benchmarks/normal-${logomarkSlug(provider)}-dark.svg`,
    metrics,
  });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
