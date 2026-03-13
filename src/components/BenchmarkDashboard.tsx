import { useState } from "react"
import { BenchmarkLeaderboard } from "./BenchmarkLeaderboard"
import { BenchmarkBarChart } from "./BenchmarkBarChart"
import { BenchmarkChart } from "./BenchmarkChart"

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
  compositeScore?: number
  successRate?: number
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{ ttiMs: number; error?: string }>
}

interface HistoryDataPoint {
  date: string
  [provider: string]: number | string
}

type TestType = "sequential_tti" | "burst_tti" | "staggered_tti"

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
    label: "Sequential",
    description: "Sandboxes launched one at a time",
  },
  burst_tti: {
    label: "Burst",
    description: "All sandboxes launched concurrently",
  },
  staggered_tti: {
    label: "Staggered",
    description: "Sandboxes launched with 200ms delays",
  },
}

const TEST_TYPES: TestType[] = ["sequential_tti", "burst_tti", "staggered_tti"]

export function BenchmarkDashboard({ datasets, providerLogos, providerLogosDark }: BenchmarkDashboardProps) {
  const [selectedTest, setSelectedTest] = useState<TestType>("sequential_tti")

  const currentData = datasets[selectedTest]

  return (
    <div>
      {/* Test type selector */}
      <div className="not-content flex flex-col items-center gap-2 mt-6 mb-2">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          {TEST_TYPES.map((testType) => (
            <button
              key={testType}
              type="button"
              onClick={() => setSelectedTest(testType)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedTest === testType
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {TEST_TYPE_LABELS[testType].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {TEST_TYPE_LABELS[selectedTest].description}
        </p>
      </div>

      <BenchmarkLeaderboard
        activeResults={currentData.active}
        providerLogos={providerLogos}
        providerLogosDark={providerLogosDark}
      />

      <BenchmarkBarChart activeResults={currentData.active} />

      {currentData.historyData.length > 0 && (
        <div className="py-8 px-4">
          <BenchmarkChart
            historyData={currentData.historyData}
            providers={currentData.chartProviders}
          />
        </div>
      )}
    </div>
  )
}