import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { SNAPSHOT_FORK_PROVIDER_COLORS, SNAPSHOT_FORK_METRIC_LABELS, capitalize } from "./benchmarkConstants"
import type { SnapshotForkResult, SnapshotForkHistoryPoint, SnapshotForkMetric } from "./benchmarkConstants"

type ChartScale = "full" | "zoom"

interface Props {
  provider: string
  result: SnapshotForkResult
  historyData: SnapshotForkHistoryPoint[]
}

const TIMED_METRICS: SnapshotForkMetric[] = [
  "snapshotCreateMs",
  "forkFromSnapshotMs",
  "forkFromLiveMs",
  "forkFirstReadMs",
]

function StatCard({
  label,
  value,
  sublabel,
  sublabel2,
}: {
  label: string
  value: string
  sublabel?: string
  sublabel2?: string
}) {
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
}: {
  values: number[]
  color: string
}) {
  const buckets = useMemo(() => {
    const valid = values.filter((v) => v > 0)
    if (valid.length === 0) return []

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

    return Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      label: `${((min + i * bucketSize) / 1000).toFixed(2)}s`,
      count: bucketMap.get(i) || 0,
    }))
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
                <div className="font-medium text-gray-900 dark:text-white">{d.label}</div>
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

export function StorageSnapshotForkProviderDetailDashboard({ provider, result, historyData }: Props) {
  const [selectedMetric, setSelectedMetric] = useState<SnapshotForkMetric>("snapshotCreateMs")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
  const color = SNAPSHOT_FORK_PROVIDER_COLORS[provider] || "#6b7280"

  const lineConfig: ChartConfig = {
    [provider]: { label: capitalize(provider), color },
  }

  const successRate = result.successRate ?? (
    result.iterations
      ? result.iterations.filter((i) => !i.error && i.verified).length / result.iterations.length
      : 1
  )

  const iterValues = useMemo(() => {
    const iters = result.iterations?.filter((i) => !i.error) ?? []
    return {
      snapshotCreateMs: iters.map((i) => i.snapshotCreateMs),
      forkFromSnapshotMs: iters.map((i) => i.forkFromSnapshotMs),
      forkFromLiveMs: iters.map((i) => i.forkFromLiveMs),
      forkFirstReadMs: iters.map((i) => i.forkFirstReadMs),
    }
  }, [result.iterations])

  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom" || historyData.length === 0) return null
    const key = `${provider}_${selectedMetric}`
    const values: number[] = []
    for (const point of historyData) {
      const v = point[key]
      if (typeof v === "number" && Number.isFinite(v)) values.push(v)
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(max - min, 100)
    const pad = Math.max(spread * 0.15, 100)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, historyData, provider, selectedMetric])

  return (
    <div className="not-content">
      {/* Stat cards */}
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white m-0">Small Dataset (10 × 1 MB)</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Snapshot Create"
            value={`${(result.summary.snapshotCreateMs.median / 1000).toFixed(2)}s`}
            sublabel={`P95: ${(result.summary.snapshotCreateMs.p95 / 1000).toFixed(2)}s`}
            sublabel2={`P99: ${(result.summary.snapshotCreateMs.p99 / 1000).toFixed(2)}s`}
          />
          <StatCard
            label="Fork (from snapshot)"
            value={`${(result.summary.forkFromSnapshotMs.median / 1000).toFixed(2)}s`}
            sublabel={`P95: ${(result.summary.forkFromSnapshotMs.p95 / 1000).toFixed(2)}s`}
            sublabel2={`P99: ${(result.summary.forkFromSnapshotMs.p99 / 1000).toFixed(2)}s`}
          />
          <StatCard
            label="Fork (from live)"
            value={`${(result.summary.forkFromLiveMs.median / 1000).toFixed(2)}s`}
            sublabel={`P95: ${(result.summary.forkFromLiveMs.p95 / 1000).toFixed(2)}s`}
            sublabel2={`P99: ${(result.summary.forkFromLiveMs.p99 / 1000).toFixed(2)}s`}
          />
          <StatCard
            label="First Read"
            value={`${(result.summary.forkFirstReadMs.median / 1000).toFixed(2)}s`}
            sublabel={`P95: ${(result.summary.forkFirstReadMs.p95 / 1000).toFixed(2)}s`}
            sublabel2={`P99: ${(result.summary.forkFirstReadMs.p99 / 1000).toFixed(2)}s`}
          />
        </div>
        {result.compositeScore != null && (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Composite score: <span className="font-mono font-semibold text-gray-900 dark:text-white">{result.compositeScore.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* History chart */}
      {historyData.length > 0 && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Performance Over Time</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  {TIMED_METRICS.map((m) => (
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
                      {SNAPSHOT_FORK_METRIC_LABELS[m]}
                    </button>
                  ))}
                </div>
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  {([
                    { value: "full", label: "Full" },
                    { value: "zoom", label: "Zoom" },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChartScale(value)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all ${
                        chartScale === value
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
            <ChartContainer config={lineConfig} className="aspect-auto h-[240px] w-full min-h-[240px] min-w-0">
              <LineChart data={historyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis
                  domain={chartScale === "zoom" && lineZoomDomain ? lineZoomDomain : undefined}
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
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />
                              <span className="text-gray-500 dark:text-gray-400">{capitalize(provider)}</span>
                            </div>
                            <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                              {(v / 1000).toFixed(2)}s
                            </span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TIMED_METRICS.map((metric) => (
                <div key={metric}>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    {SNAPSHOT_FORK_METRIC_LABELS[metric]}
                  </h3>
                  <IterationHistogram values={iterValues[metric]} color={color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
