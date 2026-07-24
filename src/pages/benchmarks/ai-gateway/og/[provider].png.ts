import type { APIRoute, GetStaticPaths } from "astro";
import { fetchLatestAIGatewayResults, fetchLatestTimestamp } from "../../../../utils/benchmark-data";
import { generateProviderOgImage, formatMs, type StatItem } from "../../../../utils/og-image";

const LOGO_API = "https://logos.computesdk.com/api/svg";
const logoUrl = (brandId: string) => `${LOGO_API}/${brandId}/normalized/logo-dark`;

// Mirrors the dark-mode logo map in src/pages/benchmarks/ai-gateway/[provider]/index.astro —
// gateway providers are fetched from the shared logo API rather than local wordmark files.
const PROVIDER_LOGOS_DARK: Record<string, string> = {
  openrouter: logoUrl("openrouter"),
  "vercel-ai-gateway": logoUrl("vercel"),
  "cloudflare-ai-gateway": logoUrl("cloudflare"),
  llmgateway: logoUrl("llm-gateway"),
  "pydantic-ai-gateway": logoUrl("pydantic"),
  "anthropic-direct": logoUrl("anthropic"),
};

export const getStaticPaths: GetStaticPaths = async () => {
  const [results, timestamp] = await Promise.all([
    fetchLatestAIGatewayResults(),
    fetchLatestTimestamp("ai-gateway"),
  ]);

  return results.map((r) => {
    const metrics: StatItem[] = [
      { label: "Cold E2E", value: formatMs(r.summary.coldE2eMs.median) },
      { label: "Warm TTFT", value: formatMs(r.summary.warmTtftMs.median) },
      { label: "Tokens/sec", value: `${r.summary.outputTokensPerSec.median.toFixed(0)} tok/s` },
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
    categoryLabel: "AI Gateway Benchmarks",
    timestamp,
    logoSrc: PROVIDER_LOGOS_DARK[provider],
    metrics,
  });
  return new Response(png as unknown as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
