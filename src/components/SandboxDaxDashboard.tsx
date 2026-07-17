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
  PROVIDER_COLORS,
  DAX_METRIC_LABELS,
  DAX_PHASES_TOTAL,
  capitalize,
  type DaxMetric,
  type DaxResult,
  type DaxHistoryPoint,
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
import { SandboxDaxDataTable } from "./SandboxDaxDataTable"

type TimeRange = "30" | "60" | "90" | "all"

interface SandboxDaxData {
  active: DaxResult[]
  historyData: DaxHistoryPoint[]
  timestamp: string
}

interface SandboxDaxDashboardProps {
  data: SandboxDaxData
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
  currentBenchmark: "tti" | "dax"
}

const METRICS: DaxMetric[] = ["compositeScore", "totalMs", "prepareMs", "cloneMs", "installMs", "typecheckMs"]

const METRIC_DESCRIPTIONS: Record<DaxMetric, string> = {
  compositeScore: "Median number of the 7 benchmark phases (prepare, cache clear, bun download/unpack, clone, install, typecheck) completed before failing, if any. Higher is better.",
  totalMs: "Median end-to-end time for the full clone + install + typecheck cycle. Lower is better.",
  prepareMs: "Median time to install system packages and Node.js inside the sandbox. Lower is better.",
  cloneMs: "Median time for a shallow git clone of the opencode repository. Lower is better.",
  installMs: "Median time for `bun install`. Lower is better.",
  typecheckMs: "Median time for `bun typecheck`. Lower is better.",
}

function isHigherBetter(metric: DaxMetric): boolean {
  return metric === "compositeScore"
}

type DaxSummaryMetric = Exclude<DaxMetric, "compositeScore">

const PHASES: DaxSummaryMetric[] = ["prepareMs", "cloneMs", "installMs", "typecheckMs"]

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

const SANDBOX_BENCHMARK_LABELS: Record<"tti" | "dax", string> = {
  tti: "Sandbox TTI",
  dax: "Dax",
}

const SANDBOX_BENCHMARK_URLS: Record<"tti" | "dax", string> = {
  tti: "/benchmarks/sandboxes",
  dax: "/benchmarks/sandboxes/dax",
}

function getMetricValue(r: DaxResult, metric: DaxMetric): number {
  if (metric === "compositeScore") return r.phasesCompleted ?? 0
  return r.summary[metric]?.median ?? 0
}

// A duration is only meaningful if the run actually got there. `totalMs` is
// always recorded (even on an immediate failure) so a near-zero total reads
// as a great score when it's really a fast failure — it's only comparable
// once every phase completed. The per-phase durations are 0 whenever that
// phase was never reached (see sanitizedDaxSummary), so a >0 check is enough
// for those.
function daxMetricReached(r: DaxResult, metric: DaxMetric): boolean {
  if (metric === "compositeScore") return true
  if (metric === "totalMs") return (r.phasesCompleted ?? 0) >= (r.phasesTotal ?? DAX_PHASES_TOTAL)
  return (r.summary[metric]?.median ?? 0) > 0
}

