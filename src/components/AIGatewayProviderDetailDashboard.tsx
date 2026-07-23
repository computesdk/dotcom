import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { AI_GATEWAY_PROVIDER_COLORS, isAIGatewayBaseline, capitalize } from "./benchmarkConstants"
import type { AIGatewayResult, AIGatewayHistoryPoint, AIGatewayMetric } from "./benchmarkConstants"

type ChartScale = "full" | "zoom"

interface AIGatewayProviderDetailProps {
  provider: string
  result: AIGatewayResult
  historyData: AIGatewayHistoryPoint[]
}

const HISTORY_METRIC_LABELS: Record<AIGatewayMetric, string> = {
  compositeScore: "Score",
  coldE2eMs: "Cold E2E",
  warmTtftMs: "Warm TTFT",
  outputTokensPerSec: "Tokens/sec",
  dnsMs: "DNS",
  tcpMs: "TCP",
  tlsMs: "TLS",
}
const HISTORY_METRICS: AIGatewayMetric[] = ["coldE2eMs", "warmTtftMs", "outputTokensPerSec", "dnsMs", "tcpMs", "tlsMs"]

// DNS/TCP/TLS live on a millisecond scale two to three orders of magnitude
// smaller than the request-latency metrics (single-digit to low-double-digit
// ms vs. hundreds-to-thousands of ms) — they need their own formatting and
// zoom padding rather than the "/1000 -> seconds" treatment used elsewhere.
function isConnectionPhaseMetric(metric: AIGatewayMetric): boolean {
  return metric === "dnsMs" || metric === "tcpMs" || metric === "tlsMs"
}

function formatHistoryMetricValue(value: number, metric: AIGatewayMetric): string {
  if (metric === "outputTokensPerSec") return `${value.toFixed(0)} tok/s`
  if (isConnectionPhaseMetric(metric)) return `${value.toFixed(1)}ms`
  return `${value.toFixed(0)}ms`
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
        label: unit === "tok/s" ? `${rangeStart.toFixed(0)}` : unit === "ms" ? `${rangeStart.toFixed(1)}ms` : `${(rangeStart / 1000).toFixed(2)}s`,
        count,
      })
    }
    return { buckets: result }
  }, [values, unit])

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

