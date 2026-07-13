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
import type { BrowserResult } from "./benchmarkConstants"

interface BrowserDataTableProps {
  activeResults: BrowserResult[]
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

export function BrowserDataTable({ activeResults }: BrowserDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "compositeScore", desc: true }])

  const columns = useMemo<ColumnDef<BrowserResult>[]>(
    () => [
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const provider = row.original.provider
          return (
            <a href={`/benchmarks/browsers/${provider}`} className="flex items-center gap-2 no-underline hover:opacity-80 transition-opacity">
              <span className="font-medium text-gray-900 dark:text-white">{capitalize(provider)}</span>
            </a>
          )
        },
        enableSorting: false,
        size: 180,
        meta: { align: "left" },
      },
      {
        id: "compositeScore",
        accessorFn: (r) => r.compositeScore ?? 0,
        header: "Score",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(1)}</span>,
        sortDescFirst: true,
        size: 80,
      },
      {
        id: "totalMs",
        accessorFn: (r) => r.summary.totalMs.median,
        header: "Total (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 110,
      },
      {
        id: "createMs",
        accessorFn: (r) => r.summary.createMs.median,
        header: "Create (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 110,
      },
      {
        id: "connectMs",
        accessorFn: (r) => r.summary.connectMs.median,
        header: "Connect (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 110,
      },
      {
        id: "navigateMs",
        accessorFn: (r) => r.summary.navigateMs.median,
        header: "Navigate (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 110,
      },
      {
        id: "successRate",
        accessorFn: (r) => r.successRate ?? 1,
        header: "Success",
        cell: ({ getValue }) => <span className="font-mono text-xs">{Math.round((getValue() as number) * 100)}%</span>,
        sortDescFirst: true,
        size: 80,
      },
    ],
    []
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-white dark:bg-gray-800/50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={`p-3 text-xs font-medium text-gray-900 dark:text-gray-400 uppercase tracking-wider ${
                    (header.column.columnDef.meta as any)?.align === "left" ? "text-left" : "text-center"
                  } ${header.column.getCanSort() ? "cursor-pointer select-none font-semibold hover:text-gray-500 dark:hover:text-white" : ""}`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className={`flex items-center gap-1 ${(header.column.columnDef.meta as any)?.align === "left" ? "justify-start" : "justify-center"}`}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && <SortIcon sorted={header.column.getIsSorted()} />}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y bg-white dark:bg-gray-900/50 divide-gray-200 dark:divide-gray-700">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`py-2 px-6 text-gray-900 dark:text-white whitespace-nowrap ${(cell.column.columnDef.meta as any)?.align === "left" ? "text-left" : "text-center"}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
