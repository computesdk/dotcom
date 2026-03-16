import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { capitalize } from "./benchmarkConstants"
import type { ProviderResult } from "./benchmarkConstants"

interface BenchmarkDataTableProps {
  activeResults: ProviderResult[]
  providerLogos: Record<string, string>
  providerLogosDark: Record<string, string>
}

const formatSecs = (ms: number) => `${(ms / 1000).toFixed(2)}s`

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

export function BenchmarkDataTable({ activeResults, providerLogos, providerLogosDark }: BenchmarkDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "median", desc: false },
  ])

  const columns = useMemo<ColumnDef<ProviderResult>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => (
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            {row.index + 1}
          </span>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const provider = row.original.provider
          const logoLight = providerLogos[provider]
          const logoDark = providerLogosDark[provider]
          return (
            <div className="flex items-center gap-2">
              {logoLight && (
                <>
                  <img src={logoLight} alt="" className="h-5 w-auto object-contain dark:hidden" />
                  <img src={logoDark || logoLight} alt="" className="h-5 w-auto object-contain hidden dark:block" />
                </>
              )}
              {!logoLight && (
                <span className="font-medium text-gray-900 dark:text-white">
                  {capitalize(provider)}
                </span>
              )}
            </div>
          )
        },
        enableSorting: false,
        size: 160,
      },
      {
        id: "compositeScore",
        accessorFn: (r) => r.compositeScore ?? 0,
        header: "Score",
        cell: ({ getValue }) => (
          <span className="font-mono">{(getValue() as number).toFixed(1)}</span>
        ),
        sortDescFirst: true,
        size: 80,
      },
      {
        id: "median",
        accessorFn: (r) => r.summary.ttiMs.median,
        header: "Median",
        cell: ({ getValue }) => (
          <span className="font-mono">{formatSecs(getValue() as number)}</span>
        ),
        size: 100,
      },
      {
        id: "p95",
        accessorFn: (r) => r.summary.ttiMs.p95,
        header: "P95",
        cell: ({ getValue }) => (
          <span className="font-mono">{formatSecs(getValue() as number)}</span>
        ),
        size: 100,
      },
      {
        id: "p99",
        accessorFn: (r) => r.summary.ttiMs.p99,
        header: "P99",
        cell: ({ getValue }) => (
          <span className="font-mono">{formatSecs(getValue() as number)}</span>
        ),
        size: 100,
      },
      {
        id: "successRate",
        accessorFn: (r) => r.successRate ?? (
          r.iterations
            ? r.iterations.filter((i) => !i.error).length / r.iterations.length
            : 1
        ),
        header: "Success",
        cell: ({ getValue }) => (
          <span className="font-mono">{Math.round((getValue() as number) * 100)}%</span>
        ),
        sortDescFirst: true,
        size: 80,
      },
    ],
    [providerLogos, providerLogosDark]
  )

  const table = useReactTable({
    data: activeResults,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!activeResults.length) {
    return null
  }

  return (
    <div className="not-content w-full max-w-7xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Detailed Metrics
      </h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50 dark:bg-gray-800/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                      header.column.getCanSort() ? "cursor-pointer select-none hover:text-gray-900 dark:hover:text-white" : ""
                    }`}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <SortIcon sorted={header.column.getIsSorted()} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}