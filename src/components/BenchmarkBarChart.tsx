import { useMemo, useSyncExternalStore } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { ProviderResult, Metric } from "./benchmarkConstants"

const METRIC_CHART_LABELS: Record<Metric, string> = {
  compositeScore: "Composite Score",
  median: "Median TTI (Time to Interactive)",
  p95: "P95 TTI (Time to Interactive)",
  p99: "P99 TTI (Time to Interactive)",
}

interface BenchmarkBarChartProps {
  activeResults: ProviderResult[]
  selectedMetric: Metric
}

function getMetricValue(r: ProviderResult, metric: Metric): number {
  if (metric === "compositeScore") return r.compositeScore ?? 0
  return r.summary.ttiMs[metric]
}

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === "compositeScore") return value.toFixed(1)
  return `${(value / 1000).toFixed(2)}s`
}

function useIsMobile(breakpoint = 640) {
  const subscribe = (cb: () => void) => {
    const mql = window.matchMedia(`(min-width: ${breakpoint}px)`)
    mql.addEventListener("change", cb)
    return () => mql.removeEventListener("change", cb)
  }
  const getSnapshot = () => window.innerWidth >= breakpoint
  const getServerSnapshot = () => true
  return !useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function BenchmarkBarChart({ activeResults, selectedMetric }: BenchmarkBarChartProps) {
  const isComposite = selectedMetric === "compositeScore"
  const isMobile = useIsMobile()

  const chartData = useMemo(() => {
    const data = activeResults.map((r) => ({
      provider: r.provider,
      value: getMetricValue(r, selectedMetric),
      displayName: capitalize(r.provider),
      median: r.summary.ttiMs.median,
      p95: r.summary.ttiMs.p95,
      p99: r.summary.ttiMs.p99,
      compositeScore: r.compositeScore ?? 0,
      runs: r.iterations?.filter(i => !i.error).length || 0,
      totalRuns: r.iterations?.length || 0,
    }))
    return data.sort((a, b) => isComposite ? b.value - a.value : a.value - b.value)
  }, [activeResults, selectedMetric, isComposite])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: METRIC_CHART_LABELS[selectedMetric],
      },
    }
    for (const r of activeResults) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [activeResults, selectedMetric])

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.value))
  }, [chartData])

  if (!chartData.length) {
    return null
  }

  const chartHeight = Math.max(300, chartData.length * 40 + 60)

  return (
    <div className="not-content w-full max-w-7xl mx-auto">
      <h2 className="text-base text-md font-semibold text-gray-900 dark:text-white mb-1 text-left">
        {METRIC_CHART_LABELS[selectedMetric]}
      </h2>
      <ChartContainer config={chartConfig} className="aspect-auto w-full min-w-0" style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: isMobile ? 50 : 100, left: isMobile ? 0 : 20, bottom: 5 }}
        >
          <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, isComposite ? 100 : maxValue + 500]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => isComposite ? value.toFixed(0) : `${(value / 1000).toFixed(1)}s`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "currentColor" }}
            width={isMobile ? 60 : 80}
            className="text-gray-600 dark:text-gray-400"
          />
          {!isMobile && (
            <YAxis
              yAxisId="right"
              orientation="right"
              type="category"
              dataKey="runs"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickFormatter={(value, index) => {
                const item = chartData[index]
                return item ? `${item.runs}/${item.totalRuns}` : `${value}`
              }}
              width={70}
              className="text-gray-500 dark:text-gray-500"
            />
          )}
          <ChartTooltip
            cursor={{ fill: "var(--color-gray-100)", opacity: 0.1 }}
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name, props) => {
                  const d = props.payload
                  const provider = d.provider
                  const formatSecs = (val: number) => `${(val / 1000).toFixed(2)}s`
                  return (
                    <div className="flex flex-col gap-2 w-[180px]">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{
                            backgroundColor:
                              PROVIDER_COLORS[provider] || "#6b7280",
                          }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-gray-50">
                          {d.displayName}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Median</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-gray-50">{formatSecs(d.median)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">P95</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">{formatSecs(d.p95)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">P99</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">{formatSecs(d.p99)}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
            }
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              fill="currentColor"
              fontSize={11}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
              formatter={(value: any) => {
                if (typeof value !== 'number') return ''
                return formatMetricValue(value, selectedMetric)
              }}
            />
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PROVIDER_COLORS[entry.provider] || "#6b7280"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}