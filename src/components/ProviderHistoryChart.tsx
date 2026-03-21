import { useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
import { ChartContainer } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { PROVIDER_COLORS, capitalize } from "./benchmarkConstants"
import type { HistoryDataPoint, Metric } from "./benchmarkConstants"

interface ProviderHistoryChartProps {
  historyData: HistoryDataPoint[]
  provider: string
  selectedMetric?: Metric
}

export function ProviderHistoryChart({ historyData, provider, selectedMetric = "median" }: ProviderHistoryChartProps) {
  const color = PROVIDER_COLORS[provider] || "#6b7280"
  const isComposite = selectedMetric === "compositeScore"
  const dataKey = `${provider}_${selectedMetric}`

  const chartConfig: ChartConfig = useMemo(() => ({
    [provider]: {
      label: capitalize(provider),
      color,
    },
  }), [provider, color])

  const hasData = historyData.some((d) => d[dataKey] != null)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 dark:text-gray-500">
        No historical data available.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full min-h-[200px]">
      <LineChart
        data={historyData}
        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickFormatter={(value: number) => isComposite ? `${Math.round(value)}` : `${(value / 1000).toFixed(1)}s`}
          width={40}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.[0]) return null
            const value = payload[0].value as number
            return (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-md">
                <div className="text-xs font-medium text-gray-900 dark:text-white">{label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isComposite ? "Score" : selectedMetric.toUpperCase()}: <span className="font-mono font-medium text-gray-900 dark:text-white">{isComposite ? (value as number).toFixed(1) : `${((value as number) / 1000).toFixed(2)}s`}</span>
                  </span>
                </div>
              </div>
            )
          }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, strokeWidth: 0, fill: color }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  )
}
