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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import {
  SNAPSHOT_FORK_PROVIDER_COLORS,
  SNAPSHOT_FORK_METRIC_LABELS,
  capitalize,
} from "./benchmarkConstants"
import type { SnapshotForkResult, SnapshotForkHistoryPoint, SnapshotForkMetric } from "./benchmarkConstants"

type TimeRange = "30" | "60" | "90" | "all"
type ChartScale = "full" | "zoom"

interface SnapshotForkData {
  active: SnapshotForkResult[]
  historyData: SnapshotForkHistoryPoint[]
  timestamp: string
}

interface StorageSnapshotForkDashboardProps {
  data: SnapshotForkData
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
  currentBenchmark: "lifecycle" | "snapshot-fork"
}

const METRICS: SnapshotForkMetric[] = [
  "compositeScore",
  "snapshotCreateMs",
  "forkFromSnapshotMs",
  "forkFromLiveMs",
  "forkFirstReadMs",
]

const METRIC_DESCRIPTIONS: Record<SnapshotForkMetric, string> = {
  compositeScore: "Weighted blend of snapshot and fork latencies × success rate. Higher is better.",
  snapshotCreateMs: "Median time to create a snapshot of the current bucket state. Lower is better.",
  forkFromSnapshotMs: "Median time to create a fork from a previously-created snapshot. Lower is better.",
  forkFromLiveMs: "Median time to create a fork directly from the live parent bucket. Lower is better.",
  forkFirstReadMs: "Median time to read the first object from a newly-created fork. Lower is better.",
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "30", label: "30d" },
  { value: "60", label: "60d" },
  { value: "90", label: "90d" },
  { value: "all", label: "All" },
]

const STORAGE_BENCHMARK_LABELS: Record<"lifecycle" | "snapshot-fork", string> = {
  lifecycle: "Lifecycle",
  "snapshot-fork": "Snapshot / Fork",
}

const STORAGE_BENCHMARK_URLS: Record<"lifecycle" | "snapshot-fork", string> = {
  lifecycle: "/benchmarks/storage",
  "snapshot-fork": "/benchmarks/storage/snapshot-fork",
}

function isHigherBetter(metric: SnapshotForkMetric): boolean {
  return metric === "compositeScore"
}

function getMetricValue(r: SnapshotForkResult, metric: SnapshotForkMetric): number {
  if (metric === "compositeScore") return r.compositeScore ?? 0
  return r.summary[metric].median
}

