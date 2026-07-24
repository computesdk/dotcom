import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestBrowserResults, fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateProviderOgImage, formatMs, type StatItem } from "../../../../utils/og-image";

export const getStaticPaths: GetStaticPaths = async () => {
  const [results, timestamp] = await Promise.all([
    fetchLatestBrowserResults(),
    fetchLatestTimestamp("browser"),
  ]);

  return results.map((r) => {
    const metrics: StatItem[] = [
      { label: "Create", value: formatMs(r.summary.createMs.median) },
      { label: "Navigate", value: formatMs(r.summary.navigateMs.median) },
      { label: "Total", value: formatMs(r.summary.totalMs.median) },
    ];

    return {
      params: { provider: r.provider },
      props: { provider: r.provider, timestamp, metrics },
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
    categoryLabel: "Browser Benchmarks",
    timestamp,
    logoSrc: `/benchmarks/normal-${provider}-dark.svg`,
    metrics,
  });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
