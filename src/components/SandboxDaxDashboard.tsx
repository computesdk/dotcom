import { useState, useMemo, useEffect, useRef } from "react"
import { Info } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts"
import {
  PROVIDER_COLORS,
  DAX_METRIC_LABELS,
  DAX_PHASES_TOTAL,
  getDaxMetricValue,
  isDaxMetricHigherBetter,
  daxMetricReached,
  formatDaxMetricValue,
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
  currentBenchmark: "burst_tti" | "dax"
}

const METRICS: DaxMetric[] = ["compositeScore", "totalMs", "prepareMs", "bunDownloadMs", "bunUnpackMs", "cloneMs", "installMs", "typecheckMs"]

const METRIC_DESCRIPTIONS: Record<DaxMetric, string> = {
  compositeScore: "Median number of the 7 benchmark phases (prepare, cache clear, bun download/unpack, clone, install, typecheck) completed before failing, if any.",
  totalMs: "Median end-to-end time for the full clone + install + typecheck cycle. Lower is better.",
  prepareMs: "Median time to install system packages and Node.js inside the sandbox. Lower is better.",
  bunDownloadMs: "Median time to download the Bun runtime — a proxy for network throughput. Lower is better.",
  bunUnpackMs: "Median time to unpack the downloaded Bun runtime — a proxy for disk write speed. Lower is better.",
  cloneMs: "Median time for a shallow git clone of the opencode repository. Lower is better.",
  installMs: "Median time for `bun install`. Lower is better.",
  typecheckMs: "Median time for `bun typecheck`. Lower is better.",
}

type DaxSummaryMetric = Exclude<DaxMetric, "compositeScore">

const PHASES: DaxSummaryMetric[] = ["prepareMs", "bunDownloadMs", "bunUnpackMs", "cloneMs", "installMs", "typecheckMs"]

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

const SANDBOX_BENCHMARK_LABELS: Record<"burst_tti" | "dax", string> = {
  burst_tti: "Burst TTI",
  dax: "Dax",
}

const SANDBOX_BENCHMARK_URLS: Record<"burst_tti" | "dax", string> = {
  burst_tti: "/benchmarks/sandboxes",
  dax: "/benchmarks/sandboxes/dax",
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

  const providers = useMemo(() => data.active.map((r) => r.provider), [data.active])

  const isHigher = isDaxMetricHigherBetter(selectedMetric)
  const isComposite = selectedMetric === "compositeScore"

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
              window.location.href = SANDBOX_BENCHMARK_URLS[value as "burst_tti" | "dax"]
            }}
          >
            <SelectTrigger className="w-[150px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["burst_tti", "dax"] as const).map((type) => (
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
              .map((r) => ({ ...r, metricValue: getDaxMetricValue(r, selectedMetric), reached: daxMetricReached(r, selectedMetric) }))
              .sort((a, b) => {
                if (a.reached !== b.reached) return a.reached ? -1 : 1
                if (!a.reached) return a.provider.localeCompare(b.provider)
                return isHigher ? b.metricValue - a.metricValue : a.metricValue - b.metricValue
              })

            const renderCard = (result: typeof ranked[0], index: number) => {
              const logoLight = providerLogos[result.provider]
              const logoDark = providerLogosDark[result.provider]
              return (
                <a
                  key={result.provider}
                  href={`/benchmarks/sandboxes/dax/${result.provider}`}
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
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PROVIDER_COLORS[result.provider] || "#6b7280" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{capitalize(result.provider)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0 flex flex-col items-end">
                    <span className={`font-mono text-sm font-semibold ${result.reached ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                      {result.reached ? formatDaxMetricValue(result.metricValue, selectedMetric, result.phasesTotal) : "Failed"}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {result.reached ? DAX_METRIC_LABELS[selectedMetric] : `${result.phasesCompleted ?? 0}/${result.phasesTotal ?? DAX_PHASES_TOTAL} phases`}
                    </span>
                  </div>
                  <svg className="size-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </a>
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
                        const provider = (name as string).replace(/_(?:compositeScore|totalMs|prepareMs|bunDownloadMs|bunUnpackMs|cloneMs|installMs|typecheckMs)$/, "")
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
                          const provider = (entry.dataKey as string).replace(/_(?:compositeScore|totalMs|prepareMs|bunDownloadMs|bunUnpackMs|cloneMs|installMs|typecheckMs)$/, "")
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
      </div>
    </div>
  )
}
