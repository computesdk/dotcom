import { useMemo, useState } from "react"
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
  const [chartScale, setChartScale] = useState<"full" | "zoom">("zoom")
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
  const lineZoomDomain = useMemo<[number, number] | null>(() => {
    if (chartScale !== "zoom") return null
    const values = historyData
      .map((d) => d[dataKey])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    if (!values.length) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(max - min, isComposite ? 0.1 : 50)
    const pad = isComposite ? Math.max(spread * 0.15, 0.5) : Math.max(spread * 0.15, 100)
    return [Math.max(0, min - pad), max + pad]
  }, [chartScale, historyData, dataKey, isComposite])

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 dark:text-gray-500">
        No historical data available.
      </div>
    )
  }

  return (
    <div>
      <div className="inline-flex h-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400 mb-3">
        {([
          { value: "full", label: "Full" },
          { value: "zoom", label: "Zoom" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setChartScale(value)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              chartScale === value
                ? "bg-white dark:bg-gray-950 text-gray-950 dark:text-gray-50 shadow"
                : "hover:text-gray-950 bg-gray-100 dark:bg-gray-800 dark:hover:text-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
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
          domain={chartScale === "zoom" && lineZoomDomain ? lineZoomDomain : undefined}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10 }}
          tickFormatter={(value: number) => isComposite ? `${Math.round(value)}` : `${Math.round(value)}ms`}
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
                    {isComposite ? "Score" : selectedMetric.toUpperCase()}: <span className="font-mono font-medium text-gray-900 dark:text-white">{isComposite ? (value as number).toFixed(1) : `${Math.round(value as number)}ms`}</span>
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
    </div>
  )
}
