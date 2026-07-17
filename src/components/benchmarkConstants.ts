export interface StorageResult {
  provider: string
  summary: {
    uploadMs: { median: number; p95: number; p99: number }
    downloadMs: { median: number; p95: number; p99: number }
    throughputMbps: { median: number; p95: number; p99: number }
  }
  compositeScore?: number
  successRate?: number
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{
    uploadMs: number
    downloadMs: number
    throughputMbps: number
    fileSizeBytes: number
    error?: string
  }>
}

export interface StorageHistoryPoint {
  date: string
  [key: string]: number | string
}

export interface ProviderResult {
  provider: string
  summary: {
    ttiMs: {
      median: number
      p95: number
      p99: number
      min?: number
      max?: number
      avg?: number
    }
  }
  compositeScore?: number
  successRate?: number
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{ ttiMs: number; error?: string }>
}

export interface HistoryDataPoint {
  date: string
  dateTs?: number
  [provider: string]: number | string | undefined
}

export const STORAGE_PROVIDER_COLORS: Record<string, string> = {
  "aws-s3": "#f97316",       // Orange
  "cloudflare-r2": "#f59e0b", // Amber
  "tigris": "#06b6d4",        // Cyan
  "azure-blob": "#0078d4",    // Azure blue
  "vercel-blob": "#71717a",   // Zinc
}

export type StorageMetric = "uploadMs" | "downloadMs" | "throughputMbps" | "compositeScore"

export const STORAGE_METRIC_LABELS: Record<StorageMetric, string> = {
  compositeScore: "Composite Score",
  uploadMs: "Upload Latency",
  downloadMs: "Download Latency",
  throughputMbps: "Throughput",
}

export interface BrowserResult {
  provider: string
  mode?: string
  summary: {
    createMs: { median: number; p95: number; p99: number }
    connectMs: { median: number; p95: number; p99: number }
    navigateMs: { median: number; p95: number; p99: number }
    releaseMs: { median: number; p95: number; p99: number }
    totalMs: { median: number; p95: number; p99: number }
  }
  compositeScore?: number
  successRate?: number
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{
    createMs: number
    connectMs: number
    navigateMs: number
    releaseMs: number
    totalMs: number
    error?: string
  }>
}

export interface BrowserHistoryPoint {
  date: string
  dateTs?: number
  [key: string]: number | string | undefined
}

export const BROWSER_PROVIDER_COLORS: Record<string, string> = {
  browserbase: "#f97316",   // Orange
  kernel: "#10b981",        // Green
  notte: "#f43f5e",         // Rose
  "browser-use": "#06b6d4", // Cyan
  browseruse: "#06b6d4",    // Cyan
}

export const BROWSER_THROUGHPUT_PROVIDER_COLORS: Record<string, string> = {
  browserbase: "#f97316",   // Orange
  kernel: "#10b981",        // Green
  hyperbrowser: "#3b82f6",  // Blue
  steel: "#8b5cf6",         // Purple
  notte: "#f43f5e",         // Rose
  "browser-use": "#06b6d4", // Cyan
}

export type ActionType = "navigate" | "waitForSelector" | "screenshot" | "textContent" | "click" | "goBack"

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  navigate: "Navigate",
  waitForSelector: "Wait For Selector",
  screenshot: "Screenshot",
  textContent: "Text Content",
  click: "Click",
  goBack: "Go Back",
}

export interface BrowserThroughputResult {
  provider: string
  mode?: string
  summary: {
    actionsPerSecond: { median: number; p95: number; p99: number }
    taskMs: { median: number; p95: number; p99: number }
    totalMs: { median: number; p95: number; p99: number }
    createMs: { median: number; p95: number; p99: number }
    perActionType: Partial<Record<ActionType, { median: number; p95: number; p99: number }>>
  }
  compositeScore?: number | null
  successRate?: number | null
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{
    createMs: number
    connectMs: number
    releaseMs: number
    totalMs: number
    taskMs: number
    actionsCompleted: number
    actionsPerSecond: number
  }>
}

export interface BrowserThroughputHistoryPoint {
  date: string
  dateTs?: number
  [key: string]: number | string | undefined
}

export type BrowserThroughputMetric =
  | "compositeScore"
  | "actionsPerSecond"
  | "taskMs"
  | "totalMs"
  | "screenshotMs"

export const BROWSER_THROUGHPUT_METRIC_LABELS: Record<BrowserThroughputMetric, string> = {
  compositeScore: "Composite Score",
  actionsPerSecond: "Actions/sec",
  taskMs: "Task Duration",
  totalMs: "Total Duration",
  screenshotMs: "Screenshot",
}

export type BrowserMetric =
  | "createMs"
  | "connectMs"
  | "navigateMs"
  | "releaseMs"
  | "totalMs"
  | "compositeScore"

export const BROWSER_METRIC_LABELS: Record<BrowserMetric, string> = {
  compositeScore: "Composite Score",
  createMs: "Create",
  connectMs: "Connect",
  navigateMs: "Navigate",
  releaseMs: "Release",
  totalMs: "Total",
}

export const PROVIDER_COLORS: Record<string, string> = {
  e2b: "#10b981",
  daytona: "#3b82f6",
  vercel: "#71717a",
  modal: "#8b5cf6",
  blaxel: "#f97316",
  namespace: "#06b6d4",
  hopx: "#f59e0b",
  codesandbox: "#6366f1",
  runloop: "#14b8a6",
  justbash: "#303137",
  "just-bash": "#303137",
  archil: "#991b1b",
  tensorlake: "#82C38C",
  isorun: "#ec4899",
  "cloud-run": "#4285F4",
  beam: "#f97316",
  createos: "#3b82f6",
  superserve: "#10b981",
  tenki: "#0ea5e9",
  lelantos: "#7c3aed",
  lightning: "#facc15",
}

