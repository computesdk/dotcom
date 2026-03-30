import { useState, useMemo } from "react"
import { Info } from "lucide-react"
import { ProviderIterationHistogram } from "./ProviderIterationHistogram"
import { ProviderHistoryChart } from "./ProviderHistoryChart"
import { METRIC_LABELS } from "./benchmarkConstants"
import type { ProviderResult, HistoryDataPoint, Metric } from "./benchmarkConstants"

type TestType = "sequential_tti" | "burst_tti" | "staggered_tti"

interface TestTypeData {
  active: ProviderResult[]
  historyData: HistoryDataPoint[]
  timestamp: string
}

interface ProviderDetailDashboardProps {
  provider: string
  providerData: Record<string, ProviderResult | null>
  datasets: Record<string, TestTypeData>
  providerRank: number
  totalProviders: number
}

const TEST_TYPES: TestType[] = ["sequential_tti", "burst_tti", "staggered_tti"]
const TEST_TYPE_LABELS: Record<TestType, { label: string; description: string }> = {
  sequential_tti: { label: "Sequential TTI", description: "Sandboxes launched one at a time, waiting for each to become interactive before starting the next." },
  burst_tti: { label: "Burst TTI", description: "All sandboxes launched concurrently in a single burst." },
  staggered_tti: { label: "Staggered TTI", description: "Sandboxes launched with 200ms delays between each." },
}

const formatMs = (ms: number) => `${(ms / 1000).toFixed(2)}s`

function StatCard({ label, value, sublabel, active, onClick }: { label: string; value: string; sublabel?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-all ${
        active
          ? "border-gray-900 dark:border-white bg-white dark:bg-gray-800 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sublabel}</div>
      )}
    </button>
  )
}

function TestTypeSection({
  testType,
  result,
  historyData,
  provider,
  allResults,
}: {
  testType: TestType
  result: ProviderResult
  historyData: HistoryDataPoint[]
  provider: string
  allResults: ProviderResult[]
}) {
  const [selectedMetric, setSelectedMetric] = useState<Metric>("median")

  const successRate = result.successRate ?? (
    result.iterations
      ? result.iterations.filter((i) => !i.error).length / result.iterations.length
      : 1
  )
  const successCount = result.iterations?.filter((i) => !i.error).length ?? 0
  const totalCount = result.iterations?.length ?? 0

  const rank = useMemo(() => {
    const sorted = [...allResults].sort((a, b) => a.summary.ttiMs.median - b.summary.ttiMs.median)
    return sorted.findIndex((r) => r.provider === provider) + 1
  }, [allResults, provider])

  return (
    <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white m-0">
            {TEST_TYPE_LABELS[testType].label}
          </h2>
          <span className="relative group inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
            <Info size={14} />
            <span className="absolute top-full left-0 mt-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-2.5 text-xs text-gray-600 dark:text-gray-300 font-normal opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              {TEST_TYPE_LABELS[testType].description}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {successCount}/{totalCount} successful
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
            successRate >= 0.95
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
              : successRate >= 0.8
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
          }`}>
            {Math.round(successRate * 100)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Median"
          value={formatMs(result.summary.ttiMs.median)}
          active={selectedMetric === "median"}
          onClick={() => setSelectedMetric("median")}
        />
        <StatCard
          label="P95"
          value={formatMs(result.summary.ttiMs.p95)}
          active={selectedMetric === "p95"}
          onClick={() => setSelectedMetric("p95")}
        />
        <StatCard
          label="P99"
          value={formatMs(result.summary.ttiMs.p99)}
          active={selectedMetric === "p99"}
          onClick={() => setSelectedMetric("p99")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {historyData.length > 0 && (
          <div className="min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {METRIC_LABELS[selectedMetric]} Over Time
            </h3>
            <ProviderHistoryChart
              historyData={historyData}
              provider={provider}
              selectedMetric={selectedMetric}
            />
          </div>
        )}
        {result.iterations && result.iterations.length > 0 && (
          <div className="min-w-0 overflow-hidden">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Iteration Distribution
            </h3>
            <ProviderIterationHistogram
              iterations={result.iterations}
              provider={provider}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export function ProviderDetailDashboard({
  provider,
  providerData,
  datasets,
  providerRank,
  totalProviders,
}: ProviderDetailDashboardProps) {
  const testsToShow = TEST_TYPES.filter((t) => providerData[t] != null)

  return (
    <div className="not-content mt-0">
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {testsToShow.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">No benchmark data available.</p>
          </div>
        )}

        {testsToShow.map((testType) => {
          const result = providerData[testType]
          if (!result) return null
          return (
            <TestTypeSection
              key={testType}
              testType={testType}
              result={result}
              historyData={datasets[testType]?.historyData || []}
              provider={provider}
              allResults={datasets[testType]?.active || []}
            />
          )
        })}
      </div>
    </div>
  )
}
