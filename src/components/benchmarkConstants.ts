export interface ProviderResult {
  provider: string
  summary: {
    ttiMs: {
      min: number
      max: number
      median: number
      p95: number
      p99: number
      avg: number
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

export const PROVIDER_COLORS: Record<string, string> = {
  e2b: "#10b981",
  daytona: "#3b82f6",
  vercel: "#000000",
  modal: "#8b5cf6",
  blaxel: "#f97316",
  namespace: "#06b6d4",
  hopx: "#f59e0b",
  codesandbox: "#6366f1",
  runloop: "#14b8a6",
  justbash: "#303137",
}

export function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  if (s.toLowerCase() === "codesandbox") return "CodeSandbox"
  return s.charAt(0).toUpperCase() + s.slice(1)
}