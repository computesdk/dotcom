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
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import {
  AI_GATEWAY_PROVIDER_COLORS,
  AI_GATEWAY_METRIC_LABELS,
  isAIGatewayBaseline,
  capitalize,
} from "./benchmarkConstants"
import type { AIGatewayResult, AIGatewayHistoryPoint, AIGatewayMetric } from "./benchmarkConstants"

type TimeRange = "30" | "60" | "90" | "all"
type ChartScale = "full" | "zoom"

interface AIGatewayData {
  active: AIGatewayResult[]
  historyData: AIGatewayHistoryPoint[]
  timestamp: string
}

interface AIGatewayDashboardProps {
  data: AIGatewayData
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
  providerLogomarks?: Record<string, string>
  providerLogomarksDark?: Record<string, string>
}

const METRICS: AIGatewayMetric[] = ["compositeScore", "coldE2eMs", "warmTtftMs", "outputTokensPerSec", "dnsMs", "tcpMs", "tlsMs"]

// DNS/TCP/TLS live on a millisecond scale two to three orders of magnitude
// smaller than the request-latency metrics (single-digit to low-double-digit
// ms vs. hundreds-to-thousands of ms) — they need their own formatting and
// zoom padding rather than the "/1000 -> seconds" treatment used elsewhere.
function isConnectionPhaseMetric(metric: AIGatewayMetric): boolean {
  return metric === "dnsMs" || metric === "tcpMs" || metric === "tlsMs"
}
const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

function isHigherBetter(metric: AIGatewayMetric): boolean {
  return metric === "outputTokensPerSec" || metric === "compositeScore"
}

function formatAIGatewayValue(value: number, metric: AIGatewayMetric): string {
  if (metric === "compositeScore") return value.toFixed(1)
  if (metric === "outputTokensPerSec") return `${value.toFixed(0)} tok/s`
  if (isConnectionPhaseMetric(metric)) return `${value.toFixed(2)}ms`
  return `${(value / 1000).toFixed(2)}s`
}

// Literal signed difference (value - baseline) in the metric's own units —
// not the "better/worse" normalized delta used for bar direction. For
// latency this means faster shows as "−0.16s" and slower as "+0.12s", which
// reads correctly as a time difference rather than implying "+" is worse.
function formatDeltaLabel(rawDelta: number, metric: AIGatewayMetric): string {
  const magnitude = formatAIGatewayValue(Math.abs(rawDelta), metric)
  return `${rawDelta >= 0 ? "+" : "−"}${magnitude}`
}

