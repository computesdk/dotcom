import { useMemo, useCallback } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { HistoryDataPoint, Metric } from "./benchmarkConstants"

interface BenchmarkChartProps {
  historyData: HistoryDataPoint[]
  providers: string[]
  hiddenProviders: Set<string>
  onToggleProvider: (provider: string) => void
  timeRange: "30" | "60" | "90" | "all"
  selectedMetric: Metric
}

export function BenchmarkChart({ historyData, providers, hiddenProviders, onToggleProvider, timeRange, selectedMetric }: BenchmarkChartProps) {
  const isComposite = selectedMetric === "compositeScore"
  const chartConfig = useMemo(() => {
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
    if (timeRange === "all") return historyData
    const days = parseInt(timeRange)
    return historyData.slice(-days)
  }, [historyData, timeRange])

  const handleLegendClick = useCallback(
    (e: any) => {
      const raw = e.dataKey || e.value
      const provider = typeof raw === "string" ? raw.replace(/_(?:median|min|max|p95|p99|compositeScore)$/, "") : raw
      if (typeof provider === "string") onToggleProvider(provider)
    },
    [onToggleProvider]
  )

  const renderLegend = useCallback(
    (props: any) => {
      const { payload } = props
      if (!payload) return null
      return (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2">
          {payload.map((entry: any) => {
            const provider = (entry.dataKey || entry.value).replace(/_(?:median|min|max|p95|p99|compositeScore)$/, "")
            const isHidden = hiddenProviders.has(provider)
            return (
              <button
                key={provider}
                type="button"
                onClick={() => onToggleProvider(provider)}
                className={`inline-flex items-center gap-1.5 text-xs transition-opacity ${
                  isHidden ? "opacity-30" : "opacity-100"
                } hover:opacity-70`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-[2px] shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {capitalize(provider)}
                </span>
              </button>
            )
          })}
        </div>
      )
    },
    [hiddenProviders, onToggleProvider]
  )

  if (!filteredHistory.length) {
    return null
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full min-h-[300px] min-w-0">
      <LineChart
        data={filteredHistory}
        margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tick={{ fontSize: 11 }}
          tickFormatter={(value: number) => isComposite ? value.toFixed(0) : `${(value / 1000).toFixed(1)}s`}
        />
        <ChartTooltip
          itemSorter={(item) => (item.value as number) ?? 0}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => value}
              formatter={(value, name) => {
                const numValue = value as number
                const providerName = (name as string).replace(/_(?:median|min|max|p95|p99|compositeScore)$/, "")
                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                        style={{
                          backgroundColor:
                            PROVIDER_COLORS[providerName] || "#6b7280",
                        }}
                      />
                      <span className="text-gray-500 dark:text-gray-400">
                        {capitalize(providerName)}
                      </span>
                    </div>
                    <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                      {isComposite ? numValue.toFixed(1) : `${(numValue / 1000).toFixed(2)}s`}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Legend content={renderLegend} onClick={handleLegendClick} />
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
  )
}