// The cold-connection waterfall: DNS -> TCP -> TLS -> time-to-first-byte ->
// first-byte-to-first-token. Each segment's median is computed independently
// (not derived from a single iteration), so the bar lengths are indicative of
// where time goes, not an exact identity that sums to coldE2eMs.
function ColdPhaseWaterfall({ result, color }: { result: AIGatewayResult; color: string }) {
  const segments = useMemo(() => {
    const { dnsMs, tcpMs, tlsMs, coldTtfbMs, coldTtftMs } = result.summary
    const connectMs = dnsMs.median + tcpMs.median + tlsMs.median
    const toFirstByte = Math.max(0, coldTtfbMs.median - connectMs)
    const toFirstToken = Math.max(0, coldTtftMs.median - coldTtfbMs.median)
    return [
      { label: "DNS", value: dnsMs.median, fill: "#60a5fa" },
      { label: "TCP", value: tcpMs.median, fill: "#818cf8" },
      { label: "TLS", value: tlsMs.median, fill: "#a78bfa" },
      { label: "To First Byte", value: toFirstByte, fill: color },
      { label: "First Byte → Token", value: toFirstToken, fill: "#fbbf24" },
    ]
  }, [result, color])

  const total = segments.reduce((sum, s) => sum + s.value, 0)
  if (total <= 0) return null

  return (
    <div>
      <div className="flex w-full h-6 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${Math.max((s.value / total) * 100, 0.5)}%`, backgroundColor: s.fill }}
            title={`${s.label}: ${s.value.toFixed(1)}ms`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: s.fill }} />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.label}</span>
            <span className="ml-2 font-mono text-xs text-gray-900 dark:text-white">{s.value.toFixed(1)}ms</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AIGatewayProviderDetailDashboard({
  provider,
  result,
  historyData,
}: AIGatewayProviderDetailProps) {
  const [selectedMetric, setSelectedMetric] = useState<AIGatewayMetric>("coldE2eMs")
  const [chartScale, setChartScale] = useState<ChartScale>("zoom")
  const color = AI_GATEWAY_PROVIDER_COLORS[provider] || "#6b7280"
  const baseline = isAIGatewayBaseline(provider)

  const lineConfig: ChartConfig = {
    [provider]: { label: capitalize(provider), color },
  }

  const coldE2eValues = useMemo(
    () => result.iterations?.filter((i) => i.mode === "cold" && !i.error).map((i) => i.coldE2eMs ?? 0) ?? [],
    [result.iterations]
  )
  const warmTtftValues = useMemo(
    () => result.iterations?.filter((i) => i.mode === "warm" && !i.error).map((i) => i.ttftMs) ?? [],
    [result.iterations]
  )
  const tokensPerSecValues = useMemo(
    () => result.iterations?.filter((i) => !i.error && i.outputTokensPerSec != null).map((i) => i.outputTokensPerSec as number) ?? [],
    [result.iterations]
  )
  // DNS/TCP/TLS are only recorded on cold iterations — a warm request reuses
  // an already-open connection, so those phases don't apply (see types.ts).
  const dnsValues = useMemo(
    () => result.iterations?.filter((i) => i.mode === "cold" && !i.error && i.dnsMs != null).map((i) => i.dnsMs as number) ?? [],
    [result.iterations]
  )
  const tcpValues = useMemo(
    () => result.iterations?.filter((i) => i.mode === "cold" && !i.error && i.tcpMs != null).map((i) => i.tcpMs as number) ?? [],
    [result.iterations]
  )
  const tlsValues = useMemo(
    () => result.iterations?.filter((i) => i.mode === "cold" && !i.error && i.tlsMs != null).map((i) => i.tlsMs as number) ?? [],
    [result.iterations]
  )

  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom" || historyData.length === 0) return null
    const key = `${provider}_${selectedMetric}`
    const values: number[] = []
    for (const point of historyData) {
      const value = point[key]
      if (typeof value === "number" && Number.isFinite(value)) values.push(value)
    }
    if (values.length === 0) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const minSpread = selectedMetric === "outputTokensPerSec" ? 1 : isConnectionPhaseMetric(selectedMetric) ? 0.5 : 25
    const minPad = selectedMetric === "outputTokensPerSec" ? 2 : isConnectionPhaseMetric(selectedMetric) ? 0.5 : 50
    const spread = Math.max(max - min, minSpread)
    const pad = Math.max(spread * 0.15, minPad)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, historyData, provider, selectedMetric])

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
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white m-0">Request Latency</h2>
                  {baseline && (
                    <span className="ml-4 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      Baseline
                    </span>
                  )}
                </div>
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
              {baseline && (
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-4">
                  No gateway involved — a direct call to Anthropic's API, used as the no-gateway control every other provider is compared against.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  label="Cold E2E"
                  value={`${result.summary.coldE2eMs.median.toFixed(0)}ms`}
                />
                <StatCard
                  label="Warm TTFT"
                  value={`${result.summary.warmTtftMs.median.toFixed(0)}ms`}
                />
                <StatCard
                  label="Tokens/sec"
                  value={result.summary.outputTokensPerSec.median.toFixed(0)}
                />
                <StatCard
                  label="DNS"
                  value={`${result.summary.dnsMs.median.toFixed(1)}ms`}
                />
                <StatCard
                  label="TCP"
                  value={`${result.summary.tcpMs.median.toFixed(1)}ms`}
                />
                <StatCard
                  label="TLS"
                  value={`${result.summary.tlsMs.median.toFixed(1)}ms`}
                />
              </div>
            </>
          )
        })()}
      </div>

      {/* Cold connection waterfall */}
      <div className="border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Cold Connection Breakdown</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Where a fresh request's time goes: DNS lookup, TCP connect, TLS handshake, then time to first response byte, then first byte to first streamed token.
          </p>
          <ColdPhaseWaterfall result={result} color={color} />
        </div>
      </div>

      {/* History chart */}
      {historyData.length > 0 && (
        <div className="border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="md:max-w-7xl md:mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Performance Over Time</h2>
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
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
                      {HISTORY_METRIC_LABELS[m]}
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
                  tickFormatter={(v: number) => {
                    if (selectedMetric === "outputTokensPerSec") return v.toFixed(0)
                    if (isConnectionPhaseMetric(selectedMetric)) return v.toFixed(1)
                    return `${(v / 1000).toFixed(1)}s`
                  }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) => v}
                      formatter={(value) => {
                        const v = value as number
                        const formatted = formatHistoryMetricValue(v, selectedMetric)
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
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Cold E2E</h3>
                <IterationHistogram values={coldE2eValues} color={color} unit="s" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Warm TTFT</h3>
                <IterationHistogram values={warmTtftValues} color={color} unit="s" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Tokens/sec</h3>
                <IterationHistogram values={tokensPerSecValues} color={color} unit="tok/s" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">DNS</h3>
                <IterationHistogram values={dnsValues} color={color} unit="ms" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">TCP</h3>
                <IterationHistogram values={tcpValues} color={color} unit="ms" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">TLS</h3>
                <IterationHistogram values={tlsValues} color={color} unit="ms" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
