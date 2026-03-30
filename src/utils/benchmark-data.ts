import type { ProviderResult } from "../components/benchmarkConstants";

const BASE_URL =
  "https://raw.githubusercontent.com/computesdk/benchmarks/refs/heads/master/results";
const API_URL =
  "https://api.github.com/repos/computesdk/benchmarks/contents/results";
const EXCLUDED_PROVIDERS = new Set(["railway", "render"]);
const CUTOFF_DATE = new Date("2026-02-23T00:00:00Z");
const HISTORY_BATCH_SIZE = 10;

export interface ActiveProvider extends ProviderResult {
  rank: number;
}

export interface HistoryPoint {
  date: string;
  providers: Record<string, number>; // provider -> median TTI
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

export async function fetchHistoryData(
  testType: string,
): Promise<{ history: HistoryPoint[]; timestamp: string }> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  // Get timestamp from latest
  const latestRes = await fetch(`${BASE_URL}/${testType}/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/${testType}`, {
    headers: githubHeaders,
  });
  if (!listRes.ok) return { history: [], timestamp };

  const files = (await listRes.json()) as Array<{
    name: string;
    download_url: string;
  }>;
  const jsonFiles = files
    .filter(
      (f) =>
        f.name.endsWith(".json") &&
        f.name !== "latest.json" &&
        f.name !== ".gitkeep",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const history: HistoryPoint[] = [];

  for (let i = 0; i < jsonFiles.length; i += HISTORY_BATCH_SIZE) {
    const batch = jsonFiles.slice(i, i + HISTORY_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        try {
          const fileRes = await fetch(file.download_url);
          if (!fileRes.ok) return null;
          return await fileRes.json();
        } catch {
          return null;
        }
      }),
    );

    for (const fileData of batchResults) {
      if (!fileData) continue;
      const ts = fileData.timestamp as string;
      if (new Date(ts) <= CUTOFF_DATE) continue;

      const point: HistoryPoint = { date: ts, providers: {} };
      for (const r of fileData.results as ProviderResult[]) {
        if (
          !r.skipped &&
          !EXCLUDED_PROVIDERS.has(r.provider) &&
          r.summary?.ttiMs?.median != null &&
          r.summary.ttiMs.median > 0
        ) {
          point.providers[r.provider] = Math.round(r.summary.ttiMs.median);
        }
      }
      if (Object.keys(point.providers).length > 0) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
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
