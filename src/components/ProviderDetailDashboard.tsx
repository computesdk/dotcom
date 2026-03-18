import { useState, useMemo } from "react"
import { ProviderIterationHistogram } from "./ProviderIterationHistogram"
import { ProviderHistoryChart } from "./ProviderHistoryChart"
import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { ProviderResult, HistoryDataPoint } from "./benchmarkConstants"

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
const TEST_TYPE_LABELS: Record<TestType, string> = {
  sequential_tti: "Sequential",
  burst_tti: "Burst",
  staggered_tti: "Staggered",
}

const formatMs = (ms: number) => `${(ms / 1000).toFixed(2)}s`

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 px-4 py-3">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">
        {value}
      </div>
      {sublabel && (
        <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sublabel}</div>
      )}
    </div>
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
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white m-0">
            {TEST_TYPE_LABELS[testType]}
          </h3>
          {rank > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
              #{rank} of {allResults.length}
            </span>
          )}
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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Composite"
          value={(result.compositeScore ?? 0).toFixed(1)}
        />
        <StatCard
          label="Median"
          value={formatMs(result.summary.ttiMs.median)}
        />
        <StatCard
          label="P95"
          value={formatMs(result.summary.ttiMs.p95)}
        />
        <StatCard
          label="P99"
          value={formatMs(result.summary.ttiMs.p99)}
        />
        <StatCard
          label="Range"
          value={result.summary.ttiMs.min != null && result.summary.ttiMs.max != null
            ? `${formatMs(result.summary.ttiMs.min)} - ${formatMs(result.summary.ttiMs.max)}`
            : "N/A"
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {result.iterations && result.iterations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Iteration Distribution
            </h4>
            <ProviderIterationHistogram
              iterations={result.iterations}
              provider={provider}
            />
          </div>
        )}
        {historyData.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Performance Over Time
            </h4>
            <ProviderHistoryChart
              historyData={historyData}
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
  const [selectedTest, setSelectedTest] = useState<TestType | "all">("all")

  const color = PROVIDER_COLORS[provider] || "#6b7280"

  const testsToShow = selectedTest === "all"
    ? TEST_TYPES.filter((t) => providerData[t] != null)
    : providerData[selectedTest] ? [selectedTest] : []

  return (
    <div className="not-content mt-0">
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        <div className="flex items-center gap-2 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
            <button
              type="button"
              onClick={() => setSelectedTest("all")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${
                selectedTest === "all"
                  ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                  : "hover:text-gray-950 dark:hover:text-gray-50"
              }`}
            >
              All Tests
            </button>
            {TEST_TYPES.map((testType) => (
              <button
                key={testType}
                type="button"
                onClick={() => setSelectedTest(testType)}
                disabled={!providerData[testType]}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  selectedTest === testType
                    ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                    : "hover:text-gray-950 dark:hover:text-gray-50"
                }`}
              >
                {TEST_TYPE_LABELS[testType]}
              </button>
            ))}
          </div>
        </div>

        {testsToShow.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">No benchmark data available for this test type.</p>
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
