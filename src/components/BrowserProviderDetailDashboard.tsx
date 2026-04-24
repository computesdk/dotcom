import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { BROWSER_PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { BrowserResult, BrowserHistoryPoint, BrowserMetric } from "./benchmarkConstants"

interface BrowserProviderDetailProps {
  provider: string
  result: BrowserResult
  historyData: BrowserHistoryPoint[]
}

const METRIC_LABELS: Record<BrowserMetric, string> = {
  createMs: "Create",
  connectMs: "Connect",
  navigateMs: "Navigate",
  releaseMs: "Release",
  totalMs: "Total",
  compositeScore: "Calculated Score",
}

function StatCard({ label, value, sublabel, sublabel2 }: { label: string; value: string; sublabel?: string; sublabel2?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 px-4 py-3">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Median</div>
      {sublabel && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sublabel}</div>}
      {sublabel2 && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sublabel2}</div>}
    </div>
  )
}

function IterationHistogram({
  values,
  color,
  unit,
}: {
  values: number[]
  color: string
  unit: string
}) {
  const { buckets } = useMemo(() => {
    const valid = values.filter((v) => v > 0)
    if (valid.length === 0) return { buckets: [] }

    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const BUCKET_COUNT = 15
    const range = max - min
    const bucketSize = range > 0 ? Math.ceil(range / BUCKET_COUNT) : 1

    const bucketMap = new Map<number, number>()
    for (const val of valid) {
      const idx = range > 0 ? Math.min(Math.floor((val - min) / bucketSize), BUCKET_COUNT - 1) : 0
      bucketMap.set(idx, (bucketMap.get(idx) || 0) + 1)
    }

    const result = []
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const rangeStart = min + i * bucketSize
      const count = bucketMap.get(i) || 0
      result.push({
        label: `${(rangeStart / 1000).toFixed(2)}s`,
        count,
      })
    }
    return { buckets: result }
  }, [values])

  const config: ChartConfig = { count: { label: "Count", color } }

  if (!buckets.length) {
    return (
      <div className="flex items-center justify-center h-[160px] text-sm text-gray-400 dark:text-gray-500">
        No data to display.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-[160px] w-full min-w-0">
      <BarChart data={buckets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-xs shadow-md">
                <div className="font-medium text-gray-900 dark:text-white">{d.label} {unit}</div>
                <div className="text-gray-500 dark:text-gray-400">{d.count} iterations</div>
              </div>
            )
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {buckets.map((_, i) => (
            <Cell key={i} fill={color} opacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

export function BrowserProviderDetailDashboard({
  provider,
  result,
  historyData,
}: BrowserProviderDetailProps) {
  const [selectedMetric, setSelectedMetric] = useState<BrowserMetric>("totalMs")
  const color = BROWSER_PROVIDER_COLORS[provider] || "#6b7280"

  const lineConfig: ChartConfig = {
    [provider]: { label: capitalize(provider), color },
  }

  const createValues = useMemo(
    () => result.iterations?.filter((i) => !i.error).map((i) => i.createMs) ?? [],
    [result.iterations]
  )
  const navigateValues = useMemo(
    () => result.iterations?.filter((i) => !i.error).map((i) => i.navigateMs) ?? [],
    [result.iterations]
  )
  const totalValues = useMemo(
    () => result.iterations?.filter((i) => !i.error).map((i) => i.totalMs) ?? [],
    [result.iterations]
  )

  const HISTORY_METRICS: BrowserMetric[] = ["totalMs", "createMs", "connectMs", "navigateMs", "releaseMs"]

  return (
    <div className="not-content">
      {/* Stat cards */}
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
        {(() => {
          const successRate = result.successRate ?? (
            result.iterations
              ? result.iterations.filter((i) => !i.error).length / result.iterations.length
              : 1
          )
          return (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white m-0">Browser Session</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                  successRate >= 0.95
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : successRate >= 0.8
                      ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                }`}>
                  {Math.round(successRate * 100)}% success
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard
                  label="Create"
                  value={`${result.summary.createMs.median.toFixed(0)}ms`}
                  sublabel={`P95: ${result.summary.createMs.p95.toFixed(0)}ms`}
                  sublabel2={`P99: ${result.summary.createMs.p99.toFixed(0)}ms`}
                />
                <StatCard
                  label="Connect"
                  value={`${result.summary.connectMs.median.toFixed(0)}ms`}
                  sublabel={`P95: ${result.summary.connectMs.p95.toFixed(0)}ms`}
                  sublabel2={`P99: ${result.summary.connectMs.p99.toFixed(0)}ms`}
                />
                <StatCard
                  label="Navigate"
                  value={`${result.summary.navigateMs.median.toFixed(0)}ms`}
                  sublabel={`P95: ${result.summary.navigateMs.p95.toFixed(0)}ms`}
                  sublabel2={`P99: ${result.summary.navigateMs.p99.toFixed(0)}ms`}
                />
                <StatCard
                  label="Release"
                  value={`${result.summary.releaseMs.median.toFixed(0)}ms`}
                  sublabel={`P95: ${result.summary.releaseMs.p95.toFixed(0)}ms`}
                  sublabel2={`P99: ${result.summary.releaseMs.p99.toFixed(0)}ms`}
                />
                <StatCard
                  label="Total"
                  value={`${result.summary.totalMs.median.toFixed(0)}ms`}
                  sublabel={`P95: ${result.summary.totalMs.p95.toFixed(0)}ms`}
                  sublabel2={`P99: ${result.summary.totalMs.p99.toFixed(0)}ms`}
                />
              </div>
            </>
          )
        })()}
      </div>

      {/* History chart */}
      {historyData.length > 0 && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Performance Over Time</h2>
              <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 overflow-x-auto">
                {HISTORY_METRICS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMetric(m)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                      selectedMetric === m
                        ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                        : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                    }`}
                  >
                    {METRIC_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>
            <ChartContainer config={lineConfig} className="aspect-auto h-[240px] w-full min-h-[240px] min-w-0">
              <LineChart data={historyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => v}
                      formatter={(value) => {
                        const v = value as number
                        const formatted = `${v.toFixed(0)}ms`
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
                              <span className="text-gray-500 dark:text-gray-400">{capitalize(provider)}</span>
                            </div>
                            <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">{formatted}</span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey={`${provider}_${selectedMetric}`}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: color }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Iteration distributions */}
      {result.iterations && result.iterations.length > 0 && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
              Iteration Distribution
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Create Latency</h3>
                <IterationHistogram values={createValues} color={color} unit="ms" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Navigate Latency</h3>
                <IterationHistogram values={navigateValues} color={color} unit="ms" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Total Latency</h3>
                <IterationHistogram values={totalValues} color={color} unit="ms" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
