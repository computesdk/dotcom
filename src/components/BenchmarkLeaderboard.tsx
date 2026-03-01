import { useMemo, useState } from "react"

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
        <div className="relative">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as Metric)}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full h-8 px-4 pr-8 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors"
          >
            {(Object.keys(METRIC_LABELS) as Metric[]).map((metric) => (
              <option key={metric} value={metric}>
                {METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
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
