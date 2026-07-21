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
  DaxResult,
  DaxHistoryPoint,
} from "../components/benchmarkConstants";
import { normalizeProvider, DAX_PHASES_TOTAL } from "../components/benchmarkConstants";

// The benchmark script has a fast-fail path: when an environment capability
// check fails (e.g. no apt-get, no root/sudo) it exits immediately and reports
// an error in the form "{phase}: {reason}" (observed: "prepare: apt_get_required",
// "prepare: root_or_sudo_required"). When this fires, the script sometimes still
// emits a BENCH_PHASE line for that same phase with a near-zero duration (e.g.
// prepareMs: 1) — an artifact of the instant bailout, not a real measurement.
// Detect that sentinel so we don't count or display it as real work.
const DAX_SCRIPT_PHASE_NAMES = ["prepare", "cache_clear", "bun_download", "bun_unpack", "clone", "install", "typecheck"];
function sentinelFailedPhase(it: { error?: string } | undefined): string | null {
  const err = it?.error;
  if (!err) return null;
  return DAX_SCRIPT_PHASE_NAMES.find((phase) => err.startsWith(`${phase}: `)) ?? null;
}

// The dax results envelope has no single "did this succeed" field the way other
// benchmarks have compositeScore — instead each iteration reports how many of
// the 7 script phases (prepare/cache_clear/bun_download/bun_unpack/clone/install/
// typecheck) it reached before failing. We derive a per-provider "X/7" score by
// taking the median phase count across iterations, correcting for the fast-fail
// sentinel above (which inflates the raw count by one phase that didn't really run).
function medianDaxPhasesCompleted(iterations: DaxResult["iterations"]): number {
  const values = (iterations ?? []).map((it) => {
    const raw = it.phasesCompleted ?? 0;
    return sentinelFailedPhase(it) ? Math.max(0, raw - 1) : raw;
  });
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function daxPhasesTotal(iterations: DaxResult["iterations"]): number {
  return (iterations ?? []).find((it) => it.phasesTotal != null)?.phasesTotal ?? DAX_PHASES_TOTAL;
}

type DaxPhaseKey = "totalMs" | "prepareMs" | "bunDownloadMs" | "bunUnpackMs" | "cloneMs" | "installMs" | "typecheckMs";
const DAX_PHASE_KEYS: DaxPhaseKey[] = ["totalMs", "prepareMs", "bunDownloadMs", "bunUnpackMs", "cloneMs", "installMs", "typecheckMs"];

// Maps our metric keys to the script's own phase names, so we can tell when a
// given metric's duration is the fast-fail sentinel described above.
const DAX_METRIC_TO_SCRIPT_PHASE: Partial<Record<DaxPhaseKey, string>> = {
  prepareMs: "prepare",
  bunDownloadMs: "bun_download",
  bunUnpackMs: "bun_unpack",
  cloneMs: "clone",
  installMs: "install",
  typecheckMs: "typecheck",
};

// Phase timing keys in script execution order (excluding totalMs which is
// wall-clock, not a script phase). Used to determine which phase failed in
// an errored iteration — the last phase with a non-null timing is the one
// that emitted BENCH_PHASE before the error was detected.
const DAX_PHASE_ORDER: DaxPhaseKey[] = ["prepareMs", "bunDownloadMs", "bunUnpackMs", "cloneMs", "installMs", "typecheckMs"];

type DaxIteration = NonNullable<DaxResult["iterations"]>[0];

function failedPhaseKey(it: DaxIteration | undefined): DaxPhaseKey | null {
  if (!it || !it.error) return null;
  // sentinelFailedPhase already handles the "phase: reason" error format;
  // for other errors, find the last phase with a non-null timing.
  if (sentinelFailedPhase(it)) return null;
  for (let i = DAX_PHASE_ORDER.length - 1; i >= 0; i--) {
    const key = DAX_PHASE_ORDER[i];
    if (it[key] != null) return key;
  }
  return null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

// The upstream sandbox-dax script occasionally reports a bogus phase duration:
// either a multi-day prepareMs on a run whose iteration.totalMs was only ~11s
// (a clock issue for that provider/run), or a near-zero prepareMs from the
// fast-fail sentinel above. Neither is a unit bug on our end. A sub-phase can
// never legitimately take longer than the iteration's own wall-clock totalMs
// (measured via performance.now() in the same script), so we use that as a
// sanity ceiling, exclude fast-fail sentinel values, and recompute stats from
// only the remaining valid iterations rather than trusting the upstream
// `summary` medians verbatim.
function daxPhaseStats(iterations: DaxResult["iterations"], key: DaxPhaseKey): { median: number; p95: number; p99: number } {
  const scriptPhase = DAX_METRIC_TO_SCRIPT_PHASE[key];
  const valid = (iterations ?? [])
    .filter((it) => {
      if (it[key] == null) return false;
      if (key !== "totalMs" && (it[key] as number) > it.totalMs) return false;
      if (scriptPhase && sentinelFailedPhase(it) === scriptPhase) return false;
      // Exclude the failed phase's timing for any errored iteration. The script
      // emits BENCH_PHASE with a near-zero duration before detecting the error,
      // so that timing is an artifact, not a real measurement.
      if (key !== "totalMs" && failedPhaseKey(it) === key) return false;
      return true;
    })
    .map((it) => it[key] as number);
  if (valid.length === 0) return { median: 0, p95: 0, p99: 0 };
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { median, p95: percentile(sorted, 95), p99: percentile(sorted, 99) };
}

export function sanitizedDaxSummary(iterations: DaxResult["iterations"]): DaxResult["summary"] {
  const summary = {} as DaxResult["summary"];
  for (const key of DAX_PHASE_KEYS) {
    summary[key] = daxPhaseStats(iterations, key);
  }
  return summary;
}

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
          point[`${r.provider}_actionsPerSecond`] = Math.round(r.summary.actionsPerSecond.median * 100) / 100;
          point[`${r.provider}_taskMs`] = Math.round(r.summary.taskMs.median);
          point[`${r.provider}_totalMs`] = Math.round(r.summary.totalMs.median);
          point[`${r.provider}_screenshotMs`] = Math.round(r.summary.perActionType.screenshot?.median ?? 0);
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

export async function fetchLatestDaxResults(): Promise<DaxResult[]> {
  const res = await fetch(`${BASE_URL}/sandbox-dax/latest.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching sandbox-dax`);
  const data = await res.json();
  return (data.results as DaxResult[])
    .filter((r) => !r.skipped && r.summary?.totalMs?.median != null)
    .map((r) => ({
      ...r,
      provider: normalizeProvider(r.provider),
      summary: sanitizedDaxSummary(r.iterations),
      phasesCompleted: medianDaxPhasesCompleted(r.iterations),
      phasesTotal: daxPhasesTotal(r.iterations),
    }))
    .sort((a, b) => {
      const phaseDiff = (b.phasesCompleted ?? 0) - (a.phasesCompleted ?? 0);
      if (phaseDiff !== 0) return phaseDiff;
      // Among providers with the same (incomplete) phase count, don't use
      // totalMs as a tiebreaker — a faster failure isn't "better". Sort by
      // success rate (desc) then alphabetically. Only use totalMs for
      // providers that completed all phases (where it's a real comparison).
      const aComplete = (a.phasesCompleted ?? 0) >= (a.phasesTotal ?? DAX_PHASES_TOTAL);
      const bComplete = (b.phasesCompleted ?? 0) >= (b.phasesTotal ?? DAX_PHASES_TOTAL);
      if (aComplete && bComplete) return a.summary.totalMs.median - b.summary.totalMs.median;
      if (aComplete !== bComplete) return aComplete ? -1 : 1;
      const srDiff = (b.successRate ?? 0) - (a.successRate ?? 0);
      if (srDiff !== 0) return srDiff;
      return a.provider.localeCompare(b.provider);
    });
}

export async function fetchDaxHistoryData(): Promise<{
  history: DaxHistoryPoint[];
  timestamp: string;
}> {
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  const githubToken = import.meta.env.GITHUB_TOKEN;
  if (githubToken) {
    githubHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  const latestRes = await fetch(`${BASE_URL}/sandbox-dax/latest.json`);
  if (!latestRes.ok) throw new Error(`HTTP ${latestRes.status}`);
  const latestData = await latestRes.json();
  const timestamp = new Date(latestData.timestamp).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const listRes = await fetch(`${API_URL}/sandbox-dax`, { headers: githubHeaders });
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

  const history: DaxHistoryPoint[] = [];

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
      const point: DaxHistoryPoint = {
        date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateTs: new Date(ts).getTime(),
      };
      for (const r of fileData.results as DaxResult[]) {
        if (!r.skipped && r.summary?.totalMs?.median != null) {
          const provider = normalizeProvider(r.provider);
          const summary = sanitizedDaxSummary(r.iterations);
          point[`${provider}_totalMs`] = Math.round(summary.totalMs.median);
          point[`${provider}_prepareMs`] = Math.round(summary.prepareMs.median);
          point[`${provider}_bunDownloadMs`] = Math.round(summary.bunDownloadMs.median);
          point[`${provider}_bunUnpackMs`] = Math.round(summary.bunUnpackMs.median);
          point[`${provider}_cloneMs`] = Math.round(summary.cloneMs.median);
          point[`${provider}_installMs`] = Math.round(summary.installMs.median);
          point[`${provider}_typecheckMs`] = Math.round(summary.typecheckMs.median);
          point[`${provider}_compositeScore`] = medianDaxPhasesCompleted(r.iterations);
        }
      }
      if (Object.keys(point).length > 2) {
        history.push(point);
      }
    }
  }

  return { history, timestamp };
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
