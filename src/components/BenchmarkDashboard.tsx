import { useState, useMemo } from "react"
import { BenchmarkBarChart } from "./BenchmarkBarChart"
import { BenchmarkChart } from "./BenchmarkChart"
import { BenchmarkDataTable } from "./BenchmarkDataTable"
import { BenchmarkProviderToggle } from "./BenchmarkProviderToggle"
import type { ProviderResult, HistoryDataPoint } from "./benchmarkConstants"

type TestType = "sequential_tti" | "burst_tti" | "staggered_tti"
type TimeRange = "30" | "60" | "90" | "all"
type Metric = "median" | "min" | "max" | "p95" | "p99" | "compositeScore"

interface TestTypeData {
  active: ProviderResult[]
  historyData: HistoryDataPoint[]
  chartProviders: string[]
  timestamp: string
}

interface BenchmarkDashboardProps {
  datasets: Record<TestType, TestTypeData>
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
}

const TEST_TYPE_LABELS: Record<TestType, { label: string; }> = {
  sequential_tti: {
    label: "Sequential TTI",
  },
  burst_tti: {
    label: "Burst TTI",
  },
  staggered_tti: {
    label: "Staggered TTI",
  },
}

const TEST_TYPES: TestType[] = ["sequential_tti", "burst_tti", "staggered_tti"]
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

export function BenchmarkDashboard({ datasets, providerLogos, providerLogosDark }: BenchmarkDashboardProps) {
  const [selectedTest, setSelectedTest] = useState<TestType>("sequential_tti")
  const [selectedMetric, setSelectedMetric] = useState<Metric>("compositeScore")
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>("all")

  const currentData = datasets[selectedTest]

  const visibleResults = useMemo(
    () => currentData.active.filter((r) => !hiddenProviders.has(r.provider)),
    [currentData.active, hiddenProviders]
  )

  const toggleProvider = (provider: string) => {
    setHiddenProviders((prev) => {
      const next = new Set(prev)
      next.has(provider) ? next.delete(provider) : next.add(provider)
      return next
    })
  }

  const handleTestTypeChange = (testType: TestType) => {
    setSelectedTest(testType)
    setHiddenProviders(new Set())
  }

  return (
    <div className="not-content">
      {/* Test type selector — border-separated section */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="md:max-w-7xl md:mx-auto py-2 mb-3 px-4 md:px-6">
          <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5">
            {TEST_TYPES.map((testType) => (
              <button
                key={testType}
                type="button"
                onClick={() => handleTestTypeChange(testType)}
                className={`px-3 py-1 rounded text-xs md:text-sm font-medium transition-colors ${
                  selectedTest === testType
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {TEST_TYPE_LABELS[testType].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Provider ranked cards */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="md:max-w-7xl md:mx-auto py-3 px-0 md:py-4">
          <BenchmarkProviderToggle
            activeResults={currentData.active}
            providerLogos={providerLogos}
            providerLogosDark={providerLogosDark}
            selectedMetric={selectedMetric}
            onMetricChange={setSelectedMetric}
          />
        </div>
      </div>

      {/* Main content sections */}
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {/* Performance Over Time */}
        {currentData.historyData.length > 0 && (
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">
                Performance Over Time
              </h3>
              <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-0.5">
                {TIME_RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimeRange(value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      timeRange === value
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <BenchmarkChart
              historyData={currentData.historyData}
              providers={currentData.chartProviders}
              hiddenProviders={hiddenProviders}
              onToggleProvider={toggleProvider}
              timeRange={timeRange}
              selectedMetric={selectedMetric}
            />
          </div>
        )}

        {/* Bar chart */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
          <BenchmarkBarChart activeResults={visibleResults} selectedMetric={selectedMetric} />
        </div>

        {/* Data table */}
        <div className="py-6 md:py-8">
          <BenchmarkDataTable
            activeResults={visibleResults}
            providerLogos={providerLogos}
            providerLogosDark={providerLogosDark}
          />
        </div>
      </div>
    </div>
  )
}
