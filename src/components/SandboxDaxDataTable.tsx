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
import { capitalize, DAX_PHASES_TOTAL } from "./benchmarkConstants"
import type { DaxResult } from "./benchmarkConstants"

interface SandboxDaxDataTableProps {
  activeResults: DaxResult[]
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="h-3 w-3" />
  if (sorted === "desc") return <ArrowDown className="h-3 w-3" />
  return <ArrowUpDown className="h-3 w-3 opacity-40" />
}

export function SandboxDaxDataTable({ activeResults }: SandboxDaxDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "phasesCompleted", desc: true }])

  const columns = useMemo<ColumnDef<DaxResult>[]>(
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
        id: "phasesCompleted",
        accessorFn: (r) => r.phasesCompleted ?? 0,
        header: "Phases",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.phasesCompleted ?? 0}/{row.original.phasesTotal ?? DAX_PHASES_TOTAL}
          </span>
        ),
        sortDescFirst: true,
        size: 90,
      },
      {
        id: "successRate",
        accessorFn: (r) => r.successRate ?? 0,
        header: "Success",
        cell: ({ getValue }) => <span className="font-mono text-xs">{((getValue() as number) * 100).toFixed(0)}%</span>,
        sortDescFirst: true,
        size: 90,
      },
      {
        id: "totalMs",
        accessorFn: (r) => r.summary.totalMs.median,
        header: "Total (med)",
        cell: ({ row, getValue }) => {
          const reached = (row.original.phasesCompleted ?? 0) >= (row.original.phasesTotal ?? DAX_PHASES_TOTAL)
          return <span className={`font-mono text-xs ${reached ? "" : "text-gray-400 dark:text-gray-500"}`}>{reached ? `${((getValue() as number) / 1000).toFixed(2)}s` : "Failed"}</span>
        },
        size: 100,
      },
      {
        id: "prepareMs",
        accessorFn: (r) => r.summary.prepareMs.median,
        header: "Prepare",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "bunDownloadMs",
        accessorFn: (r) => r.summary.bunDownloadMs.median,
        header: "Bun DL",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 90,
      },
      {
        id: "bunUnpackMs",
        accessorFn: (r) => r.summary.bunUnpackMs.median,
        header: "Bun Unpack",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "cloneMs",
        accessorFn: (r) => r.summary.cloneMs.median,
        header: "Clone",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "installMs",
        accessorFn: (r) => r.summary.installMs.median,
        header: "Install",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 100,
      },
      {
        id: "typecheckMs",
        accessorFn: (r) => r.summary.typecheckMs.median,
        header: "Typecheck",
        cell: ({ getValue }) => {
          const v = getValue() as number
          return <span className={`font-mono text-xs ${v > 0 ? "" : "text-gray-400 dark:text-gray-500"}`}>{v > 0 ? `${(v / 1000).toFixed(2)}s` : "—"}</span>
        },
        size: 100,
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
