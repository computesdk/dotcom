import type { ProviderResult } from "../components/benchmarkConstants";

const BASE_URL =
  "https://raw.githubusercontent.com/computesdk/benchmarks/refs/heads/master/results";
const EXCLUDED_PROVIDERS = new Set(["railway", "render"]);

export interface ActiveProvider extends ProviderResult {
  rank: number;
}

export async function fetchLatestResults(
  testType: string,
): Promise<ProviderResult[]> {
  const res = await fetch(`${BASE_URL}/${testType}/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${testType}`);
  const data = await res.json();
  return (data.results as ProviderResult[])
    .filter(
      (r) =>
        !r.skipped &&
        !EXCLUDED_PROVIDERS.has(r.provider) &&
        r.summary?.ttiMs?.median != null &&
        r.summary.ttiMs.median > 0,
    )
    .sort((a, b) => a.summary.ttiMs.median - b.summary.ttiMs.median);
}

export function computeCompositeScore(
  ttiMs: { median: number; p95: number; p99: number },
  successRate: number = 1,
): number {
  const ceil = 10_000;
  const score = (v: number) => Math.max(0, 100 * (1 - v / ceil));
  const weighted =
    score(ttiMs.median) * 0.6 + score(ttiMs.p95) * 0.25 + score(ttiMs.p99) * 0.15;
  return Math.round(weighted * successRate * 10) / 10;
}
