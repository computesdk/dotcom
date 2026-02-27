import React, { useState, useMemo } from "react"
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table"
import type { SortingState } from "@tanstack/react-table"

interface ProviderResult {
  provider: string
  summary: {
    ttiMs: {
      min: number
      max: number
      median: number
      p95: number
      p99: number
      avg: number
    }
  }
  skipped?: boolean
  skipReason?: string
  iterations?: Array<{ ttiMs: number; error?: string }>
}

interface BenchmarkTableProps {
  active: ProviderResult[]
  inactive: ProviderResult[]
  providerLogos: Record<string, string>
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2) + "s"
}

function capitalize(s: string): string {
  if (s.toLowerCase() === "e2b") return "E2B"
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function successCount(r: ProviderResult): string {
  if (!r.iterations || r.iterations.length === 0) return ""
  const ok = r.iterations.filter((i) => !i.error).length
  return `${ok}/${r.iterations.length}`
}

function successRatio(r: ProviderResult): number {
  if (!r.iterations || r.iterations.length === 0) return 0
  const ok = r.iterations.filter((i) => !i.error).length
  return ok / r.iterations.length
}

const columnHelper = createColumnHelper<ProviderResult>()

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") {
    return (
      <svg className="size-3.5 text-gray-700 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 5a.75.75 0 0 1 .53.22l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 6.81l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25A.75.75 0 0 1 10 5Z" clipRule="evenodd" />
      </svg>
    )
  }
  if (isSorted === "desc") {
    return (
      <svg className="size-3.5 text-gray-700 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    )
  }
  return (
    <svg className="size-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-60 transition-opacity" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 5a.75.75 0 0 1 .53.22l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 6.81l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25A.75.75 0 0 1 10 5Z" clipRule="evenodd" />
    </svg>
  )
}

