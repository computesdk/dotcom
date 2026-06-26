import { useState, useMemo, useEffect, useRef } from "react"
import { Info } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  BROWSER_THROUGHPUT_PROVIDER_COLORS,
  BROWSER_THROUGHPUT_METRIC_LABELS,
  ACTION_TYPE_LABELS,
  capitalize,
  type BrowserThroughputMetric,
  type BrowserThroughputResult,
  type BrowserThroughputHistoryPoint,
  type ActionType,
} from "./benchmarkConstants"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import type { ChartConfig } from "./ui/chart"
import { BrowserThroughputDataTable } from "./BrowserThroughputDataTable"

type TimeRange = "30" | "60" | "90" | "all"
type CompositeScale = "full" | "zoom"

interface BrowserThroughputData {
  active: BrowserThroughputResult[]
  historyData: BrowserThroughputHistoryPoint[]
  timestamp: string
}

interface BrowserThroughputDashboardProps {
  data: BrowserThroughputData
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
  currentBenchmark: "lifecycle" | "throughput"
}

const COMING_SOON_PROVIDERS: { slug: string; name: string }[] = [
  { slug: "browser-use", name: "Browser Use" },
  { slug: "anchor-browser", name: "Anchor Browser" },
]

const METRICS: BrowserThroughputMetric[] = [
  "compositeScore",
  "actionsPerSecond",
  "taskMs",
  "totalMs",
  "screenshotMs",
]

const METRIC_DESCRIPTIONS: Record<BrowserThroughputMetric, string> = {
  compositeScore: "Weighted blend of throughput, task duration, p95 consistency, and screenshot speed × success rate. Higher is better.",
  actionsPerSecond: "Median sequential actions completed per second inside a session. Higher is better.",
  taskMs: "Median wall-clock time to complete all 50 actions. Lower is better.",
  totalMs: "Median end-to-end session time including create and release. Lower is better.",
  screenshotMs: "Median screenshot capture latency — proxy for vision-agent cost. Lower is better.",
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

const ACTION_TYPES: ActionType[] = [
  "navigate",
  "waitForSelector",
  "screenshot",
  "textContent",
  "click",
  "goBack",
]

function isHigherBetter(metric: BrowserThroughputMetric): boolean {
  return metric === "compositeScore" || metric === "actionsPerSecond"
}

function getMetricValue(r: BrowserThroughputResult, metric: BrowserThroughputMetric): number {
  switch (metric) {
    case "compositeScore": return r.compositeScore ?? 0
    case "actionsPerSecond": return r.summary.actionsPerSecond.median
    case "taskMs": return r.summary.taskMs.median
    case "totalMs": return r.summary.totalMs.median
    case "screenshotMs": return r.summary.perActionType.screenshot?.median ?? 0
  }
}

function formatThroughputValue(value: number, metric: BrowserThroughputMetric): string {
  if (metric === "compositeScore") return value.toFixed(1)
  if (metric === "actionsPerSecond") return `${value.toFixed(2)}/s`
  return `${(value / 1000).toFixed(2)}s`
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [breakpoint])
  return isMobile
}

const BROWSER_BENCHMARK_LABELS: Record<"lifecycle" | "throughput", string> = {
  lifecycle: "Lifecycle",
  throughput: "Throughput",
}

const BROWSER_BENCHMARK_URLS: Record<"lifecycle" | "throughput", string> = {
  lifecycle: "/benchmarks/browsers",
  throughput: "/benchmarks/browsers/browser-throughput",
}

