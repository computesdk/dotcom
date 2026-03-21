import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip } from "recharts"
import { ChartContainer } from "./ui/chart"
import type { ChartConfig } from "./ui/chart"
import { PROVIDER_COLORS } from "./benchmarkConstants"

interface ProviderIterationHistogramProps {
  iterations: Array<{ ttiMs: number; error?: string }>
  provider: string
}

export function ProviderIterationHistogram({ iterations, provider }: ProviderIterationHistogramProps) {
  const color = PROVIDER_COLORS[provider] || "#6b7280"

  const { buckets, failedCount } = useMemo(() => {
    const successful = iterations.filter((i) => !i.error && i.ttiMs > 0)
    const failed = iterations.filter((i) => i.error || i.ttiMs === 0)

    if (successful.length === 0) {
      return { buckets: [], failedCount: failed.length }
    }

    const values = successful.map((i) => i.ttiMs)
    const min = Math.min(...values)
    const max = Math.max(...values)

    const BUCKET_COUNT = 15
    const range = max - min
    const bucketSize = range > 0 ? Math.ceil(range / BUCKET_COUNT) : 100

    const bucketMap = new Map<number, number>()
    for (const val of values) {
      const bucketIndex = range > 0
        ? Math.min(Math.floor((val - min) / bucketSize), BUCKET_COUNT - 1)
        : 0
      bucketMap.set(bucketIndex, (bucketMap.get(bucketIndex) || 0) + 1)
    }

    const result = []
    for (let i = 0; i < BUCKET_COUNT; i++) {
      const rangeStart = min + i * bucketSize
      const rangeEnd = rangeStart + bucketSize
      const count = bucketMap.get(i) || 0
      result.push({
        label: `${(rangeStart / 1000).toFixed(1)}s`,
        rangeLabel: `${(rangeStart / 1000).toFixed(2)}s - ${(rangeEnd / 1000).toFixed(2)}s`,
        count,
      })
    }

    return { buckets: result, failedCount: failed.length }
  }, [iterations])

  if (buckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400 dark:text-gray-500">
        No successful iterations to display.
      </div>
    )
  }

  const chartConfig: ChartConfig = {
    count: {
      label: "Iterations",
      color,
    },
  }

  return (
    <div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart
          data={buckets}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
            width={30}
          />
          <Tooltip
            cursor={{ fill: "var(--color-gray-100)", opacity: 0.1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const data = payload[0].payload as (typeof buckets)[0]
              return (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-md">
                  <div className="text-xs font-medium text-gray-900 dark:text-white">{data.rangeLabel}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {data.count} iteration{data.count !== 1 ? "s" : ""}
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} barSize={20}>
            {buckets.map((_, index) => (
              <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      {failedCount > 0 && (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
          {failedCount} failed iteration{failedCount !== 1 ? "s" : ""} not shown
        </div>
      )}
    </div>
  )
}
