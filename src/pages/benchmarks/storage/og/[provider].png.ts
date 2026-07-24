import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestStorageResults, fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateProviderOgImage, formatMs, type StatItem } from "../../../../utils/og-image";

const FILE_SIZE = "10mb";

// Mirrors the dark-mode logo map in src/pages/benchmarks/storage/[provider]/index.astro —
// storage provider slugs don't map 1:1 onto their wordmark filenames.
const PROVIDER_LOGOS_DARK: Record<string, string> = {
  "aws-s3": "/benchmarks/normal-s3-dark.svg",
  "cloudflare-r2": "/benchmarks/normal-cloudflare-dark.svg",
  tigris: "/benchmarks/normal-tigris-dark.svg",
  "azure-blob": "/benchmarks/normal-azure-dark.svg",
  "vercel-blob": "/benchmarks/normal-vercel-dark.svg",
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [results, timestamp] = await Promise.all([
    fetchLatestStorageResults(FILE_SIZE),
    fetchLatestTimestamp(`storage/${FILE_SIZE}`),
  ]);

  return results.map((r) => {
    const metrics: StatItem[] = [
      { label: "Upload", value: formatMs(r.summary.uploadMs.median) },
      { label: "Download", value: formatMs(r.summary.downloadMs.median) },
      { label: "Throughput", value: `${r.summary.throughputMbps.median.toFixed(0)} Mbps` },
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
    categoryLabel: "Storage Benchmarks",
    timestamp,
    logoSrc: PROVIDER_LOGOS_DARK[provider],
    metrics,
  });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