function formatValue(value: number, metric: SnapshotForkMetric): string {
  if (metric === "compositeScore") return value.toFixed(1)
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

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

export function StorageSnapshotForkDashboard({
  data,
  providerLogos,
  providerLogosDark,
  currentBenchmark,
}: StorageSnapshotForkDashboardProps) {
  const [selectedMetric, setSelectedMetric] = useState<SnapshotForkMetric>("compositeScore")
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

  const providers = useMemo(() => data.active.map((r) => r.provider), [data.active])

  const isHigher = isHigherBetter(selectedMetric)
  const isComposite = selectedMetric === "compositeScore"

  const chartData = useMemo(() => {
    const rows = visibleResults.map((r) => ({
      provider: r.provider,
      displayName: capitalize(r.provider),
      value: getMetricValue(r, selectedMetric),
      compositeScore: r.compositeScore ?? 0,
      snapshotCreateMs: r.summary.snapshotCreateMs.median,
      forkFromSnapshotMs: r.summary.forkFromSnapshotMs.median,
      forkFromLiveMs: r.summary.forkFromLiveMs.median,
      forkFirstReadMs: r.summary.forkFirstReadMs.median,
    }))
    return rows.sort((a, b) => isHigher ? b.value - a.value : a.value - b.value)
  }, [visibleResults, selectedMetric, isHigher])

  const barChartConfig = useMemo(() => {
    const config: ChartConfig = { value: { label: SNAPSHOT_FORK_METRIC_LABELS[selectedMetric] } }
    for (const r of data.active) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: SNAPSHOT_FORK_PROVIDER_COLORS[r.provider] || "#6b7280",
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
        color: SNAPSHOT_FORK_PROVIDER_COLORS[provider] || "#6b7280",
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
    const metricKey = selectedMetric
    for (const point of filteredHistory) {
      for (const provider of providers) {
        if (hiddenProviders.has(provider)) continue
        const key = `${provider}_${metricKey}`
        const value = point[key]
        if (typeof value === "number" && Number.isFinite(value)) values.push(value)
      }
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(max - min, isComposite ? 0.1 : 100)
    const pad = isComposite
      ? Math.max(spread * 0.15, 0.5)
      : Math.max(spread * 0.15, 100)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, filteredHistory, selectedMetric, providers, hiddenProviders, isComposite])

  const [sorting, setSorting] = useState<SortingState>([{ id: "compositeScore", desc: true }])

  const columns = useMemo<ColumnDef<SnapshotForkResult>[]>(
    () => [
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const p = row.original.provider
          return (
            <span className="font-medium text-gray-900 dark:text-white">{capitalize(p)}</span>
          )
        },
        enableSorting: false,
        size: 160,
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
        id: "snapshotCreateMs",
        accessorFn: (r) => r.summary.snapshotCreateMs.median,
        header: "Snapshot (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 130,
      },
      {
        id: "forkFromSnapshotMs",
        accessorFn: (r) => r.summary.forkFromSnapshotMs.median,
        header: "Fork (snap) (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 145,
      },
      {
        id: "forkFromLiveMs",
        accessorFn: (r) => r.summary.forkFromLiveMs.median,
        header: "Fork (live) (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 140,
      },
      {
        id: "forkFirstReadMs",
        accessorFn: (r) => r.summary.forkFirstReadMs.median,
        header: "First Read (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 130,
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
          <Select
            value={currentBenchmark}
            onValueChange={(value) => {
              window.location.href = STORAGE_BENCHMARK_URLS[value as "lifecycle" | "snapshot-fork"]
            }}
          >
            <SelectTrigger className="w-[160px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["lifecycle", "snapshot-fork"] as const).map((type) => (
                <SelectItem key={type} value={type} className="text-sm">
                  {STORAGE_BENCHMARK_LABELS[type]}
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
                {SNAPSHOT_FORK_METRIC_LABELS[metric]}
              </button>
            ))}
          </div>
          {/* Mobile: dropdown */}
          <div className="sm:hidden">
            <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as SnapshotForkMetric)}>
              <SelectTrigger className="w-[180px] h-9 rounded-lg text-sm font-medium text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((metric) => (
                  <SelectItem key={metric} value={metric} className="text-sm">
                    <div>
                      <div>{SNAPSHOT_FORK_METRIC_LABELS[metric]}</div>
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

      {/* Provider Leaderboard */}
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
            const midpoint = Math.ceil(ranked.length / 2)
            const renderCard = (result: typeof ranked[0], index: number) => {
              const logoLight = providerLogos[result.provider]
              const logoDark = providerLogosDark[result.provider]
              return (
                <a
                  key={result.provider}
                  href={`/benchmarks/storage/snapshot-fork/${result.provider}`}
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
                        <img src={logoLight} alt={`${capitalize(result.provider)} logo`} className="w-full h-full object-contain dark:hidden" />
                        <img src={logoDark || logoLight} alt="" className="w-full h-full object-contain hidden dark:block" />
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SNAPSHOT_FORK_PROVIDER_COLORS[result.provider] || "#6b7280" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{capitalize(result.provider)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1" />
                  <div className="shrink-0 flex flex-col items-end">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {formatValue(result.metricValue, selectedMetric)}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {SNAPSHOT_FORK_METRIC_LABELS[selectedMetric]}
                    </span>
                  </div>
                  <svg className="size-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                </a>
              )
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 px-4 md:px-6">
                <div className="flex flex-col gap-2">
                  {ranked.slice(0, midpoint).map((r, i) => renderCard(r, i))}
                </div>
                <div className="flex flex-col gap-2">
                  {ranked.slice(midpoint).map((r, i) => renderCard(r, midpoint + i))}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {/* Performance Over Time */}
        {filteredHistory.length > 0 && (
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
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11 }} />
                <YAxis
                  domain={chartScale === "zoom" && lineZoomDomain ? lineZoomDomain : undefined}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => {
                    if (isComposite) return v.toFixed(0)
                    return `${(v / 1000).toFixed(1)}s`
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => value}
                      formatter={(value, name) => {
                        const numValue = value as number
                        const provider = (name as string).replace(/_(?:compositeScore|snapshotCreateMs|forkFromSnapshotMs|forkFromLiveMs|forkFirstReadMs)$/, "")
                        const formatted = isComposite
                          ? numValue.toFixed(1)
                          : `${(numValue / 1000).toFixed(2)}s`
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ backgroundColor: SNAPSHOT_FORK_PROVIDER_COLORS[provider] || "#6b7280" }}
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
                          const provider = (entry.dataKey as string).replace(/_(?:compositeScore|snapshotCreateMs|forkFromSnapshotMs|forkFromLiveMs|forkFirstReadMs)$/, "")
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
              {SNAPSHOT_FORK_METRIC_LABELS[selectedMetric]}
              {!isHigher && (
                <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">lower is better</span>
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
                      formatter={(_value, _name, props) => {
                        const d = props.payload
                        return (
                          <div className="flex flex-col gap-2 w-[220px]">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: SNAPSHOT_FORK_PROVIDER_COLORS[d.provider] || "#6b7280" }} />
                              <span className="font-semibold text-gray-900 dark:text-gray-50">{d.displayName}</span>
                            </div>
                            <div className="flex flex-col gap-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Snapshot create</span>
                                <span className="font-mono font-medium text-gray-900 dark:text-gray-50">{((d.snapshotCreateMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Fork (snapshot)</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.forkFromSnapshotMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Fork (live)</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.forkFromLiveMs as number) / 1000).toFixed(2)}s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">First read</span>
                                <span className="font-mono text-gray-600 dark:text-gray-300">{((d.forkFirstReadMs as number) / 1000).toFixed(2)}s</span>
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
                      return formatValue(v, selectedMetric)
                    }}
                  />
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SNAPSHOT_FORK_PROVIDER_COLORS[entry.provider] || "#6b7280"} />
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
                    <tr key={row.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
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