function formatDaxValue(value: number, metric: DaxMetric, phasesTotal = DAX_PHASES_TOTAL): string {
  if (metric === "compositeScore") return `${Math.round(value)}/${phasesTotal}`
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

export function SandboxDaxDashboard({
  data,
  providerLogos,
  providerLogosDark,
  currentBenchmark,
}: SandboxDaxDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<DaxMetric>("compositeScore")
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

  const chartData = useMemo(() => {
    const rows = visibleResults.map((r) => ({
      provider: r.provider,
      displayName: capitalize(r.provider),
      value: getMetricValue(r, selectedMetric),
      reached: daxMetricReached(r, selectedMetric),
      compositeScore: r.phasesCompleted ?? 0,
      phasesTotal: r.phasesTotal ?? DAX_PHASES_TOTAL,
      successRate: r.successRate ?? 0,
      totalMs: r.summary.totalMs.median,
      prepareMs: r.summary.prepareMs.median,
      cloneMs: r.summary.cloneMs.median,
      installMs: r.summary.installMs.median,
      typecheckMs: r.summary.typecheckMs.median,
    }))
    return rows.sort((a, b) => {
      if (a.reached !== b.reached) return a.reached ? -1 : 1
      if (!a.reached) return a.provider.localeCompare(b.provider)
      return isHigher ? b.value - a.value : a.value - b.value
    })
  }, [visibleResults, selectedMetric, isHigher])

  const barChartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: DAX_METRIC_LABELS[selectedMetric] } }
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [data.active, selectedMetric])

  const maxBarValue = useMemo(() => Math.max(...chartData.map((d) => d.value), 0), [chartData])
  const barChartHeight = Math.max(200, chartData.length * 50 + 60)

  const lineChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const provider of providers) {
      config[provider] = {
        label: capitalize(provider),
        color: PROVIDER_COLORS[provider] || "#6b7280",
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

  // Per-phase breakdown data
  const phaseBreakdownData = useMemo(() => {
    return PHASES.map((phase) => {
      const row: Record<string, string | number> = { phase: DAX_METRIC_LABELS[phase] }
      for (const r of data.active) {
        row[r.provider] = r.summary[phase]?.median ?? 0
      }
      return row
    })
  }, [data.active])

  const phaseBreakdownConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [data.active])

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
              window.location.href = SANDBOX_BENCHMARK_URLS[value as "tti" | "dax"]
            }}
          >
            <SelectTrigger className="w-[150px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["tti", "dax"] as const).map((type) => (
                <SelectItem key={type} value={type} className="text-sm">
                  {SANDBOX_BENCHMARK_LABELS[type]}
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
                {DAX_METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
          <div className="sm:hidden">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as DaxMetric)}>
              <SelectTrigger className="w-[180px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((metric) => (
                  <SelectItem key={metric} value={metric} className="text-sm">
                    <div>
                      <div>{DAX_METRIC_LABELS[metric]}</div>
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
              .map((r) => ({ ...r, metricValue: getMetricValue(r, selectedMetric), reached: daxMetricReached(r, selectedMetric) }))
              .sort((a, b) => {
                if (a.reached !== b.reached) return a.reached ? -1 : 1
                if (!a.reached) return a.provider.localeCompare(b.provider)
                return isHigher ? b.metricValue - a.metricValue : a.metricValue - b.metricValue
              })

            const renderCard = (result: typeof ranked[0], index: number) => {
              const logoLight = providerLogos[result.provider]
              const logoDark = providerLogosDark[result.provider]
              return (
                <div
                  key={result.provider}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
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
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PROVIDER_COLORS[result.provider] || "#6b7280" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{capitalize(result.provider)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0 flex flex-col items-end">
                    <span className={`font-mono text-sm font-semibold ${result.reached ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {result.reached ? formatDaxValue(result.metricValue, selectedMetric, result.phasesTotal) : "Failed"}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {result.reached ? DAX_METRIC_LABELS[selectedMetric] : `${result.phasesCompleted ?? 0}/${result.phasesTotal ?? DAX_PHASES_TOTAL} phases`}
                    </span>
                  </div>
                </div>
              )
            }

            const allCards = ranked.map((r, i) => renderCard(r, i))
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
          {filteredHistory.length > 0 ? (
            <ChartContainer config={lineChartConfig} className="aspect-auto h-[300px] w-full min-h-[300px] min-w-0">
              <LineChart data={filteredHistory} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  domain={isComposite ? [0, DAX_PHASES_TOTAL] : undefined}
                  tickFormatter={(v: number) => isComposite ? v.toFixed(0) : `${(v / 1000).toFixed(1)}s`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        const numValue = value as number
                        const provider = (name as string).replace(/_(?:compositeScore|totalMs|prepareMs|cloneMs|installMs|typecheckMs)$/, "")
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: PROVIDER_COLORS[provider] || "#6b7280" }}
                              />
                              <span className="text-gray-500 dark:text-gray-400">{capitalize(provider)}</span>
                            </div>
                            <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                              {isComposite ? `${Math.round(numValue)}/${DAX_PHASES_TOTAL}` : `${(numValue / 1000).toFixed(2)}s`}
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
                          const provider = (entry.dataKey as string).replace(/_(?:compositeScore|totalMs|prepareMs|cloneMs|installMs|typecheckMs)$/, "")
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
                  const dataKey = `${provider}_${selectedMetric}`
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
              {DAX_METRIC_LABELS[selectedMetric]}
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
                  domain={[0, isComposite ? DAX_PHASES_TOTAL : maxBarValue * 1.2]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => isComposite ? v.toFixed(0) : `${(v / 1000).toFixed(1)}s`}
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
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: PROVIDER_COLORS[d.provider] || "#6b7280" }} />
                              <span className="font-semibold text-gray-900 dark:text-gray-50">{d.displayName}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Phases</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{d.compositeScore as number}/{d.phasesTotal as number}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Total</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.totalMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Install</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.installMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Typecheck</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.typecheckMs as number) / 1000).toFixed(2)}s</span>
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
                    content={(props: any) => {
                      const { x, y, width, height, index } = props
                      const row = chartData[index]
                      if (!row) return null
                      const label = row.reached ? formatDaxValue(row.value, selectedMetric) : "Failed"
                      return (
                        <text
                          x={x + width + 8}
                          y={y + height / 2}
                          dy={4}
                          fontSize={11}
                          fontWeight={600}
                          textAnchor="start"
                          className={row.reached ? "fill-gray-700 dark:fill-gray-300" : "fill-gray-400 dark:fill-gray-500"}
                        >
                          {label}
                        </text>
                      )
                    }}
                  />
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROVIDER_COLORS[entry.provider] || "#6b7280"} fillOpacity={entry.reached ? 1 : 0.3} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Per-phase breakdown */}
        <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
          <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-1">
            Per-Phase Duration Breakdown
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Median duration per phase of the clone + install + typecheck cycle.</p>
          <ChartContainer config={phaseBreakdownConfig} className="aspect-auto h-[320px] w-full min-h-[320px] min-w-0">
            <BarChart
              data={phaseBreakdownData}
              margin={{ top: 5, right: 20, left: isMobile ? 0 : 10, bottom: 5 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="phase"
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
                tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}s`}
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
                              style={{ backgroundColor: PROVIDER_COLORS[name as string] || "#6b7280" }}
                            />
                            <span className="text-gray-500 dark:text-gray-400">{capitalize(name as string)}</span>
                          </div>
                          <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                            {(numValue / 1000).toFixed(2)}s
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
                  fill={PROVIDER_COLORS[r.provider] || "#6b7280"}
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
          <SandboxDaxDataTable activeResults={data.active} />
        </div>
      </div>
    </div>
  )
}
