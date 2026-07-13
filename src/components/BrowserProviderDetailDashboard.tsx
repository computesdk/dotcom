import { useState, useMemo, useCallback } from "react"
import { Link, Check } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { BROWSER_PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { BrowserResult, BrowserHistoryPoint } from "./benchmarkConstants"

interface BrowserProviderDetailProps {
  provider: string
  result: BrowserResult
  historyData: BrowserHistoryPoint[]
}

type Percentile = "median" | "p95" | "p99"
type ChartScale = "full" | "zoom"
type PhaseMetric = "createMs" | "connectMs" | "navigateMs" | "releaseMs" | "totalMs"

const PHASE_LABELS: Record<PhaseMetric, string> = {
  createMs: "Create",
  connectMs: "Connect",
  navigateMs: "Navigate",
  releaseMs: "Release",
  totalMs: "Total",
}

function CopyableSectionHeading({ label, anchor, provider }: { label: string; anchor: string; provider: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(() => {
    const url = `${window.location.origin}/benchmarks/browsers/${provider}#${anchor}`
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
}: {
  values: number[]
  color: string
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
          label: `${Math.round(rangeStart)}ms`,
          count,
        })
    }
    return { buckets: result }
  }, [values])

  const config: ChartConfig = { count: { label: "Count", color } }

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

function PhaseSection({
  provider,
  metric,
  result,
  historyData,
  values,
  color,
}: {
  provider: string
  metric: PhaseMetric
  result: BrowserResult
  historyData: BrowserHistoryPoint[]
  values: number[]
  color: string
}) {
  const [selectedPercentile, setSelectedPercentile] = useState<Percentile>("median")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
  const keySuffix = selectedPercentile === "median" ? "" : `_${selectedPercentile}`
  const dataKey = `${provider}_${metric}${keySuffix}`
  const metricSummary = result.summary[metric]
  const lineConfig: ChartConfig = { [provider]: { label: capitalize(provider), color } }
  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom" || historyData.length === 0) return null
    const values: number[] = []
    for (const point of historyData) {
      const value = point[dataKey]
      if (typeof value === "number" && Number.isFinite(value)) values.push(value)
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(max - min, 25)
    const pad = Math.max(spread * 0.15, 50)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, historyData, dataKey])
  const successRate = result.successRate ?? (
    result.iterations
      ? result.iterations.filter((i) => !i.error).length / result.iterations.length
      : 1
  )

  return (
    <div id={metric} className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0">
          <CopyableSectionHeading label={`${PHASE_LABELS[metric]} Latency`} anchor={metric} provider={provider} />
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
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              onClick={() => setSelectedPercentile("median")}
              className={`rounded-lg border px-4 py-3 text-left transition-all ${
                selectedPercentile === "median"
                  ? "border-gray-900 dark:border-white bg-white dark:bg-gray-800 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Median</div>
              <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">{(metricSummary.median / 1000).toFixed(2)}s</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPercentile("p95")}
              className={`rounded-lg border px-4 py-3 text-left transition-all ${
                selectedPercentile === "p95"
                  ? "border-gray-900 dark:border-white bg-white dark:bg-gray-800 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P95</div>
              <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">{(metricSummary.p95 / 1000).toFixed(2)}s</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPercentile("p99")}
              className={`rounded-lg border px-4 py-3 text-left transition-all ${
                selectedPercentile === "p99"
                  ? "border-gray-900 dark:border-white bg-white dark:bg-gray-800 shadow-sm"
                  : "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P99</div>
              <div className="mt-1 font-mono text-xl font-semibold text-gray-900 dark:text-white">{(metricSummary.p99 / 1000).toFixed(2)}s</div>
            </button>
          </div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{PHASE_LABELS[metric]} {selectedPercentile.toUpperCase()} Over Time</h3>
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 mb-3">
            {([
              { value: "full", label: "Full" },
              { value: "zoom", label: "Zoom" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setChartScale(value)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white dark:ring-offset-gray-950 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 ${
                  chartScale === value
                    ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                    : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ChartContainer config={lineConfig} className="aspect-auto h-[240px] w-full min-h-[240px] min-w-0">
            <LineChart data={historyData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
              <YAxis domain={chartScale === "zoom" && lineZoomDomain ? lineZoomDomain : undefined} tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`} />
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
                          <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">{(v / 1000).toFixed(2)}s</span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: color }} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="min-w-0 overflow-hidden flex flex-col justify-end">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Iteration Distribution</h3>
          <IterationHistogram values={values} color={color} />
        </div>
      </div>
    </div>
  )
}

export function BrowserProviderDetailDashboard({
  provider,
  result,
  historyData,
}: BrowserProviderDetailProps) {
  const color = BROWSER_PROVIDER_COLORS[provider] || "#6b7280"

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

  const connectValues = useMemo(
    () => result.iterations?.filter((i) => !i.error).map((i) => i.connectMs) ?? [],
    [result.iterations]
  )
  const releaseValues = useMemo(
    () => result.iterations?.filter((i) => !i.error).map((i) => i.releaseMs) ?? [],
    [result.iterations]
  )
  return (
    <div className="not-content mt-0">
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {historyData.length > 0 && result.iterations && result.iterations.length > 0 && (
          <>
            <PhaseSection provider={provider} metric="createMs" result={result} historyData={historyData} values={createValues} color={color} />
            <PhaseSection provider={provider} metric="connectMs" result={result} historyData={historyData} values={connectValues} color={color} />
            <PhaseSection provider={provider} metric="navigateMs" result={result} historyData={historyData} values={navigateValues} color={color} />
            <PhaseSection provider={provider} metric="releaseMs" result={result} historyData={historyData} values={releaseValues} color={color} />
            <PhaseSection provider={provider} metric="totalMs" result={result} historyData={historyData} values={totalValues} color={color} />
          </>
        )}
      </div>
    </div>
  )
}