export function BrowserThroughputDashboard({
  data,
  providerLogos,
  providerLogosDark,
  currentBenchmark,
}: BrowserThroughputDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<BrowserThroughputMetric>("compositeScore")
  const [compositeScale, setCompositeScale] = useState<CompositeScale>("zoom")
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [isStuck, setIsStuck] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

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

  const toggleProvider = (provider: string) => {
    setHiddenProviders((prev) => {
      const next = new Set(prev)
      next.has(provider) ? next.delete(provider) : next.add(provider)
      return next
    })
  }

  const visibleResults = useMemo(
    () => data.active.filter((r) => !hiddenProviders.has(r.provider)),
    [data.active, hiddenProviders]
  )

  const providers = useMemo(() => data.active.map((r) => r.provider), [data.active])

  const isHigher = isHigherBetter(selectedMetric)
  const isComposite = selectedMetric === "compositeScore"
  const isAps = selectedMetric === "actionsPerSecond"

  const chartData = useMemo(() => {
    const rows = visibleResults.map((r) => ({
      provider: r.provider,
      displayName: capitalize(r.provider),
      value: getMetricValue(r, selectedMetric),
      compositeScore: r.compositeScore ?? 0,
      actionsPerSecond: r.summary.actionsPerSecond.median,
      taskMs: r.summary.taskMs.median,
      totalMs: r.summary.totalMs.median,
      screenshotMs: r.summary.perActionType.screenshot?.median ?? 0,
    }))
    return rows.sort((a, b) => isHigher ? b.value - a.value : a.value - b.value)
  }, [visibleResults, selectedMetric, isHigher])

  const barChartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: BROWSER_THROUGHPUT_METRIC_LABELS[selectedMetric] } }
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: BROWSER_THROUGHPUT_PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [data.active, selectedMetric])

  const maxBarValue = useMemo(() => Math.max(...chartData.map((d) => d.value)), [chartData])
  const barChartHeight = Math.max(200, chartData.length * 50 + 60)

  const lineChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const provider of providers) {
      config[provider] = {
        label: capitalize(provider),
        color: BROWSER_THROUGHPUT_PROVIDER_COLORS[provider] || "#6b7280",
      }
    }
    return config
  }, [providers])

  const filteredHistory = useMemo(() => {
    if (timeRange === "all") return data.historyData
    const days = parseInt(timeRange, 10)
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setDate(now.getDate() - days)
    return data.historyData.filter((point) => {
      if (typeof point.dateTs === "number") return point.dateTs >= cutoff.getTime()
      return true
    })
  }, [data.historyData, timeRange])

  const compositeZoomDomain = useMemo<[number, number] | null>(() => {
    if (selectedMetric !== "compositeScore" || compositeScale !== "zoom" || filteredHistory.length === 0) return null
    const values: number[] = []
    for (const point of filteredHistory) {
      for (const provider of providers) {
        if (hiddenProviders.has(provider)) continue
        const value = point[`${provider}_compositeScore`]
        if (typeof value === "number" && Number.isFinite(value)) values.push(value)
      }
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(max - min, 0.1)
    const pad = Math.max(spread * 0.15, 0.5)
    return [Math.max(0, min - pad), Math.min(100, max + pad)]
  }, [selectedMetric, compositeScale, filteredHistory, providers, hiddenProviders])

  // Per-action type breakdown data
  const actionBreakdownData = useMemo(() => {
    return ACTION_TYPES.map((action) => {
      const row: Record<string, string | number> = { action: ACTION_TYPE_LABELS[action] }
      for (const r of data.active) {
        row[r.provider] = r.summary.perActionType[action]?.median ?? 0
      }
      return row
    })
  }, [data.active])

  const actionBreakdownConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: BROWSER_THROUGHPUT_PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [data.active])

  const historyMetricKey = selectedMetric === "compositeScore"
    ? "compositeScore"
    : selectedMetric === "actionsPerSecond"
    ? "actionsPerSecond"
    : selectedMetric === "screenshotMs"
    ? "screenshotMs"
    : selectedMetric === "taskMs"
    ? "taskMs"
    : "totalMs"

  return (
    <div className="not-content mt-0">
      <div ref={sentinelRef} className="h-0" />
      {isStuck && <div className="h-[57px]" />}

      {/* Sticky metric selector */}
      <div className={`${isStuck ? "fixed top-0 left-0 right-0 z-50" : ""} bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/50`}>
        <div className="md:max-w-7xl md:mx-auto py-3 px-4 md:px-6 flex items-center gap-3">
          <Select
            value={currentBenchmark}
            onValueChange={(value) => {
              window.location.href = BROWSER_BENCHMARK_URLS[value as "lifecycle" | "throughput"]
            }}
          >
            <SelectTrigger className="w-[140px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["lifecycle", "throughput"] as const).map((type) => (
                <SelectItem key={type} value={type} className="text-sm">
                  {BROWSER_BENCHMARK_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                {BROWSER_THROUGHPUT_METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
          <div className="sm:hidden">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as BrowserThroughputMetric)}>
              <SelectTrigger className="w-[180px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((metric) => (
                  <SelectItem key={metric} value={metric} className="text-sm">
                    <div>
                      <div>{BROWSER_THROUGHPUT_METRIC_LABELS[metric]}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">{METRIC_DESCRIPTIONS[metric]}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <a href="#methodology" className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-900 hover:text-gray-400 dark:hover:text-gray-300 transition-colors underline">
            <Info size={14} />
            Details
          </a>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="md:max-w-7xl md:mx-auto py-4">
          <div className="flex items-center justify-between mb-3 px-4 md:px-6">
            <h2 className="text-base md:text-md font-semibold text-gray-900 dark:text-white">
              Provider Leaderboard
            </h2>
          </div>
          {(() => {
            const ranked = [...data.active]
              .map((r) => ({ ...r, metricValue: getMetricValue(r, selectedMetric) }))
              .sort((a, b) => isHigher ? b.metricValue - a.metricValue : a.metricValue - b.metricValue)

            const activeSlugs = new Set(data.active.map((r) => r.provider))
            const comingSoon = COMING_SOON_PROVIDERS.filter((p) => !activeSlugs.has(p.slug))

            const renderComingSoonCard = ({ slug, name }: { slug: string; name: string }) => {
              const logoLight = providerLogos[slug]
              const logoDark = providerLogosDark[slug]
              return (
                <div
                  key={`coming-soon-${slug}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30"
                >
                  <div className="shrink-0 w-6 text-center">
                    <span className="text-sm font-mono font-medium text-gray-400 dark:text-gray-600">—</span>
                  </div>
                  <div className="shrink-0 w-40 flex items-center">
                    {logoLight ? (
                      <>
                        <img src={logoLight} alt={`${name} logo`} className="w-full h-full object-contain scale-80 dark:hidden" />
                        <img src={logoDark || logoLight} alt="" className="w-full h-full object-contain scale-80 hidden dark:block" />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0">
                    <span className="inline-block text-[10px] uppercase tracking-wide font-medium text-gray-500 dark:text-gray-400 px-3 py-2.5 rounded-full border border-gray-200 dark:border-gray-700">
                      Coming soon
                    </span>
                  </div>
                </div>
              )
            }

            const renderCard = (result: typeof ranked[0], index: number) => {
              const logoLight = providerLogos[result.provider]
              const logoDark = providerLogosDark[result.provider]
              return (
                <a
                  key={result.provider}
                  href={`/benchmarks/browsers/browser-throughput/${result.provider}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-gray-50 hover:shadow-sm dark:hover:bg-gray-800/50 transition-colors no-underline cursor-pointer ${
                    index === 0
                      ? "dark:bg-gray-700/50 border-gray-200 dark:border-gray-700/50 shadow-sm"
                      : "bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700/50"
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
                        <img src={logoLight} alt={`${capitalize(result.provider)} logo`} className="w-full h-full object-contain scale-80 dark:hidden" />
                        <img src={logoDark || logoLight} alt="" className="w-full h-full object-contain scale-80 hidden dark:block" />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: BROWSER_THROUGHPUT_PROVIDER_COLORS[result.provider] || "#6b7280" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{capitalize(result.provider)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0 flex flex-col items-end">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {formatThroughputValue(result.metricValue, selectedMetric)}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {BROWSER_THROUGHPUT_METRIC_LABELS[selectedMetric]}
                    </span>
                  </div>
                  <svg className="size-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </a>
              )
            }

            const allCards = [
              ...ranked.map((r, i) => renderCard(r, i)),
              ...comingSoon.map(renderComingSoonCard),
            ]
            const splitAt = Math.ceil(allCards.length / 2)
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 px-4 md:px-6">
                <div className="flex flex-col gap-2">{allCards.slice(0, splitAt)}</div>
                <div className="flex flex-col gap-2">{allCards.slice(splitAt)}</div>
              </div>
            )
          })()}
        </div>
      </div>

      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">

        {/* Performance Over Time */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-md font-semibold text-gray-900 dark:text-white">
              Performance Over Time
            </h2>
            <div className="flex items-center gap-2">
              {selectedMetric === "compositeScore" && (
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  {(["full", "zoom"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCompositeScale(value)}
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm text-gray-600 font-medium transition-all ${
                        compositeScale === value
                          ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                          : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
                      }`}
                    >
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                {TIME_RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimeRange(value)}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm text-gray-600 font-medium transition-all ${
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
          {filteredHistory.length > 0 ? (
            <ChartContainer config={lineChartConfig} className="aspect-auto h-[300px] w-full min-h-[300px] min-w-0">
              <LineChart data={filteredHistory} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis
                  domain={isComposite && compositeScale === "zoom" && compositeZoomDomain ? compositeZoomDomain : undefined}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => {
                    if (isComposite) return v.toFixed(0)
                    if (isAps) return `${v.toFixed(1)}/s`
                    return `${(v / 1000).toFixed(1)}s`
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        const numValue = value as number
                        const provider = (name as string).replace(/_(?:compositeScore|actionsPerSecond|taskMs|totalMs|screenshotMs)$/, "")
                        const formatted = isComposite
                          ? numValue.toFixed(1)
                          : isAps
                          ? `${numValue.toFixed(2)}/s`
                          : `${(numValue / 1000).toFixed(2)}s`
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: BROWSER_THROUGHPUT_PROVIDER_COLORS[provider] || "#6b7280" }}
                              />
                              <span className="text-gray-500 dark:text-gray-400">{capitalize(provider)}</span>
                            </div>
                            <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                              {formatted}
                            </span>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Legend
                  content={(props: any) => {
                    const { payload } = props
                    if (!payload) return null
                    return (
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2">
                        {payload.map((entry: any) => {
                          const provider = (entry.dataKey as string).replace(/_(?:compositeScore|actionsPerSecond|taskMs|totalMs|screenshotMs)$/, "")
                          const isHidden = hiddenProviders.has(provider)
                          return (
                            <button
                              key={provider}
                              type="button"
                              onClick={() => toggleProvider(provider)}
                              className={`inline-flex items-center gap-1.5 text-xs transition-opacity ${isHidden ? "opacity-30" : "opacity-100"} hover:opacity-70`}
                            >
                              <span className="inline-block h-2.5 w-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-gray-700 dark:text-gray-300">{capitalize(provider)}</span>
                            </button>
                          )
                        })}
                      </div>
                    )
                  }}
                />
                {providers.map((provider) => {
                  const dataKey = `${provider}_${historyMetricKey}`
                  return (
                    <Line
                      key={dataKey}
                      type="monotone"
                      dataKey={dataKey}
                      name={provider}
                      stroke={`var(--color-${provider})`}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: `var(--color-${provider})` }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                      hide={hiddenProviders.has(provider)}
                    />
                  )
                })}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[300px] min-h-[300px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No history data available yet.</p>
            </div>
          )}
        </div>

        {/* Bar chart */}
        {chartData.length > 0 && (
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
            <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-1 text-left">
              {BROWSER_THROUGHPUT_METRIC_LABELS[selectedMetric]}
            </h2>
            <ChartContainer config={barChartConfig} className="aspect-auto w-full min-w-0" style={{ height: `${barChartHeight}px`, minHeight: `${barChartHeight}px` }}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: isMobile ? 60 : 110, left: isMobile ? 0 : 20, bottom: 5 }}
              >
                <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, isComposite ? 100 : isAps ? maxBarValue * 1.3 : maxBarValue * 1.2]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => {
                    if (isComposite) return v.toFixed(0)
                    if (isAps) return `${v.toFixed(1)}/s`
                    return `${(v / 1000).toFixed(1)}s`
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  width={isMobile ? 70 : 90}
                  className="text-gray-600 dark:text-gray-400"
                />
                <ChartTooltip
                  cursor={{ fill: "var(--color-gray-100)", opacity: 0.1 }}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name, props) => {
                        const d = props.payload
                        return (
                          <div className="flex flex-col gap-2 w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: BROWSER_THROUGHPUT_PROVIDER_COLORS[d.provider] || "#6b7280" }} />
                              <span className="font-semibold text-gray-900 dark:text-gray-50">{d.displayName}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Score</span>
                                <span className="font-mono font-medium text-gray-900 dark:text-gray-50">{(d.compositeScore as number).toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Actions/sec</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{(d.actionsPerSecond as number).toFixed(2)}/s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Task duration</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.taskMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Screenshot</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{(d.screenshotMs as number).toFixed(0)}ms</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    offset={8}
                    fill="currentColor"
                    fontSize={11}
                    fontWeight={600}
                    className="fill-gray-700 dark:fill-gray-300"
                    formatter={(v: any) => {
                      if (typeof v !== "number") return ""
                      return formatThroughputValue(v, selectedMetric)
                    }}
                  />
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BROWSER_THROUGHPUT_PROVIDER_COLORS[entry.provider] || "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Per-action type breakdown */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
          <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-1">
            Per-Action Latency Breakdown
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Median latency per action type. Each action type is timed individually.</p>
          <ChartContainer config={actionBreakdownConfig} className="aspect-auto h-[320px] w-full min-h-[320px] min-w-0">
            <BarChart
              data={actionBreakdownData}
              margin={{ top: 5, right: 20, left: isMobile ? 0 : 10, bottom: 5 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="action"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `${v}ms`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => value as string}
                    formatter={(value, name) => {
                      const numValue = value as number
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: BROWSER_THROUGHPUT_PROVIDER_COLORS[name as string] || "#6b7280" }}
                            />
                            <span className="text-gray-500 dark:text-gray-400">{capitalize(name as string)}</span>
                          </div>
                          <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                            {numValue.toFixed(0)}ms
                          </span>
                        </div>
                      )
                    }}
                  />
                }
              />
              <Legend
                content={(props: any) => {
                  const { payload } = props
                  if (!payload) return null
                  return (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2">
                      {payload.map((entry: any) => (
                        <div key={entry.dataKey} className="inline-flex items-center gap-1.5 text-xs">
                          <span className="inline-block h-2.5 w-2.5 rounded-[2px] shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-gray-700 dark:text-gray-300">{capitalize(entry.dataKey)}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              {data.active.map((r) => (
                <Bar
                  key={r.provider}
                  dataKey={r.provider}
                  fill={BROWSER_THROUGHPUT_PROVIDER_COLORS[r.provider] || "#6b7280"}
                  radius={[3, 3, 0, 0]}
                  barSize={isMobile ? 10 : 16}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </div>

        {/* Data table */}
        <div className="py-6 md:py-8">
          <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-3">
            Detailed Metrics
          </h2>
          <BrowserThroughputDataTable activeResults={data.active} />
        </div>
      </div>
    </div>
  )
}
