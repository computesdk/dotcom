import { useState, useMemo, useEffect, useRef } from "react"
import { Info } from "lucide-react"
import { BenchmarkBarChart } from "./BenchmarkBarChart"
import { BenchmarkChart } from "./BenchmarkChart"
import { BenchmarkDataTable } from "./BenchmarkDataTable"
import { BenchmarkProviderToggle } from "./BenchmarkProviderToggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { METRIC_LABELS } from "./benchmarkConstants"
import type { ProviderResult, HistoryDataPoint, Metric } from "./benchmarkConstants"

type TestType = "sequential_tti" | "burst_tti" | "staggered_tti"
type TimeRange = "30" | "60" | "90" | "all"
type ChartScale = "full" | "zoom"

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

const TEST_TYPE_LABELS: Record<TestType, { label: string; description: string }> = {
  sequential_tti: {
    label: "Sequential TTI",
    description: "Sandboxes launched one at a time, waiting for each to become interactive before starting the next.",
  },
  burst_tti: {
    label: "Burst TTI",
    description: "All sandboxes launched concurrently in a single burst.",
  },
  staggered_tti: {
    label: "Staggered TTI",
    description: "Sandboxes launched with 200ms delays between each.",
  },
}

const TEST_TYPES: TestType[] = ["sequential_tti", "burst_tti", "staggered_tti"]
const METRICS: Metric[] = ["compositeScore", "median", "p95", "p99"]
const METRIC_DESCRIPTIONS: Record<Metric, string> = {
  compositeScore: "Weighted blend of timing metrics × success rate. Higher is better.",
  median: "The middle value — 50% of iterations completed at or below this time.",
  p95: "95th percentile — the typical worst-case latency most users will experience.",
  p99: "99th percentile — extreme tail latency, highlighting rare outlier spikes.",
}
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

export function BenchmarkDashboard({ datasets, providerLogos, providerLogosDark }: BenchmarkDashboardProps) {
  const [selectedTest, setSelectedTest] = useState<TestType>("burst_tti")
  const [selectedMetric, setSelectedMetric] = useState<Metric>("compositeScore")
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

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
    <div className="not-content mt-0">
      {/* Sentinel element — when it scrolls out of view, the controls become fixed */}
      <div ref={sentinelRef} className="h-0" />
      {/* Spacer to prevent content jump when controls become fixed */}
      {isStuck && <div className="h-[57px]" />}
      {/* Test type dropdown + metric selector */}
      <div className={`${isStuck ? "fixed top-0 left-0 right-0 z-50" : ""} bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/50`}>
        <div className="md:max-w-7xl md:mx-auto py-3 px-4 md:px-6 flex items-center gap-3">
          <Select value={selectedTest} onValueChange={(value) => handleTestTypeChange(value as TestType)}>
            <SelectTrigger className="w-[150px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_TYPES.map((testType) => (
                <SelectItem key={testType} value={testType} className="text-sm">
                  {TEST_TYPE_LABELS[testType].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Metric: dropdown on mobile, tabs on sm+ */}
          <div className="sm:hidden">
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as Metric)}>
              <SelectTrigger className="w-[170px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((metric) => (
                  <SelectItem key={metric} value={metric} className="text-sm" title={METRIC_DESCRIPTIONS[metric]}>
                    <div>
                      <div>{METRIC_LABELS[metric]}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">{METRIC_DESCRIPTIONS[metric]}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden sm:inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
            {METRICS.map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => setSelectedMetric(metric)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${
                  selectedMetric === metric
                    ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                    : "bg-gray-100 dark:bg-gray-800 hover:text-gray-950 dark:hover:text-gray-50"
                }`}
              >
                {METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
          <a href="#methodology" className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-900 hover:text-gray-400 dark:hover:text-gray-300 transition-colors underline">
            <Info size={14} />
            Details
          </a>
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
          />
        </div>
      </div>

      {/* Main content sections */}
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {/* Performance Over Time */}
        {currentData.historyData.length > 0 && (
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-md font-semibold text-gray-900 dark:text-white">
                Performance Over Time
              </h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  {([
                    { value: "full", label: "Full" },
                    { value: "zoom", label: "Zoom" },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChartScale(value)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm text-gray-600 font-medium ring-offset-white dark:ring-offset-gray-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${
                        chartScale === value
                          ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                          : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  {TIME_RANGES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTimeRange(value)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm text-gray-600 font-medium ring-offset-white dark:ring-offset-gray-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${
                        timeRange === value
                          ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                          : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <BenchmarkChart
              historyData={currentData.historyData}
              providers={currentData.chartProviders}
              hiddenProviders={hiddenProviders}
              onToggleProvider={toggleProvider}
              timeRange={timeRange}
              selectedMetric={selectedMetric}
              scaleMode={chartScale}
            />
          </div>
        )}

        {/* Bar chart */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
          <BenchmarkBarChart activeResults={visibleResults} selectedMetric={selectedMetric} />
        </div>

        {/* Data table */}
        <div className="py-6 md:py-8">
          <BenchmarkDataTable activeResults={visibleResults} />
        </div>
      </div>
    </div>
  )
}
