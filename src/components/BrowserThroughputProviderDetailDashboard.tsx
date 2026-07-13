import { useState, useMemo, useCallback } from "react"
import { Link, Check } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { BROWSER_THROUGHPUT_PROVIDER_COLORS, ACTION_TYPE_LABELS, capitalize } from "./benchmarkConstants"
import type { BrowserThroughputResult, BrowserThroughputHistoryPoint, ActionType } from "./benchmarkConstants"

interface BrowserThroughputProviderDetailProps {
  provider: string
  result: BrowserThroughputResult
  historyData: BrowserThroughputHistoryPoint[]
}

type Percentile = "median" | "p95" | "p99"
type ChartScale = "full" | "zoom"

type ThroughputMetricKey = "actionsPerSecond" | "taskMs" | "totalMs"

const THROUGHPUT_METRIC_LABELS: Record<ThroughputMetricKey, string> = {
  actionsPerSecond: "Actions Per Second",
  taskMs: "Task Duration",
  totalMs: "Total Duration",
}

function CopyableSectionHeading({ label, anchor, provider }: { label: string; anchor: string; provider: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(() => {
    const url = `${window.location.origin}/benchmarks/browsers/browser-throughput/${provider}#${anchor}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [anchor, provider])

  return (
    <span className="relative">
      {copied && (
        <span className="absolute -top-7 left-0 px-2 py-0.5 rounded bg-gray-500 text-white text-[11px] font-medium whitespace-nowrap">
          Copied!
        </span>
      )}
      <button
        type="button"
        onClick={handleClick}
        className="group/heading pr-0 inline-flex items-center bg-transparent gap-2 text-base font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-gray-600 dark:hover:text-gray-500 transition-colors"
        title="Copy link to section"
      >
        {label}
        {copied ? <Check size={14} className="text-emerald-500" /> : <Link size={14} />}
      </button>
    </span>
  )
}

function IterationHistogram({
  values,
  color,
  unit,
}: {
  values: number[]
  color: string
  unit: "ms" | "aps"
}) {
  const { buckets } = useMemo(() => {
    const valid = values.filter((v) => v > 0)
    if (valid.length === 0) return { buckets: [] }

    const min = Math.min(...valid)
    const max = Math.max(...valid)
    const BUCKET_COUNT = 15
    const range = max - min
    const bucketSize = range > 0 ? (range / BUCKET_COUNT) : 1

    const bucketMap = new Map<number, number>()
    for (const val of valid) {
      const idx = range > 0 ? Math.min(Math.floor((val - min) / bucketSize), BUCKET_COUNT - 1) : 0
      bucketMap.set(idx, (bucketMap.get(idx) || 0) + 1)
    }

    const result = []
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const rangeStart = min + i * bucketSize
      const count = bucketMap.get(i) || 0
      const label = unit === "aps"
        ? `${rangeStart.toFixed(1)}/s`
        : `${Math.round(rangeStart / 1000)}s`
      result.push({ label, count })
    }
    return { buckets: result }
  }, [values, unit])

  const config: ChartConfig = { count: { label: "Sessions", color } }

  if (!buckets.length) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 dark:text-gray-500">
        No data to display.
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-[220px] w-full min-w-0">
      <BarChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={30} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload
            return (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-xs shadow-md">
                <div className="font-medium text-gray-900 dark:text-white">{d.label}</div>
                <div className="text-gray-500 dark:text-gray-400">{d.count} sessions</div>
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

function ThroughputSection({
  provider,
  metric,
  result,
  historyData,
  iterationValues,
  color,
}: {
  provider: string
  metric: ThroughputMetricKey
  result: BrowserThroughputResult
  historyData: BrowserThroughputHistoryPoint[]
  iterationValues: number[]
  color: string
}) {
  const [selectedPercentile, setSelectedPercentile] = useState<Percentile>("median")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
  const isAps = metric === "actionsPerSecond"
  const historyKey = `${provider}_${metric}`
  const summary = result.summary[metric]
  const lineConfig: ChartConfig = { [provider]: { label: capitalize(provider), color } }

  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom" || historyData.length === 0) return null
    const vals: number[] = []
    for (const point of historyData) {
      const v = point[historyKey]
      if (typeof v === "number" && Number.isFinite(v)) vals.push(v)
    }
    if (vals.length === 0) return null
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const spread = Math.max(max - min, isAps ? 0.5 : 500)
    const pad = Math.max(spread * 0.15, isAps ? 0.1 : 200)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, historyData, historyKey, isAps])

  const selectedValue = summary[selectedPercentile]

  const formatVal = (v: number) =>
    isAps ? `${v.toFixed(2)}/s` : `${(v / 1000).toFixed(2)}s`

  const successRate = useMemo(() => {
    const iters = result.iterations ?? []
    return iters.length > 0
      ? iters.filter((i) => i.actionsCompleted === 50).length / iters.length
      : 1
  }, [result.iterations])

  return (
    <div id={metric} className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0">
          <CopyableSectionHeading label={THROUGHPUT_METRIC_LABELS[metric]} anchor={metric} provider={provider} />
        </h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="min-w-0 overflow-hidden">
          {/* Percentile stat cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(["median", "p95", "p99"] as Percentile[]).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setSelectedPercentile(pct)}
                className={`rounded-lg border px-4 py-3 text-left transition-all ${
                  selectedPercentile === pct
                    ? "border-gray-900 dark:border-white bg-white dark:bg-gray-800 shadow-sm"
                    : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {pct === "median" ? "Median" : pct.toUpperCase()}
                </div>
                <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">
                  {formatVal(summary[pct])}
                </div>
              </button>
            ))}
          </div>

          {/* History chart */}
          {historyData.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {THROUGHPUT_METRIC_LABELS[metric]} Over Time
              </h3>
              <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 mb-3">
                {(["full", "zoom"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChartScale(value)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all ${
                      chartScale === value
                        ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                        : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                    }`}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
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
                    tickFormatter={(v: number) => isAps ? `${v.toFixed(1)}/s` : `${(v / 1000).toFixed(1)}s`}
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
                                {formatVal(v)}
                              </span>
                            </div>
                          )
                        }}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey={historyKey}
                    stroke={color}
                    strokeWidth={2}
                    dot={{ r: 3, strokeWidth: 0, fill: color }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls
                  />
                </LineChart>
              </ChartContainer>
            </>
          )}
        </div>

        <div className="min-w-0 overflow-hidden flex flex-col justify-end">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Session Distribution</h3>
          <IterationHistogram
            values={iterationValues}
            color={color}
            unit={isAps ? "aps" : "ms"}
          />
        </div>
      </div>
    </div>
  )
}

const ACTION_TYPES: ActionType[] = [
  "navigate",
  "waitForSelector",
  "screenshot",
  "textContent",
  "click",
  "goBack",
]

function PerActionSection({
  result,
  color,
}: {
  result: BrowserThroughputResult
  color: string
}) {
  return (
    <div id="per-action" className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Per-Action Type Latency</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Median latency per individual action type.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ACTION_TYPES.map((action) => {
          const stats = result.summary.perActionType[action]
          if (!stats) return null
          return (
            <div
              key={action}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-4"
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {ACTION_TYPE_LABELS[action]}
              </div>
              <div className="font-mono text-xl font-semibold text-gray-900 dark:text-white mb-2" style={{ color }}>
                {stats.median.toFixed(0)}ms
              </div>
              <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>p95 <span className="font-mono text-gray-700 dark:text-gray-300">{stats.p95.toFixed(0)}ms</span></span>
                <span>p99 <span className="font-mono text-gray-700 dark:text-gray-300">{stats.p99.toFixed(0)}ms</span></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BrowserThroughputProviderDetailDashboard({
  provider,
  result,
  historyData,
}: BrowserThroughputProviderDetailProps) {
  const color = BROWSER_THROUGHPUT_PROVIDER_COLORS[provider] || "#6b7280"

  const apsValues = useMemo(
    () => result.iterations?.map((i) => i.actionsPerSecond).filter((v) => v > 0) ?? [],
    [result.iterations]
  )
  const taskValues = useMemo(
    () => result.iterations?.map((i) => i.taskMs).filter((v) => v > 0) ?? [],
    [result.iterations]
  )
  const totalValues = useMemo(
    () => result.iterations?.map((i) => i.totalMs).filter((v) => v > 0) ?? [],
    [result.iterations]
  )

  return (
    <div className="not-content mt-0">
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        <ThroughputSection
          provider={provider}
          metric="actionsPerSecond"
          result={result}
          historyData={historyData}
          iterationValues={apsValues}
          color={color}
        />
        <ThroughputSection
          provider={provider}
          metric="taskMs"
          result={result}
          historyData={historyData}
          iterationValues={taskValues}
          color={color}
        />
        <ThroughputSection
          provider={provider}
          metric="totalMs"
          result={result}
          historyData={historyData}
          iterationValues={totalValues}
          color={color}
        />
        <PerActionSection result={result} color={color} />
      </div>
    </div>
  )
}
