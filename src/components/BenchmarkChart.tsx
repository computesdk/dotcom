import React, { useState, useMemo } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart"
import type { ChartConfig } from "./ui/chart"

interface HistoryDataPoint {
  date: string
  [provider: string]: number | string
}

interface BenchmarkChartProps {
  historyData: HistoryDataPoint[]
  providers: string[]
}

const PROVIDER_COLORS: Record<string, string> = {
  e2b: "#10b981",
  daytona: "#3b82f6",
  vercel: "#000000",
  modal: "#8b5cf6",
  blaxel: "#f97316",
  namespace: "#06b6d4",
  railway: "#ec4899",
  render: "#84cc16",
  hopx: "#f59e0b",
  codesandbox: "#6366f1",
  runloop: "#14b8a6",
}

function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function BenchmarkChart({ historyData, providers }: BenchmarkChartProps) {
  const [hiddenProviders, setHiddenProviders] = useState<Set<string>>(new Set())

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

  const visibleProviders = useMemo(
    () => providers.filter((p) => !hiddenProviders.has(p)),
    [providers, hiddenProviders]
  )

  const toggleProvider = (provider: string) => {
    setHiddenProviders((prev) => {
      const next = new Set(prev)
      if (next.has(provider)) {
        next.delete(provider)
      } else {
        next.add(provider)
      }
      return next
    })
  }

  if (!historyData.length) {
    return null
  }

  return (
    <div className="not-content w-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 text-center">
        Median TTI Over Time
      </h3>
      <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
        <LineChart
          data={historyData}
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
            tickFormatter={(value: number) => `${(value / 1000).toFixed(1)}s`}
          />
          <ChartTooltip
            itemSorter={(item) => (item.value as number) ?? 0}
            content={
              <ChartTooltipContent
                labelFormatter={(value) => value}
                formatter={(value, name) => {
                  const ms = value as number
                  return (
                    <div className="flex w-full items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{
                            backgroundColor:
                              PROVIDER_COLORS[name as string] || "#6b7280",
                          }}
                        />
                        <span className="text-gray-500 dark:text-gray-400">
                          {capitalize(name as string)}
                        </span>
                      </div>
                      <span className="font-mono font-medium tabular-nums text-gray-900 dark:text-gray-50">
                        {(ms / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )
                }}
              />
            }
          />
          {visibleProviders.map((provider) => (
            <Line
              key={provider}
              type="monotone"
              dataKey={provider}
              stroke={`var(--color-${provider})`}
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 0, fill: `var(--color-${provider})` }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ChartContainer>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
        {providers.map((provider) => {
          const isHidden = hiddenProviders.has(provider)
          return (
            <button
              key={provider}
              type="button"
              onClick={() => toggleProvider(provider)}
              className={`not-content flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-opacity ${
                isHidden ? "opacity-30" : "opacity-100"
              }`}
            >
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: PROVIDER_COLORS[provider] || "#6b7280",
                }}
              />
              <span className="text-gray-600 dark:text-gray-400">
                {capitalize(provider)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
