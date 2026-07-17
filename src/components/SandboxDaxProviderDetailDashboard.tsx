import { useState, useCallback } from "react"
import { Link, Check } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import {
  PROVIDER_COLORS,
  DAX_METRIC_LABELS,
  DAX_PHASES_TOTAL,
  DAX_PHASE_SEGMENT_LABELS,
  daxMetricReached,
  formatDaxMetricValue,
  formatDaxBytes,
  getDaxEnvironment,
  getDaxDiskUsage,
  capitalize,
} from "./benchmarkConstants"
import type { DaxResult, DaxHistoryPoint, DaxMetric } from "./benchmarkConstants"

interface SandboxDaxProviderDetailProps {
  provider: string
  result: DaxResult
  historyData: DaxHistoryPoint[]
}

type Percentile = "median" | "p95" | "p99"
type DaxSummaryMetric = Exclude<DaxMetric, "compositeScore">

const SUMMARY_METRICS: DaxSummaryMetric[] = ["totalMs", "prepareMs", "bunDownloadMs", "bunUnpackMs", "cloneMs", "installMs", "typecheckMs"]

function CopyableSectionHeading({ label, anchor, provider }: { label: string; anchor: string; provider: string }) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(() => {
    const url = `${window.location.origin}/benchmarks/sandboxes/dax/${provider}#${anchor}`
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

function PhaseProgress({ phasesCompleted, phasesTotal, color }: { phasesCompleted: number; phasesTotal: number; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {DAX_PHASE_SEGMENT_LABELS.slice(0, phasesTotal).map((label, i) => (
          <div
            key={label}
            title={label}
            className={`h-2 flex-1 rounded-full ${i < phasesCompleted ? "" : "bg-gray-200 dark:bg-gray-700"}`}
            style={i < phasesCompleted ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
        {DAX_PHASE_SEGMENT_LABELS.slice(0, phasesTotal).map((label, i) => (
          <span key={label} className={i < phasesCompleted ? "text-gray-700 dark:text-gray-300" : ""}>
            {i < phasesCompleted ? "✓" : "○"} {label}
          </span>
        ))}
      </div>
    </div>
  )
}

function MetricSection({
  provider,
  metric,
  result,
  historyData,
  color,
}: {
  provider: string
  metric: DaxSummaryMetric
  result: DaxResult
  historyData: DaxHistoryPoint[]
  color: string
}) {
  const [selectedPercentile, setSelectedPercentile] = useState<Percentile>("median")
  const reached = daxMetricReached(result, metric)
  const summary = result.summary[metric]
  const historyKey = `${provider}_${metric}`
  const lineConfig: ChartConfig = { [provider]: { label: capitalize(provider), color } }

  const hasHistory = historyData.some((point) => typeof point[historyKey] === "number")

  return (
    <div id={metric} className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="m-0">
          <CopyableSectionHeading label={DAX_METRIC_LABELS[metric]} anchor={metric} provider={provider} />
        </h2>
        {!reached && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
            Failed
          </span>
        )}
      </div>

      {!reached ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-6 text-sm text-gray-500 dark:text-gray-400">
          This phase never completed in the latest run, so there's no duration to show.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0 overflow-hidden">
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
                    {formatDaxMetricValue(summary[pct], metric)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            {hasHistory ? (
              <>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {DAX_METRIC_LABELS[metric]} Over Time
                </h3>
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
            ) : (
              <div className="h-[240px] min-h-[240px] w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">No history data available yet.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DiskUsageSection({ result, color }: { result: DaxResult; color: string }) {
  const disk = getDaxDiskUsage(result.iterations)
  if (!disk) return null

  const { afterClone, afterInstall, afterTypecheck } = disk
  const installedDelta = afterClone != null && afterInstall != null ? afterInstall - afterClone : null
  const typecheckDelta = afterInstall != null && afterTypecheck != null ? afterTypecheck - afterInstall : null

  const cards = [
    { label: "After Clone", value: afterClone, hint: "Repo size (source only)" },
    { label: "After Install", value: afterInstall, hint: installedDelta != null ? `${installedDelta >= 0 ? "+" : ""}${formatDaxBytes(installedDelta)} from bun install` : "Dependencies added by bun install" },
    { label: "After Typecheck", value: afterTypecheck, hint: typecheckDelta != null ? `${typecheckDelta >= 0 ? "+" : ""}${formatDaxBytes(typecheckDelta)} from typecheck` : "Build artifacts from typecheck, if any" },
  ]

  return (
    <div id="diskUsage" className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Disk Usage</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Total disk usage (<code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px]">du -sx</code>) captured after each phase — a proxy for disk I/O and storage cost. Some providers report 0 here if their sandbox filesystem doesn't support usable disk-usage reporting.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map(({ label, value, hint }) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</div>
            <div className="font-mono text-xl font-semibold" style={{ color: value != null && value > 0 ? color : undefined }}>
              {value != null ? formatDaxBytes(value) : "—"}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EnvironmentSection({ result }: { result: DaxResult }) {
  const env = getDaxEnvironment(result.iterations)
  if (!env) return null

  const memoryGb = env.memoryKib ? (parseInt(env.memoryKib, 10) / (1024 * 1024)).toFixed(1) : null

  const rows = [
    { label: "CPU", value: env.cpuModel },
    { label: "Logical CPUs", value: env.logicalCpus },
    { label: "Memory", value: memoryGb ? `${memoryGb} GB` : undefined },
    { label: "Architecture", value: env.architecture },
    { label: "Kernel", value: env.kernel },
    { label: "Bun Version", value: env.bunVersion },
    { label: "Node Version", value: env.nodeVersion },
    { label: "Commit", value: env.commit ? env.commit.slice(0, 7) : undefined },
  ].filter((r) => r.value)

  if (rows.length === 0) return null

  return (
    <div id="environment" className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Environment</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Sandbox hardware and software context — use this to tell whether a provider is faster because of more CPUs/memory, not a faster disk or network.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-3">
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={value}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IterationsTable({ result }: { result: DaxResult }) {
  const iterations = result.iterations ?? []
  if (iterations.length === 0) return null

  return (
    <div id="iterations" className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Raw Iterations</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Each iteration runs the full clone + install + typecheck cycle from a fresh sandbox.</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-white dark:bg-gray-800/50">
              {["#", "Phases", "Total", "Prepare", "Bun DL", "Bun Unpack", "Clone", "Install", "Typecheck", "Error"].map((h) => (
                <th key={h} className="p-3 text-xs font-medium text-gray-900 dark:text-gray-400 uppercase tracking-wider text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y bg-white dark:bg-gray-900/50 divide-gray-200 dark:divide-gray-700">
            {iterations.map((it, i) => (
              <tr key={i}>
                <td className="py-2 px-3 text-gray-900 dark:text-white">{i + 1}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.phasesCompleted ?? 0}/{it.phasesTotal ?? DAX_PHASES_TOTAL}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{(it.totalMs / 1000).toFixed(2)}s</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.prepareMs != null ? `${(it.prepareMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.bunDownloadMs != null ? `${(it.bunDownloadMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.bunUnpackMs != null ? `${(it.bunUnpackMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.cloneMs != null ? `${(it.cloneMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.installMs != null ? `${(it.installMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs text-gray-900 dark:text-white">{it.typecheckMs != null ? `${(it.typecheckMs / 1000).toFixed(2)}s` : "—"}</td>
                <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={it.error}>{it.error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SandboxDaxProviderDetailDashboard({ provider, result, historyData }: SandboxDaxProviderDetailProps) {
  const color = PROVIDER_COLORS[provider] || "#6b7280"
  const phasesCompleted = result.phasesCompleted ?? 0
  const phasesTotal = result.phasesTotal ?? DAX_PHASES_TOTAL
  const fullySucceeded = phasesCompleted >= phasesTotal
  const latestError = (result.iterations ?? []).find((it) => it.error)?.error

  return (
    <div className="not-content mt-0">
      <div className="md:max-w-7xl md:mx-auto px-4 md:px-6">
        {/* Phases Completed summary */}
        <div id="compositeScore" className="border-b border-gray-200/50 dark:border-gray-700/50 py-6 md:py-8 scroll-mt-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="m-0">
              <CopyableSectionHeading label="Phases Completed" anchor="compositeScore" provider={provider} />
            </h2>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
              fullySucceeded
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                : phasesCompleted > 0
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            }`}>
              {phasesCompleted}/{phasesTotal} phases
            </span>
          </div>
          <PhaseProgress phasesCompleted={phasesCompleted} phasesTotal={phasesTotal} color={color} />
          {latestError && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Latest Error</div>
              <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-words">{latestError}</div>
            </div>
          )}
        </div>

        <EnvironmentSection result={result} />
        <DiskUsageSection result={result} color={color} />

        {SUMMARY_METRICS.map((metric) => (
          <MetricSection
            key={metric}
            provider={provider}
            metric={metric}
            result={result}
            historyData={historyData}
            color={color}
          />
        ))}

        <IterationsTable result={result} />
      </div>
    </div>
  )
}