function getMetricValue(r: AIGatewayResult, metric: AIGatewayMetric): number {
  if (metric === "compositeScore") return r.compositeScore ?? 0
  if (metric === "coldE2eMs") return r.summary.coldE2eMs.median
  if (metric === "warmTtftMs") return r.summary.warmTtftMs.median
  if (metric === "outputTokensPerSec") return r.summary.outputTokensPerSec.median
  if (metric === "dnsMs") return r.summary.dnsMs.median
  if (metric === "tcpMs") return r.summary.tcpMs.median
  return r.summary.tlsMs.median
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

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

function BaselineBadge() {
  return (
    <span className="inline-flex items-center text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
      Baseline
    </span>
  )
}

export function AIGatewayDashboard({ data, providerLogos, providerLogosDark, providerLogomarks, providerLogomarksDark }: AIGatewayDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<AIGatewayMetric>("compositeScore")
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>("all")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
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

  const providers = useMemo(
    () => data.active.map((r) => r.provider),
    [data.active]
  )

  // --- Bar chart ---
  const isHigher = isHigherBetter(selectedMetric)
  const isComposite = selectedMetric === "compositeScore"

  const chartData = useMemo(() => {
    const rows = visibleResults.map((r) => ({
      provider: r.provider,
      displayName: capitalize(r.provider),
      isBaseline: isAIGatewayBaseline(r.provider),
      value: getMetricValue(r, selectedMetric),
      coldE2eMs: r.summary.coldE2eMs.median,
      warmTtftMs: r.summary.warmTtftMs.median,
      outputTokensPerSec: r.summary.outputTokensPerSec.median,
      compositeScore: r.compositeScore ?? 0,
    }))
    return rows.sort((a, b) => isHigher ? b.value - a.value : a.value - b.value)
  }, [visibleResults, selectedMetric, isHigher])

  const barChartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: AI_GATEWAY_METRIC_LABELS[selectedMetric] } }
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: AI_GATEWAY_PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [data.active, selectedMetric])

  const maxBarValue = useMemo(() => Math.max(...chartData.map((d) => d.value)), [chartData])
  const barChartHeight = Math.max(200, chartData.length * 50 + 60)

  // --- Provider leaderboard (delta-vs-baseline bar chart) ---
  // Delta is normalized so "positive/blue" always means "better than baseline",
  // regardless of whether the underlying metric is higher-is-better (composite
  // score, tokens/sec) or lower-is-better (latency in ms).
  const leaderboardDelta = useMemo(() => {
    const baselineResult = data.active.find((r) => isAIGatewayBaseline(r.provider))
    const baselineValue = baselineResult ? getMetricValue(baselineResult, selectedMetric) : 0
    const competitors = data.active
      .filter((r) => !isAIGatewayBaseline(r.provider))
      .map((r) => {
        const value = getMetricValue(r, selectedMetric)
        const delta = isHigher ? value - baselineValue : baselineValue - value
        return { provider: r.provider, displayName: capitalize(r.provider), value, delta, rawDelta: value - baselineValue, isBaseline: false }
      })
    const baselineRow = baselineResult
      ? { provider: baselineResult.provider, displayName: capitalize(baselineResult.provider), value: baselineValue, delta: 0, rawDelta: 0, isBaseline: true }
      : null
    // Baseline sorts into its natural position by delta (always 0) rather than
    // being pinned to the top — it just never receives a rank number.
    const combined = baselineRow ? [...competitors, baselineRow] : competitors
    let rankCounter = 0
    const rows = combined
      .sort((a, b) => b.delta - a.delta)
      .map((r) => (r.isBaseline ? { ...r, rank: null as number | null } : { ...r, rank: ++rankCounter }))
    const maxAbsDelta = Math.max(...competitors.map((r) => Math.abs(r.delta)), 0.1)
    const axisMax = maxAbsDelta * 1.5
    return {
      rows,
      baselineName: baselineResult ? capitalize(baselineResult.provider) : "",
      baselineValue,
      axisMax,
    }
  }, [data.active, selectedMetric, isHigher])

  // --- Line chart ---
  const lineChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    for (const provider of providers) {
      config[provider] = {
        label: capitalize(provider),
        color: AI_GATEWAY_PROVIDER_COLORS[provider] || "#6b7280",
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
      const parsed = new Date(`${point.date}, ${now.getFullYear()}`)
      return !Number.isNaN(parsed.getTime()) && parsed >= cutoff
    })
  }, [data.historyData, timeRange])

  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom" || filteredHistory.length === 0) return null
    const values: number[] = []
    for (const point of filteredHistory) {
      for (const provider of providers) {
        if (hiddenProviders.has(provider)) continue
        const key = `${provider}_${selectedMetric}`
        const value = point[key]
        if (typeof value === "number" && Number.isFinite(value)) values.push(value)
      }
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const minSpread = selectedMetric === "compositeScore" ? 0.1
      : selectedMetric === "outputTokensPerSec" ? 1
      : isConnectionPhaseMetric(selectedMetric) ? 0.5
      : 50
    const minPad = selectedMetric === "compositeScore" ? 0.5
      : selectedMetric === "outputTokensPerSec" ? 2
      : isConnectionPhaseMetric(selectedMetric) ? 0.5
      : 100
    const spread = Math.max(max - min, minSpread)
    const pad = Math.max(spread * 0.15, minPad)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, filteredHistory, selectedMetric, providers, hiddenProviders])

  // --- Data table ---
  const [sorting, setSorting] = useState<SortingState>([{ id: "compositeScore", desc: true }])

  const columns = useMemo<ColumnDef<AIGatewayResult>[]>(
    () => [
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const p = row.original.provider
          return (
            <a href={`/benchmarks/ai-gateway/${p}`} className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity">
              <span className="font-medium text-gray-900 dark:text-white">{capitalize(p)}</span>
              {isAIGatewayBaseline(p) && <BaselineBadge />}
            </a>
          )
        },
        enableSorting: false,
        size: 220,
        meta: { align: "left" },
      },
      {
        id: "compositeScore",
        accessorFn: (r) => r.compositeScore ?? 0,
        header: "Score",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(1)}</span>,
        sortDescFirst: true,
        size: 80,
      },
      {
        id: "coldE2eMs",
        accessorFn: (r) => r.summary.coldE2eMs.median,
        header: "Cold E2E (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(0)}ms</span>,
        size: 120,
      },
      {
        id: "warmTtftMs",
        accessorFn: (r) => r.summary.warmTtftMs.median,
        header: "Warm TTFT (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(0)}ms</span>,
        size: 130,
      },
      {
        id: "outputTokensPerSec",
        accessorFn: (r) => r.summary.outputTokensPerSec.median,
        header: "Tokens/sec (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(0)}</span>,
        sortDescFirst: true,
        size: 130,
      },
      {
        id: "dnsMs",
        accessorFn: (r) => r.summary.dnsMs.median,
        header: "DNS (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{(getValue() as number).toFixed(2)}ms</span>,
        size: 90,
      },
      {
        id: "tcpMs",
        accessorFn: (r) => r.summary.tcpMs.median,
        header: "TCP (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{(getValue() as number).toFixed(2)}ms</span>,
        size: 90,
      },
      {
        id: "tlsMs",
        accessorFn: (r) => r.summary.tlsMs.median,
        header: "TLS (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{(getValue() as number).toFixed(2)}ms</span>,
        size: 90,
      },
      {
        id: "successRate",
        accessorFn: (r) => r.successRate ?? 1,
        header: "Success",
        cell: ({ getValue }) => <span className="font-mono text-xs">{Math.round((getValue() as number) * 100)}%</span>,
        sortDescFirst: true,
        size: 80,
      },
    ],
    []
  )

  const table = useReactTable({
    data: data.active,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="not-content mt-0">
      <div ref={sentinelRef} className="h-0" />
      {isStuck && <div className="h-[57px]" />}

      {/* Sticky metric selector */}
      <div className={`${isStuck ? "fixed top-0 left-0 right-0 z-50" : ""} bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/50`}>
        <div className="md:max-w-7xl md:mx-auto py-3 px-4 md:px-6 flex items-center gap-3">
          <div className="hidden lg:inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
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
                {AI_GATEWAY_METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
          {/* Compact dropdown — used until the button row has room to breathe at lg */}
          <div className="lg:hidden">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as AIGatewayMetric)}
              className="h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3"
            >
              {METRICS.map((metric) => (
                <option key={metric} value={metric}>{AI_GATEWAY_METRIC_LABELS[metric]}</option>
              ))}
            </select>
          </div>
          <a href="#methodology" className="hidden lg:inline-flex items-center gap-1 text-xs text-gray-900 hover:text-gray-400 dark:hover:text-gray-300 transition-colors underline">
            <Info size={14} />
            Details
          </a>
        </div>
      </div>

      {/* Provider Leaderboard */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="md:max-w-7xl md:mx-auto py-4">
          <div className="flex items-center justify-between mb-3 px-4 md:px-6">
            <h2 className="text-base md:text-md font-semibold text-gray-900 dark:text-white">
              Provider Leaderboard
            </h2>
          </div>
          {(() => {
            // Anthropic (the no-gateway baseline) sorts into its natural position
            // by metric value rather than being pinned to the top — it just never
            // receives a rank number, since it isn't part of the competitive ranking.
            const baselineResult = data.active.find((r) => isAIGatewayBaseline(r.provider))
            const competitors = data.active
              .filter((r) => !isAIGatewayBaseline(r.provider))
              .map((r) => ({ ...r, metricValue: getMetricValue(r, selectedMetric), isBaselineRow: false }))
            const baselineEntry = baselineResult
              ? { ...baselineResult, metricValue: getMetricValue(baselineResult, selectedMetric), isBaselineRow: true }
              : null
            const combined = baselineEntry ? [...competitors, baselineEntry] : competitors
            let rankCounter = 0
            const ranked = combined
              .sort((a, b) => isHigher ? b.metricValue - a.metricValue : a.metricValue - b.metricValue)
              .map((r) => (r.isBaselineRow ? { ...r, rank: null as number | null } : { ...r, rank: ++rankCounter }))
            const midpoint = Math.ceil(ranked.length / 2)
            const renderCard = (result: typeof ranked[0]) => {
              const logoLight = providerLogos[result.provider]
              const logoDark = providerLogosDark[result.provider]
              const baseline = isAIGatewayBaseline(result.provider)
              return (
                <a
                  key={result.provider}
                  href={`/benchmarks/ai-gateway/${result.provider}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-gray-50 hover:shadow-sm dark:hover:bg-gray-800/50 transition-colors no-underline cursor-pointer ${
                    baseline
                      ? "bg-gray-50/70 dark:bg-gray-800/30 border-dashed border-gray-300 dark:border-gray-700"
                      : result.rank === 1
                        ? "dark:bg-gray-700/50 border-gray-200 dark:border-gray-700/50 shadow-sm"
                        : "bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700/50"
                  }`}
                >
                  <div className="shrink-0 w-6 text-center">
                    <span className="text-sm font-mono font-medium text-gray-500 dark:text-gray-400">
                      {result.rank ?? "—"}
                    </span>
                  </div>
                  <div className="shrink-0 w-40 flex flex-wrap items-center gap-x-2 gap-y-0">
                    {logoLight ? (
                      <>
                        <img src={logoLight} alt={`${capitalize(result.provider)} logo`} className="h-6 max-w-full object-contain dark:hidden" />
                        <img src={logoDark || logoLight} alt="" className="h-6 max-w-full object-contain hidden dark:block mt-0" />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: AI_GATEWAY_PROVIDER_COLORS[result.provider] || "#6b7280" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{capitalize(result.provider)}</span>
                      </div>
                    )}
                    {baseline && <BaselineBadge />}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0 flex items-center gap-4">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                        {formatAIGatewayValue(result.metricValue, selectedMetric)}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {AI_GATEWAY_METRIC_LABELS[selectedMetric]}
                      </span>
                    </div>
                  </div>
                </a>
              )
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 px-4 md:px-6">
                <div className="flex flex-col gap-2">
                  {ranked.slice(0, midpoint).map((r) => renderCard(r))}
                </div>
                <div className="flex flex-col gap-2">
                  {ranked.slice(midpoint).map((r) => renderCard(r))}
                </div>
              </div>
            )
          })()}
          <p className="px-4 md:px-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
            "Anthropic (Direct)" is a no-gateway control, not a competing gateway — it isolates how much latency each gateway adds on top of the underlying model provider.
          </p>
        </div>
      </div>

      {/* Provider Leaderboard — delta-vs-baseline bar chart */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50 overflow-x-hidden">
        <div className="md:max-w-7xl md:mx-auto py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mb-4 px-4 md:px-6">
            <h2 className="text-base md:text-md font-semibold text-gray-900 dark:text-white">
              Provider Variance
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                {AI_GATEWAY_METRIC_LABELS[selectedMetric]}
              </span>
            </h2>
            {leaderboardDelta.baselineName && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs. {leaderboardDelta.baselineName} · <span className="font-mono">{formatAIGatewayValue(leaderboardDelta.baselineValue, selectedMetric)}</span>
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 px-4 md:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="shrink-0 w-4 sm:w-5" />
              <div className="shrink-0 w-16 sm:w-24 lg:w-36" />
              <div className="flex-1 text-center text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                vs. baseline
              </div>
              <div className="shrink-0 w-px h-3 mx-1 sm:mx-2" />
              <div className="shrink-0 w-8 lg:w-20 text-right text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                actual
              </div>
            </div>
            {leaderboardDelta.rows.map((row) => {
              const isPositive = row.delta >= 0
              const barPercent = row.isBaseline ? 0 : Math.max((Math.abs(row.delta) / leaderboardDelta.axisMax) * 50, 2)
              const logoLight = providerLogos[row.provider]
              const logoDark = providerLogosDark[row.provider]
              const logomarkLight = providerLogomarks?.[row.provider]
              const logomarkDark = providerLogomarksDark?.[row.provider]
              return (
                <a
                  key={row.provider}
                  href={`/benchmarks/ai-gateway/${row.provider}`}
                  className={`flex items-center gap-2 sm:gap-3 -mx-2 py-2 px-2 rounded-md no-underline group transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.isBaseline ? "opacity-60" : ""}`}
                >
                  <div className="shrink-0 w-4 sm:w-5 text-center text-xs text-gray-400 dark:text-gray-500">
                    {row.rank ?? "—"}
                  </div>
                  <div className="shrink-0 w-6 sm:w-24 lg:w-36 flex items-center min-w-0">
                    {logoLight ? (
                      <>
                        {/* Icon-only mark below sm — the full wordmark doesn't leave enough room for the bar */}
                        <div className="sm:hidden">
                          {logomarkLight ? (
                            <>
                              <img src={logomarkLight} alt={`${row.displayName} logo`} className="h-5 w-5 object-contain dark:hidden" />
                              <img src={logomarkDark || logomarkLight} alt="" className="h-5 w-5 object-contain hidden dark:block mt-0" />
                            </>
                          ) : (
                            <img src={logoLight} alt={`${row.displayName} logo`} className="h-4 max-w-full object-contain object-left dark:hidden" />
                          )}
                        </div>
                        <div className="hidden sm:block">
                          <img src={logoLight} alt={`${row.displayName} logo`} className="h-5 max-w-full object-contain object-left dark:hidden" />
                          <img src={logoDark || logoLight} alt="" className="h-5 max-w-full object-contain object-left hidden dark:block mt-0" />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: AI_GATEWAY_PROVIDER_COLORS[row.provider] || "#6b7280" }} />
                        <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{row.displayName}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1 h-6 min-w-0 overflow-hidden">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                    {row.isBaseline ? (
                      <>
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-900" />
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-left text-[11px] sm:text-xs whitespace-nowrap text-gray-500 dark:text-gray-400"
                          style={{ left: "calc(50% + 10px)" }}
                        >
                          {formatAIGatewayValue(row.value, selectedMetric)}
                        </span>
                      </>
                    ) : (
                      <>
                        <div
                          className={`absolute top-1 bottom-1 rounded-sm transition-opacity group-hover:opacity-80 ${isPositive ? "bg-blue-500" : "bg-red-700"}`}
                          style={isPositive ? { left: "50%", width: `${barPercent}%` } : { right: "50%", width: `${barPercent}%` }}
                        />
                        <span
                          className={`absolute top-1/2 -translate-y-1/2 text-[11px] sm:text-xs font-semibold whitespace-nowrap text-gray-900 dark:text-gray-50 ${isPositive ? "text-left" : "text-right"}`}
                          style={isPositive
                            ? { left: `min(calc(50% + ${barPercent}% + 8px), calc(100% - 56px))` }
                            : { right: `min(calc(50% + ${barPercent}% + 8px), calc(100% - 56px))` }}
                        >
                          {formatDeltaLabel(row.rawDelta, selectedMetric)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="shrink-0 w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2" />
                  <div className="shrink-0 w-8 lg:w-20 text-right text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatAIGatewayValue(row.value, selectedMetric)}
                  </div>
                </a>
              )
            })}
          </div>
          <p className="px-4 md:px-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
            "Anthropic (Direct)" is a no-gateway control, not a competing gateway. <br /> Delta vs. the {leaderboardDelta.baselineName || "baseline"}'s {AI_GATEWAY_METRIC_LABELS[selectedMetric].toLowerCase()}. Positive is better than baseline; negative is worse.
          </p>
        </div>
      </div>

      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {/* Performance Over Time */}
        {filteredHistory.length > 0 && (
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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
            <ChartContainer config={lineChartConfig} className="aspect-auto h-[300px] w-full min-h-[300px] min-w-0">
              <LineChart data={filteredHistory} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={chartScale === "zoom" && lineZoomDomain ? lineZoomDomain : undefined}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => {
                    if (selectedMetric === "compositeScore") return v.toFixed(0)
                    if (selectedMetric === "outputTokensPerSec") return `${v.toFixed(0)}`
                    if (isConnectionPhaseMetric(selectedMetric)) return v.toFixed(1)
                    return `${(v / 1000).toFixed(1)}s`
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        const numValue = value as number
                        const providerName = (name as string).replace(/_(?:coldE2eMs|warmTtftMs|outputTokensPerSec|dnsMs|tcpMs|tlsMs|compositeScore)$/, "")
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: AI_GATEWAY_PROVIDER_COLORS[providerName] || "#6b7280" }}
                              />
                              <span className="text-gray-500 dark:text-gray-400">{capitalize(providerName)}</span>
                            </div>
                            <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                              {formatAIGatewayValue(numValue, selectedMetric)}
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
                          const provider = (entry.dataKey as string).replace(/_(?:coldE2eMs|warmTtftMs|outputTokensPerSec|dnsMs|tcpMs|tlsMs|compositeScore)$/, "")
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
          </div>
        )}

        {/* Bar chart */}
        {chartData.length > 0 && (
          <div className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8">
            <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-1 text-left">
              {AI_GATEWAY_METRIC_LABELS[selectedMetric]}
              {isHigher && selectedMetric !== "compositeScore" && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">higher is better</span>
              )}
            </h2>
            <ChartContainer config={barChartConfig} className="aspect-auto w-full min-w-0" style={{ height: `${barChartHeight}px`, minHeight: `${barChartHeight}px` }}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: isMobile ? 80 : 120, left: isMobile ? 0 : 20, bottom: 5 }}
              >
                <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, isComposite ? 100 : maxBarValue * 1.2]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => {
                    if (isComposite) return v.toFixed(0)
                    if (selectedMetric === "outputTokensPerSec") return `${v.toFixed(0)}`
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
                  width={isMobile ? 80 : 100}
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
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: AI_GATEWAY_PROVIDER_COLORS[d.provider] || "#6b7280" }} />
                              <span className="font-semibold text-gray-900 dark:text-gray-50">{d.displayName}</span>
                              {d.isBaseline && <BaselineBadge />}
                            </div>
                            <div className="flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Cold E2E</span>
                                <span className="font-mono font-medium text-gray-900 dark:text-gray-50">{d.coldE2eMs.toFixed(0)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Warm TTFT</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{d.warmTtftMs.toFixed(0)}ms</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Tokens/sec</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{d.outputTokensPerSec.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                    />
                  }
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={28}>
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
                      return formatAIGatewayValue(v, selectedMetric)
                    }}
                  />
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AI_GATEWAY_PROVIDER_COLORS[entry.provider] || "#6b7280"} fillOpacity={entry.isBaseline ? 0.55 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {/* Data table */}
        <div className="py-6 md:py-8">
          <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-3">
            Detailed Metrics
          </h2>
          {data.active.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="bg-white dark:bg-gray-800/50">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          style={{ width: header.getSize() }}
                          className={`p-3 text-xs font-medium text-gray-900 dark:text-gray-400 uppercase tracking-wider ${
                            (header.column.columnDef.meta as any)?.align === "left" ? "text-left" : "text-center"
                          } ${header.column.getCanSort() ? "cursor-pointer select-none font-semibold hover:text-gray-500 dark:hover:text-white" : ""}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className={`flex items-center gap-1 ${(header.column.columnDef.meta as any)?.align === "left" ? "justify-start" : "justify-center"}`}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y bg-white dark:bg-gray-900/50 divide-gray-200 dark:divide-gray-700">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors ${
                        isAIGatewayBaseline(row.original.provider) ? "bg-gray-50/60 dark:bg-gray-800/20" : ""
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`py-2 px-6 text-gray-900 dark:text-white whitespace-nowrap ${
                            (cell.column.columnDef.meta as any)?.align === "left" ? "text-left" : "text-center"
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