export function BenchmarkTable({ active, inactive, providerLogos }: BenchmarkTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "median", desc: false },
  ])

  const maxMedian = useMemo(
    () => Math.max(...active.map((a) => a.summary.ttiMs.median)),
    [active]
  )

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "rank",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            #
          </span>
        ),
        cell: ({ row }) => {
          const isFirst = row.index === 0 && sorting[0]?.id === "median" && !sorting[0]?.desc
          return (
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                isFirst
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {row.index + 1}
            </span>
          )
        },
        size: 48,
        enableSorting: false,
      }),
      columnHelper.accessor("provider", {
        header: () => "Provider",
        cell: ({ getValue }) => {
          const provider = getValue()
          const logo = providerLogos[provider]
          return (
            <div className="flex items-center gap-3">
              {logo ? (
                <div className="shrink-0 w-20 flex items-center justify-center">
                  <img
                    src={logo}
                    alt={`${provider} logo`}
                    className="w-auto h-8 object-contain dark:invert"
                  />
                </div>
              ) : (
                <div className="shrink-0 w-20 rounded-md bg-gray-100 dark:bg-gray-800" />
              )}
            </div>
          )
        },
        sortingFn: "alphanumeric",
      }),
      columnHelper.accessor((row) => row.summary.ttiMs.median, {
        id: "median",
        header: () => "Median TTI",
        cell: ({ getValue, row }) => {
          const median = getValue()
          const barPct = Math.round((median / maxMedian) * 100)
          const isFirst = row.index === 0 && sorting[0]?.id === "median" && !sorting[0]?.desc
          return (
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-14 text-sm font-mono font-bold tabular-nums text-gray-900 dark:text-white">
                {formatSeconds(median)}
              </span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isFirst
                      ? "bg-emerald-500 dark:bg-emerald-400"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
            </div>
          )
        },
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.summary.ttiMs.min, {
        id: "min",
        header: () => "Min",
        cell: ({ getValue }) => (
          <span className="text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
            {formatSeconds(getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.summary.ttiMs.max, {
        id: "max",
        header: () => "Max",
        cell: ({ getValue }) => (
          <span className="text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
            {formatSeconds(getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.summary.ttiMs.p95, {
        id: "p95",
        header: () => "P95",
        cell: ({ getValue }) => (
          <span className="text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
            {formatSeconds(getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => row.summary.ttiMs.p99, {
        id: "p99",
        header: () => "P99",
        cell: ({ getValue }) => (
          <span className="text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
            {formatSeconds(getValue())}
          </span>
        ),
        sortingFn: "basic",
      }),
      columnHelper.accessor((row) => successRatio(row), {
        id: "runs",
        header: () => "Runs",
        cell: ({ row: tableRow }) => (
          <span className="text-sm font-mono tabular-nums text-gray-500 dark:text-gray-400">
            {successCount(tableRow.original)}
          </span>
        ),
        sortingFn: "basic",
      }),
    ],
    [maxMedian, providerLogos, sorting]
  )

  const table = useReactTable({
    data: active,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="w-full overflow-hidden bg-white dark:bg-gray-900/50 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-gray-200 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-800/40"
              >
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const isSorted = header.column.getIsSorted()
                  const isRank = header.id === "rank"
                  const isProvider = header.id === "provider"
                  const isLeftAligned = isRank || isProvider || header.id === "median"

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                        canSort ? "cursor-pointer select-none" : ""
                      } ${isRank ? "w-[3%] pl-5 pr-2" : ""} ${
                        isProvider ? "w-[10%] px-4" : ""
                      } ${header.id === "median" ? "w-[17%] px-4" : ""} ${
                        !isRank && !isProvider && header.id !== "median"
                          ? "w-[10%] px-4"
                          : ""
                      } ${header.id === "runs" ? "pl-4 pr-5" : ""} ${
                        isLeftAligned ? "text-left" : "text-right"
                      }`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span
                        className={`group inline-flex items-center gap-1.5 ${
                          !isLeftAligned ? "justify-end" : ""
                        }`}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && <SortIcon isSorted={isSorted} />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isFirst =
                row.index === 0 &&
                sorting[0]?.id === "median" &&
                !sorting[0]?.desc
              return (
                <tr
                  key={row.id}
                  className={`group border-b border-gray-100 dark:border-gray-800/60 transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/30 ${
                    isFirst
                      ? "bg-emerald-50/40 dark:bg-emerald-950/10"
                      : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isRank = cell.column.id === "rank"
                    const isProvider = cell.column.id === "provider"
                    const isMedian = cell.column.id === "median"
                    const isRuns = cell.column.id === "runs"
                    const isLeftAligned = isRank || isProvider || isMedian

                    return (
                      <td
                        key={cell.id}
                        className={`whitespace-nowrap align-middle ${
                          isRank ? "py-4 pl-5 pr-2" : ""
                        } ${isProvider ? "p-2" : ""} ${
                          isMedian ? "px-4 py-4" : ""
                        } ${
                          !isRank && !isProvider && !isMedian
                            ? "px-4 py-4"
                            : ""
                        } ${isRuns ? "pl-4 pr-5" : ""} ${
                          !isLeftAligned ? "text-right" : ""
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {inactive.map((r) => (
              <tr
                key={r.provider}
                className="border-b border-gray-100 dark:border-gray-800/60 opacity-40"
              >
                <td className="whitespace-nowrap py-4 pl-5 pr-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs text-gray-400 dark:text-gray-500">
                    --
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-md bg-gray-100 dark:bg-gray-800" />
                    <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                      {capitalize(r.provider)}
                    </span>
                  </div>
                </td>
                <td
                  className="px-4 py-4 text-sm text-gray-400 dark:text-gray-500"
                  colSpan={5}
                >
                  {r.skipped ? r.skipReason : "All iterations failed"}
                </td>
                <td className="whitespace-nowrap py-4 pl-4 pr-5 text-right text-sm font-mono tabular-nums text-gray-400 dark:text-gray-500">
                  {r.skipped ? "--" : successCount(r)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
