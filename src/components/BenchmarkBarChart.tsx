import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { ProviderResult } from "./benchmarkConstants"

interface BenchmarkBarChartProps {
  activeResults: ProviderResult[]
}

export function BenchmarkBarChart({ activeResults }: BenchmarkBarChartProps) {
  const chartData = useMemo(() => {
    return activeResults.map((r) => ({
      provider: r.provider,
      median: r.summary.ttiMs.median,
      displayName: capitalize(r.provider),
      min: r.summary.ttiMs.min,
      max: r.summary.ttiMs.max,
      p95: r.summary.ttiMs.p95,
      p99: r.summary.ttiMs.p99,
      runs: r.iterations?.filter(i => !i.error).length || 0,
      totalRuns: r.iterations?.length || 0,
    }))
  }, [activeResults])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      median: {
        label: "Median TTI",
      },
    }
    for (const r of activeResults) {
      config[r.provider] = {
        label: capitalize(r.provider),
        color: PROVIDER_COLORS[r.provider] || "#6b7280",
      }
    }
    return config
  }, [activeResults])

  const maxMedian = useMemo(() => {
    return Math.max(...chartData.map(d => d.median))
  }, [chartData])

  if (!chartData.length) {
    return null
  }

  const chartHeight = Math.max(300, chartData.length * 40 + 60)

  return (
    <div className="not-content w-full max-w-7xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 text-left">
        Median TTI (Time to Interactive)
      </h3>
      <ChartContainer config={chartConfig} className="aspect-auto w-full min-w-0" style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid horizontal={true} vertical={false} strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, maxMedian + 500]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => `${(value / 1000).toFixed(1)}s`}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "currentColor" }}
            width={80}
            className="text-gray-600 dark:text-gray-400"
          />
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
                          <span className="text-gray-500 dark:text-gray-400">Min</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">{formatSecs(d.min)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Max</span>
                          <span className="font-mono text-gray-600 dark:text-gray-300">{formatSecs(d.max)}</span>
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
            dataKey="median"
            radius={[0, 4, 4, 0]}
            barSize={24}
          >
            <LabelList
              dataKey="median"
              position="right"
              offset={8}
              fill="currentColor"
              fontSize={11}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
              formatter={(value: any) => {
                if (typeof value !== 'number') return ''
                return `${(value / 1000).toFixed(2)}s`
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