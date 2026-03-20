import { useMemo } from "react"
import { PROVIDER_COLORS, capitalize, METRIC_LABELS } from "./benchmarkConstants"
import type { ProviderResult, Metric } from "./benchmarkConstants"

interface BenchmarkProviderToggleProps {
  activeResults: ProviderResult[]
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
  selectedMetric: Metric
}

function getMetricValue(r: ProviderResult, metric: Metric): number {
  if (metric === "compositeScore") return r.compositeScore ?? 0
  return r.summary.ttiMs[metric]
}

function formatValue(value: number, metric: Metric): string {
  if (metric === "compositeScore") return value.toFixed(1)
  return `${(value / 1000).toFixed(2)}s`
}

export function BenchmarkProviderToggle({
  activeResults,
  providerLogos,
  providerLogosDark,
  selectedMetric,
}: BenchmarkProviderToggleProps) {

  const ranked = useMemo(() => {
    return [...activeResults]
      .map((r) => ({
        ...r,
        metricValue: getMetricValue(r, selectedMetric),
      }))
      .sort((a, b) =>
        selectedMetric === "compositeScore"
          ? b.metricValue - a.metricValue
          : a.metricValue - b.metricValue
      )
  }, [activeResults, selectedMetric])

  const midpoint = Math.ceil(ranked.length / 2)
  const leftColumn = ranked.slice(0, midpoint)
  const rightColumn = ranked.slice(midpoint)

  if (!ranked.length) return null

  const renderCard = (result: (typeof ranked)[0], index: number) => {
    const logoLight = providerLogos[result.provider]
    const logoDark = providerLogosDark[result.provider]

    return (
      <a
        key={result.provider}
        href={`/benchmarks/${result.provider}`}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-gray-50 hover:shadow-sm dark:hover:bg-gray-800/50 transition-colors no-underline cursor-pointer ${
          index === 0
            ? "dark:bg-gray-700/50 shadow:lg border-blue-200 dark:border-blue-700/30 shadow-sm"
            : "bg-white/50 dark:bg-gray-700/50 shadow:lg border-gray-200 dark:border-gray-700/50"
        }`}
      >
        <div className="shrink-0 w-6 text-center">
          <span className="text-sm font-mono font-medium text-gray-500 dark:text-gray-400">
            {index + 1}
          </span>
        </div>

        <div className="shrink-0 w-40 flex items-center">
          {logoLight ? (
            <>
              <img src={logoLight} alt={`${result.provider} logo`} className="w-full h-full object-contain dark:hidden" />
              <img src={logoDark || logoLight} alt="" className="w-full h-full object-contain hidden dark:block" />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: PROVIDER_COLORS[result.provider] || "#6b7280" }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {capitalize(result.provider)}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <div className="shrink-0 flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
              {formatValue(result.metricValue, selectedMetric)}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {METRIC_LABELS[selectedMetric]}
            </span>
          </div>
          <svg className="size-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </a>
    )
  }

  return (
    <div className="not-content w-full max-w-7xl">
      <div className="flex items-center justify-between mb-3 px-4 md:px-6">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
          Provider Leaderboard
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 px-4 md:px-6">
        <div className="flex flex-col gap-2">
          {leftColumn.map((result, index) => renderCard(result, index))}
        </div>
        <div className="flex flex-col gap-2">
          {rightColumn.map((result, index) => renderCard(result, midpoint + index))}
        </div>
      </div>
    </div>
  )
}