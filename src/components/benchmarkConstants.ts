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
  [provider: string]: number | string
}

export const STORAGE_PROVIDER_COLORS: Record<string, string> = {
  "aws-s3": "#f97316",       // Orange
  "cloudflare-r2": "#f59e0b", // Amber
  "tigris": "#06b6d4",        // Cyan
}

export type StorageMetric = "uploadMs" | "downloadMs" | "throughputMbps" | "compositeScore"

export const STORAGE_METRIC_LABELS: Record<StorageMetric, string> = {
  compositeScore: "Composite Score",
  uploadMs: "Upload Latency",
  downloadMs: "Download Latency",
  throughputMbps: "Throughput",
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
}

export type Metric = "median" | "p95" | "p99" | "compositeScore"

export const METRIC_LABELS: Record<Metric, string> = {
  compositeScore: "Composite Score",
  median: "Median TTI",
  p95: "P95 TTI",
  p99: "P99 TTI",
}

export function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  if (s.toLowerCase() === "codesandbox") return "CodeSandbox"
  if (s === "just-bash" || s === "justbash") return "JustBash"
  if (s === "aws-s3") return "AWS S3"
  if (s === "cloudflare-r2") return "Cloudflare R2"
  if (s === "tigris") return "Tigris"
  return s.charAt(0).toUpperCase() + s.slice(1)
}