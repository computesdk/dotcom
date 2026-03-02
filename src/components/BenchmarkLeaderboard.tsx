import { useMemo, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

interface ProviderResult {
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
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{ ttiMs: number; error?: string }>
}

interface BenchmarkLeaderboardProps {
  activeResults: ProviderResult[]
  providerLogos: Record<string, string>
}

const PROVIDER_COLORS: Record<string, string> = {
  e2b: "#10b981",
  daytona: "#3b82f6",
  vercel: "#000000",
  modal: "#8b5cf6",
  blaxel: "#f97316",
  namespace: "#06b6d4",
  railway: "#ec4899",
  render: "#84cc16",
  hopx: "#f59e0b",
  codesandbox: "#6366f1",
  runloop: "#14b8a6",
}

type Metric = "median" | "min" | "max" | "p95" | "p99"

const METRIC_LABELS: Record<Metric, string> = {
  median: "Median TTI",
  min: "Min TTI",
  max: "Max TTI",
  p95: "P95 TTI",
  p99: "P99 TTI",
}

function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  if (s.toLowerCase() === "codesandbox") return "CodeSandbox"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function BenchmarkLeaderboard({ activeResults, providerLogos }: BenchmarkLeaderboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>("median")

  const leaderboardData = useMemo(() => {
    return activeResults
      .map((r) => ({
        provider: r.provider,
        displayName: capitalize(r.provider),
        value: r.summary.ttiMs[selectedMetric],
        color: PROVIDER_COLORS[r.provider] || "#6b7280",
      }))
      .sort((a, b) => a.value - b.value)
  }, [activeResults, selectedMetric])

  const midpoint = Math.ceil(leaderboardData.length / 2)
  const leftColumn = leaderboardData.slice(0, midpoint)
  const rightColumn = leaderboardData.slice(midpoint)

  if (!leaderboardData.length) {
    return null
  }

  return (
    <div className="not-content w-full max-w-5xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Provider Leaderboard
        </h3>
        <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as Metric)}>
          <SelectTrigger className="w-[120px] h-8 rounded-full text-xs text-gray-600">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent className="text-gray-600 text-xs">
            {(Object.keys(METRIC_LABELS) as Metric[]).map((metric) => (
              <SelectItem key={metric} value={metric} className="text-gray-600 text-xs">
                {METRIC_LABELS[metric]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
        <div className="flex flex-col">
          {leftColumn.map((item, index) => (
            <div
              key={item.provider}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg ${
                index === 0 ? 'bg-blue-50/50 shadow-sm dark:bg-blue-900/10' : ''
              }`}
            >
              <div className="shrink-0 w-6 text-left">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {index + 1}.
                </span>
              </div>
              
              <div className="shrink-0 w-40 flex items-center justify-center">
                <img
                  src={providerLogos[item.provider]}
                  alt={item.displayName}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {(item.value / 1000).toFixed(2)}s
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {METRIC_LABELS[selectedMetric]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {rightColumn.map((item, index) => (
            <div
              key={item.provider}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
            >
              <div className="shrink-0 w-6 text-left">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {midpoint + index + 1}.
                </span>
              </div>
              
              <div className="shrink-0 w-40 flex items-center justify-center">
                <img
                  src={providerLogos[item.provider]}
                  alt={item.displayName}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-end">
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {(item.value / 1000).toFixed(2)}s
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {METRIC_LABELS[selectedMetric]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}