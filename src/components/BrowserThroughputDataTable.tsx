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
import type { BrowserThroughputResult } from "./benchmarkConstants"

interface BrowserThroughputDataTableProps {
  activeResults: BrowserThroughputResult[]
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

export function BrowserThroughputDataTable({ activeResults }: BrowserThroughputDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "compositeScore", desc: true }])

  const columns = useMemo<ColumnDef<BrowserThroughputResult>[]>(
    () => [
      {
        id: "provider",
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => (
          <span className="font-medium text-gray-900 dark:text-white">
            {capitalize(row.original.provider)}
          </span>
        ),
        enableSorting: false,
        size: 150,
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
        id: "actionsPerSecond",
        accessorFn: (r) => r.summary.actionsPerSecond.median,
        header: "Actions/sec",
        cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as number).toFixed(2)}</span>,
        sortDescFirst: true,
        size: 110,
      },
      {
        id: "taskMs",
        accessorFn: (r) => r.summary.taskMs.median,
        header: "Task (med)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 100,
      },
      {
        id: "taskP95",
        accessorFn: (r) => r.summary.taskMs.p95,
        header: "Task (p95)",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) / 1000).toFixed(2)}s</span>,
        size: 100,
      },
      {
        id: "screenshotMs",
        accessorFn: (r) => r.summary.perActionType.screenshot?.median ?? 0,
        header: "Screenshot",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className="font-mono text-xs">{v > 0 ? `${v.toFixed(0)}ms` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "navigateMs",
        accessorFn: (r) => r.summary.perActionType.navigate?.median ?? 0,
        header: "Navigate",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className="font-mono text-xs">{v > 0 ? `${v.toFixed(0)}ms` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "clickMs",
        accessorFn: (r) => r.summary.perActionType.click?.median ?? 0,
        header: "Click",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className="font-mono text-xs">{v > 0 ? `${v.toFixed(0)}ms` : "—"}</span>
        },
        size: 90,
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

  if (!activeResults.length) return null

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
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
                  className={`py-2 px-6 text-gray-900 dark:text-white whitespace-nowrap ${
                    (cell.column.columnDef.meta as any)?.align === "left" ? "text-left" : "text-center"
                  }`}
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
