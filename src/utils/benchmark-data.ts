import type {
  ProviderResult,
  StorageResult,
  StorageHistoryPoint,
  BrowserResult,
  BrowserHistoryPoint,
  BrowserThroughputResult,
  BrowserThroughputHistoryPoint,
  SnapshotForkResult,
  SnapshotForkHistoryPoint,
} from "../components/benchmarkConstants";
import { normalizeProvider } from "../components/benchmarkConstants";

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
    .map((r) => ({ ...r, provider: normalizeProvider(r.provider) }))
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
          point.providers[normalizeProvider(r.provider)] = Math.round(r.summary.ttiMs.median);
        }
      }
      if (Object.keys(point.providers).length > 0) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
}

export async function fetchLatestStorageResults(
  fileSize: string,
): Promise<StorageResult[]> {
  const res = await fetch(`${BASE_URL}/storage/${fileSize}/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching storage/${fileSize}`);
  const data = await res.json();
  return (data.results as StorageResult[])
    .filter(
      (r) =>
        !r.skipped &&
        r.summary?.uploadMs?.median != null &&
        r.summary.uploadMs.median > 0,
    )
    .sort((a, b) => a.summary.uploadMs.median - b.summary.uploadMs.median);
}

export async function fetchStorageHistoryData(
  fileSize: string,
): Promise<{ history: StorageHistoryPoint[]; timestamp: string }> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  const latestRes = await fetch(`${BASE_URL}/storage/${fileSize}/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/storage/${fileSize}`, {
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

  const history: StorageHistoryPoint[] = [];

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
      const point: StorageHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      for (const r of fileData.results as StorageResult[]) {
        if (!r.skipped && r.summary?.uploadMs?.median != null) {
          point[`${r.provider}_uploadMs`] = Math.round(r.summary.uploadMs.median);
          point[`${r.provider}_downloadMs`] = Math.round(r.summary.downloadMs.median);
          point[`${r.provider}_throughputMbps`] = Math.round(r.summary.throughputMbps.median * 10) / 10;
          if (r.compositeScore != null) {
            point[`${r.provider}_compositeScore`] = r.compositeScore;
          }
        }
      }
      if (Object.keys(point).length > 1) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
}

export async function fetchLatestBrowserResults(): Promise<BrowserResult[]> {
  const res = await fetch(`${BASE_URL}/browser/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching browser`);
  const data = await res.json();
  return (data.results as BrowserResult[])
    .filter(
      (r) =>
        !r.skipped &&
        r.summary?.totalMs?.median != null &&
        r.summary.totalMs.median > 0,
    )
    .sort((a, b) => a.summary.totalMs.median - b.summary.totalMs.median);
}

export async function fetchBrowserHistoryData(): Promise<{
  history: BrowserHistoryPoint[];
  timestamp: string;
}> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  const latestRes = await fetch(`${BASE_URL}/browser/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/browser`, {
    headers: githubHeaders,
  });
  if (!listRes.ok) {
    const fallbackHistory: BrowserHistoryPoint[] = [];
    const now = new Date();
    const dateCandidates: string[] = [];
    for (let i = 45; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dateCandidates.push(`${yyyy}-${mm}-${dd}`);
    }

    const fileResults = await Promise.all(
      dateCandidates.map(async (dateKey) => {
        try {
          const res = await fetch(`${BASE_URL}/browser/${dateKey}.json`);
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      }),
    );

    for (const fileData of fileResults) {
      if (!fileData) continue;
      const ts = fileData.timestamp as string;
      const point: BrowserHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dateTs: new Date(ts).getTime(),
      };
      for (const r of fileData.results as BrowserResult[]) {
        if (!r.skipped && r.summary?.totalMs?.median != null) {
          point[`${r.provider}_createMs`] = Math.round(r.summary.createMs.median);
          point[`${r.provider}_connectMs`] = Math.round(r.summary.connectMs.median);
          point[`${r.provider}_navigateMs`] = Math.round(r.summary.navigateMs.median);
          point[`${r.provider}_releaseMs`] = Math.round(r.summary.releaseMs.median);
          point[`${r.provider}_totalMs`] = Math.round(r.summary.totalMs.median);
          if (r.compositeScore != null) {
            point[`${r.provider}_compositeScore`] = r.compositeScore;
          }
        }
      }
      if (Object.keys(point).length > 1) {
        fallbackHistory.push(point);
      }
    }

    return { history: fallbackHistory, timestamp };
  }

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

  const history: BrowserHistoryPoint[] = [];

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
      const point: BrowserHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dateTs: new Date(ts).getTime(),
      };
      for (const r of fileData.results as BrowserResult[]) {
        if (!r.skipped && r.summary?.totalMs?.median != null) {
          point[`${r.provider}_createMs`] = Math.round(r.summary.createMs.median);
          point[`${r.provider}_connectMs`] = Math.round(r.summary.connectMs.median);
          point[`${r.provider}_navigateMs`] = Math.round(r.summary.navigateMs.median);
          point[`${r.provider}_releaseMs`] = Math.round(r.summary.releaseMs.median);
          point[`${r.provider}_totalMs`] = Math.round(r.summary.totalMs.median);
          if (r.compositeScore != null) {
            point[`${r.provider}_compositeScore`] = r.compositeScore;
          }
        }
      }
      if (Object.keys(point).length > 1) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
}