export type Metric = "median" | "p95" | "p99" | "compositeScore"

export const METRIC_LABELS: Record<Metric, string> = {
  compositeScore: "Composite Score",
  median: "Median TTI",
  p95: "P95 TTI",
  p99: "P99 TTI",
}

export interface SnapshotForkResult {
  provider: string
  mode?: string
  dataset?: string
  summary: {
    snapshotCreateMs: { median: number; p95: number; p99: number }
    forkFromSnapshotMs: { median: number; p95: number; p99: number }
    forkFromLiveMs: { median: number; p95: number; p99: number }
    forkFirstReadMs: { median: number; p95: number; p99: number }
  }
  compositeScore?: number
  successRate?: number
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{
    snapshotCreateMs: number
    forkFromSnapshotMs: number
    forkFromLiveMs: number
    forkFirstReadMs: number
    verified: boolean
    error?: string
  }>
}

export interface SnapshotForkHistoryPoint {
  date: string
  dateTs?: number
  [key: string]: number | string | undefined
}

export type SnapshotForkMetric =
  | "compositeScore"
  | "snapshotCreateMs"
  | "forkFromSnapshotMs"
  | "forkFromLiveMs"
  | "forkFirstReadMs"

export const SNAPSHOT_FORK_METRIC_LABELS: Record<SnapshotForkMetric, string> = {
  compositeScore: "Composite Score",
  snapshotCreateMs: "Snapshot Create",
  forkFromSnapshotMs: "Fork (from snapshot)",
  forkFromLiveMs: "Fork (from live)",
  forkFirstReadMs: "First Read",
}

export const SNAPSHOT_FORK_PROVIDER_COLORS: Record<string, string> = {
  "aws-s3": "#f97316",
  "cloudflare-r2": "#f59e0b",
  "tigris": "#06b6d4",
  "azure-blob": "#0078d4",
  "vercel-blob": "#71717a",
}

export interface DaxResult {
  provider: string
  mode?: string
  summary: {
    totalMs: { median: number; p95: number; p99: number }
    prepareMs: { median: number; p95: number; p99: number }
    bunDownloadMs: { median: number; p95: number; p99: number }
    bunUnpackMs: { median: number; p95: number; p99: number }
    cloneMs: { median: number; p95: number; p99: number }
    installMs: { median: number; p95: number; p99: number }
    typecheckMs: { median: number; p95: number; p99: number }
  }
  successRate?: number | null
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{
    totalMs: number
    phasesCompleted?: number
    phasesTotal?: number
    prepareMs?: number
    bunDownloadMs?: number
    bunUnpackMs?: number
    cloneMs?: number
    installMs?: number
    typecheckMs?: number
    error?: string
  }>
  // Computed client-side from `iterations` (see fetchLatestDaxResults) since the
  // upstream data has no single compositeScore field for this benchmark.
  phasesCompleted?: number
  phasesTotal?: number
}

export interface DaxHistoryPoint {
  date: string
  dateTs?: number
  [key: string]: number | string | undefined
}

export type DaxMetric = "compositeScore" | "totalMs" | "prepareMs" | "cloneMs" | "installMs" | "typecheckMs"

export const DAX_METRIC_LABELS: Record<DaxMetric, string> = {
  compositeScore: "Phases Completed",
  totalMs: "Total Duration",
  prepareMs: "Prepare",
  cloneMs: "Clone",
  installMs: "Install",
  typecheckMs: "Typecheck",
}

// The dax benchmark script always runs the same 7 phases (prepare, cache_clear,
// bun_download, bun_unpack, clone, install, typecheck); used as a fallback when
// a result's iterations didn't report phasesTotal (e.g. the sandbox never booted).
export const DAX_PHASES_TOTAL = 7

// Some sandbox providers publish results under a "-sandbox" suffixed slug
// (e.g. "createos-sandbox") while the site keys logos/colors/names/URLs on the
// bare name. Strip the suffix so everything lines up now and keeps working once
// providers drop it upstream.
export function normalizeProvider(provider: string): string {
  return provider.replace(/-sandbox$/, "")
}

// The upstream benchmark API's provider slug doesn't always match the
// provider's logomark asset filename (e.g. Google Cloud Run publishes
// results as "cloud-run", but its logomark files are named
// "google-cloud-run-logomark-*.svg" for clarity). Map those cases here;
// everything else uses the raw slug as-is.
const LOGOMARK_SLUG_OVERRIDES: Record<string, string> = {
  "cloud-run": "google-cloud-run",
  lightning: "lightning-ai",
}

export function logomarkSlug(provider: string): string {
  return LOGOMARK_SLUG_OVERRIDES[provider] ?? provider
}

export function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  if (s.toLowerCase() === "codesandbox") return "CodeSandbox"
  if (s === "just-bash" || s === "justbash") return "JustBash"
  if (s === "aws-s3") return "AWS S3"
  if (s === "cloudflare-r2") return "Cloudflare R2"
  if (s === "tigris") return "Tigris"
  if (s === "azure-blob") return "Azure Blob"
  if (s === "vercel-blob") return "Vercel Blob"
  if (s === "createos") return "CreateOS"
  if (s === "superserve") return "Superserve"
  if (s === "browserbase") return "Browserbase"
  if (s === "browseruse" || s === "browser-use") return "Browser Use"
  if (s === "kernel") return "Kernel"
  if (s === "hyperbrowser") return "Hyperbrowser"
  if (s === "steel") return "Steel"
  if (s === "cloud-run") return "Cloud Run"
  if (s === "lightning") return "Lightning AI"
  return s.charAt(0).toUpperCase() + s.slice(1)
}