export async function fetchLatestBrowserThroughputResults(): Promise<BrowserThroughputResult[]> {
  const res = await fetch(`${BASE_URL}/browser-throughput/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching browser-throughput`);
  const data = await res.json();
  return (data.results as BrowserThroughputResult[])
    .filter(
      (r) =>
        !r.skipped &&
        r.summary?.actionsPerSecond?.median != null &&
        r.summary.actionsPerSecond.median > 0,
    )
    .map((r) => ({ ...r, compositeScore: computeThroughputScore(r) }))
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
}

export async function fetchBrowserThroughputHistoryData(): Promise<{
  history: BrowserThroughputHistoryPoint[];
  timestamp: string;
}> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  const latestRes = await fetch(`${BASE_URL}/browser-throughput/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/browser-throughput`, { headers: githubHeaders });
  if (!listRes.ok) return { history: [], timestamp };

  const files = (await listRes.json()) as Array<{ name: string; download_url: string }>;
  const jsonFiles = files
    .filter(
      (f) =>
        f.name.endsWith(".json") &&
        f.name !== "latest.json" &&
        f.name !== ".gitkeep",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const history: BrowserThroughputHistoryPoint[] = [];

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
      const point: BrowserThroughputHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateTs: new Date(ts).getTime(),
      };
      for (const r of fileData.results as BrowserThroughputResult[]) {
        if (!r.skipped && r.summary?.actionsPerSecond?.median != null) {
          const score = computeThroughputScore(r);
          point[`${r.provider}_actionsPerSecond`] = Math.round(r.summary.actionsPerSecond.median * 100) / 100;
          point[`${r.provider}_taskMs`] = Math.round(r.summary.taskMs.median);
          point[`${r.provider}_totalMs`] = Math.round(r.summary.totalMs.median);
          point[`${r.provider}_screenshotMs`] = Math.round(r.summary.perActionType.screenshot?.median ?? 0);
          point[`${r.provider}_compositeScore`] = score;
        }
      }
      if (Object.keys(point).length > 2) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
}

export function computeThroughputScore(r: BrowserThroughputResult): number {
  const aps = r.summary.actionsPerSecond.median;
  const taskMed = r.summary.taskMs.median;
  const taskP95 = r.summary.taskMs.p95;
  const screenshotMed = r.summary.perActionType.screenshot?.median ?? 0;

  const iters = r.iterations ?? [];
  const successRate =
    iters.length > 0
      ? iters.filter((it) => it.actionsCompleted === 50).length / iters.length
      : 1;

  const scoreAps = Math.min(100, (aps / 10) * 100);
  const scoreTaskMed = Math.max(0, 100 * (1 - taskMed / 30000));
  const scoreTaskP95 = Math.max(0, 100 * (1 - taskP95 / 30000));
  const scoreScreenshot = screenshotMed > 0 ? Math.max(0, 100 * (1 - screenshotMed / 30000)) : 50;

  const weighted =
    0.4 * scoreAps + 0.25 * scoreTaskMed + 0.2 * scoreTaskP95 + 0.15 * scoreScreenshot;
  return Math.round(weighted * successRate * 10) / 10;
}

export async function fetchLatestSnapshotForkResults(
  dataset: string,
): Promise<SnapshotForkResult[]> {
  const res = await fetch(`${BASE_URL}/snapshot-fork/${dataset}/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching snapshot-fork/${dataset}`);
  const data = await res.json();
  return (data.results as SnapshotForkResult[])
    .filter(
      (r) =>
        !r.skipped &&
        r.summary?.snapshotCreateMs?.median != null &&
        r.summary.snapshotCreateMs.median > 0,
    )
    .sort((a, b) => (b.compositeScore ?? 0) - (a.compositeScore ?? 0));
}

export async function fetchSnapshotForkHistoryData(
  dataset: string,
): Promise<{ history: SnapshotForkHistoryPoint[]; timestamp: string }> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  const latestRes = await fetch(`${BASE_URL}/snapshot-fork/${dataset}/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/snapshot-fork/${dataset}`, {
    headers: githubHeaders,
  });
  if (!listRes.ok) return { history: [], timestamp };

  const files = (await listRes.json()) as Array<{ name: string; download_url: string }>;
  const jsonFiles = files
    .filter(
      (f) =>
        f.name.endsWith(".json") &&
        f.name !== "latest.json" &&
        f.name !== ".gitkeep",
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const history: SnapshotForkHistoryPoint[] = [];

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
      const point: SnapshotForkHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateTs: new Date(ts).getTime(),
      };
      for (const r of fileData.results as SnapshotForkResult[]) {
        if (!r.skipped && r.summary?.snapshotCreateMs?.median != null) {
          point[`${r.provider}_snapshotCreateMs`] = Math.round(r.summary.snapshotCreateMs.median);
          point[`${r.provider}_forkFromSnapshotMs`] = Math.round(r.summary.forkFromSnapshotMs.median);
          point[`${r.provider}_forkFromLiveMs`] = Math.round(r.summary.forkFromLiveMs.median);
          point[`${r.provider}_forkFirstReadMs`] = Math.round(r.summary.forkFirstReadMs.median);
          if (r.compositeScore != null) {
            point[`${r.provider}_compositeScore`] = r.compositeScore;
          }
        }
      }
      if (Object.keys(point).length > 2) {
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
