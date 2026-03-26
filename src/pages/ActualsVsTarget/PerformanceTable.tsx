import { useEffect, useMemo, useState } from "react"
import { Search, TrendingDown, TrendingUp, MoreHorizontal, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Pagination from "@/components/ui/pagination"
import { cn } from "@/lib/utils"
import type { ActualEntry } from "@/types/kpi.types"
import { EmptyState } from "@/components/ui/empty-state"
import { toast } from "@/hooks/use-toast"

type Props = {
  rows: ActualEntry[]
  period: string
  role: string
  category: string
  viewLevel: string
  manualEntryMode?: boolean
  groupBy: "none" | "employee" | "role" | "category"
  setGroupBy: (value: "none" | "employee" | "role" | "category") => void
  onRowsChange: (rows: ActualEntry[]) => void
  onVisibleRowsChange: (rows: ActualEntry[]) => void
  onRowClick: (entry: ActualEntry) => void
  onResetFilters?: () => void
}

function formatRole(role: ActualEntry["role"]): string {
  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function roleBadgeClassName(role: ActualEntry["role"]): string {
  if (role === "leadership") return "border-orange-200 bg-orange-50 text-brand-blue"
  if (role === "branch-head") return "border-purple-200 bg-purple-50 text-purple-700"
  if (role === "sales-manager") return "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
  if (role === "sales-lead") return "border-amber-200 bg-amber-50 text-amber-700"
  if (role === "sales-executive") return "border-slate-200 bg-slate-50 text-slate-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function formatValue(value: number, unitType: ActualEntry["unitType"]): string {
  if (unitType === "currency") {
    const v = Math.abs(value)
    if (v >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
    if (v >= 10_000) return `$${Math.round(value / 1000)}K`
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  if (unitType === "percentage") return `${value.toFixed(1)}%`
  if (unitType === "teu") return `${value.toFixed(0)} TEU`
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function ragClassName(rag: ActualEntry["ragStatus"]): string {
  if (rag === "green") return "bg-green-100 text-green-800 border-green-200"
  if (rag === "amber") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-red-100 text-red-800 border-red-200"
}

function sparklineColor(rag: ActualEntry["ragStatus"]): string {
  if (rag === "green") return "#16A34A"
  if (rag === "amber") return "#D97706"
  return "#DC2626"
}

function buildSparklinePoints(values: number[]): string {
  if (values.length === 0) return ""
  const width = 48
  const height = 20
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")
}

export default function PerformanceTable({
  rows,
  period,
  role,
  category,
  viewLevel,
  manualEntryMode,
  groupBy,
  setGroupBy,
  onRowsChange,
  onVisibleRowsChange,
  onRowClick,
  onResetFilters,
}: Props) {
  const [search, setSearch] = useState("")
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftActual, setDraftActual] = useState<string>("")
  const [columns, setColumns] = useState<Record<string, boolean>>(() => {
    const saved = window.localStorage.getItem("kpi_table_columns")
    return saved
      ? JSON.parse(saved)
      : {
          employeeName: true,
          role: true,
          kpiName: true,
          unitType: true,
          target: true,
          actual: true,
          attainmentPct: true,
          priorPeriodPct: true,
          ragStatus: true,
          trend: true,
          actions: true,
        }
  })
  const [sorts, setSorts] = useState<Array<{ key: keyof ActualEntry; direction: "asc" | "desc" }>>([])

  useEffect(() => {
    window.localStorage.setItem("kpi_table_columns", JSON.stringify(columns))
  }, [columns])

  const tableRows = useMemo(() => {
    return rows.filter((entry) => {
      if (role !== "all" && entry.role !== role) return false
      if (category !== "all") {
        const n = entry.kpiName.toLowerCase()
        if (category === "financial") {
          const fin = /sales|revenue|gp|collection|enquiry|customer/i.test(n)
          if (!fin) return false
        }
        if (category === "delivery" && !n.includes("delivery")) return false
        if (category === "sales") {
          const sal = /sales|collection|revenue|conversion|customer|enquiry|gp/i.test(n)
          if (!sal) return false
        }
        if (category === "operations") {
          const ops = /jobs|ctnr|tons|overland|warehouse|project|breakbulk|dial|event|blitz|import|export|air|sea/i.test(n)
          if (!ops) return false
        }
        if (category === "compliance" && !/compliance|safety|audit/i.test(n)) return false
      }
      if (search) {
        const q = search.toLowerCase()
        return entry.employeeName.toLowerCase().includes(q) || entry.kpiName.toLowerCase().includes(q)
      }
      return true
    })
  }, [rows, role, category, search])
  const sortedRows = useMemo(() => {
    if (sorts.length === 0) return tableRows
    return [...tableRows].sort((a, b) => {
      for (const sort of sorts) {
        const av = a[sort.key]
        const bv = b[sort.key]
        let diff = 0
        if (typeof av === "number" && typeof bv === "number") diff = av - bv
        else diff = String(av).localeCompare(String(bv))
        if (diff !== 0) return sort.direction === "asc" ? diff : -diff
      }
      return 0
    })
  }, [tableRows, sorts])

  useEffect(() => {
    onVisibleRowsChange(sortedRows)
  }, [sortedRows, onVisibleRowsChange])

  const groupedRows = useMemo(() => {
    if (groupBy === "none") return [{ key: "All", rows: sortedRows }]
    const map = new Map<string, ActualEntry[]>()
    for (const row of sortedRows) {
      const groupKey =
        groupBy === "employee"
          ? row.employeeName
          : groupBy === "role"
            ? formatRole(row.role)
            : row.kpiName.toLowerCase().includes("revenue")
              ? "Financial"
              : row.kpiName.toLowerCase().includes("delivery")
                ? "Delivery"
                : "Other"
      if (!map.has(groupKey)) map.set(groupKey, [])
      map.get(groupKey)?.push(row)
    }
    return [...map.entries()].map(([key, groupRows]) => ({ key, rows: groupRows }))
  }, [groupBy, sortedRows])

  const flatGroupedRows = groupedRows.flatMap((group) =>
    group.rows.map((row) => ({
      type: "row" as const,
      group: group.key,
      row,
    })),
  )
  const total = flatGroupedRows.length
  const start = (page - 1) * rowsPerPage
  const end = start + rowsPerPage
  const pageRows = flatGroupedRows.slice(start, end)
  const totalPages = Math.ceil(Math.max(total, 1) / rowsPerPage)

  useEffect(() => {
    setPage(1)
  }, [rowsPerPage, search, role, category, period, groupBy])

  if (tableRows.length === 0) {
    return (
      <Card className="mb-6 bg-white">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold">Individual KPI Performance - FY 2025-26 {period.toUpperCase()}</CardTitle>
          <div className="relative w-56 opacity-0 pointer-events-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search employee, KPI..." />
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Search}
            title="No performance data"
            description="No results match the current filters."
            action={onResetFilters ? { label: "Reset filters", onClick: onResetFilters } : undefined}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 bg-white">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Individual KPI Performance - FY 2025-26 {period.toUpperCase()}</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as "none" | "employee" | "role" | "category")}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="role">Role</SelectItem>
              <SelectItem value="category">KPI Category</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                {Object.keys(columns).map((column) => (
                  <label key={column} className="flex items-center gap-2 text-sm capitalize">
                    <Checkbox
                      checked={columns[column]}
                      onCheckedChange={(checked) => setColumns((prev) => ({ ...prev, [column]: Boolean(checked) }))}
                    />
                    {column}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search employee, KPI..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.employeeName && <TableHead onClick={(e) => handleSort("employeeName", e.shiftKey)} className="cursor-pointer">Employee {renderSortIcon("employeeName")}</TableHead>}
                {columns.role && <TableHead onClick={(e) => handleSort("role", e.shiftKey)} className="cursor-pointer">Role {renderSortIcon("role")}</TableHead>}
                {columns.kpiName && <TableHead onClick={(e) => handleSort("kpiName", e.shiftKey)} className="cursor-pointer">KPI Item {renderSortIcon("kpiName")}</TableHead>}
                {columns.unitType && <TableHead>Unit</TableHead>}
                {columns.target && <TableHead onClick={(e) => handleSort("target", e.shiftKey)} className="cursor-pointer">Target {renderSortIcon("target")}</TableHead>}
                {columns.actual && <TableHead onClick={(e) => handleSort("actual", e.shiftKey)} className="cursor-pointer">Actual {renderSortIcon("actual")}</TableHead>}
                {columns.attainmentPct && <TableHead onClick={(e) => handleSort("attainmentPct", e.shiftKey)} className="cursor-pointer">Attainment % {renderSortIcon("attainmentPct")}</TableHead>}
                {columns.priorPeriodPct && <TableHead>vs Prior</TableHead>}
                {columns.ragStatus && <TableHead>RAG</TableHead>}
                {columns.trend && <TableHead>Trend</TableHead>}
                {columns.actions && <TableHead className="w-10">...</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupBy !== "none" &&
                groupedRows.map((group) => {
                  const avg = group.rows.reduce((sum, r) => sum + r.attainmentPct, 0) / group.rows.length
                  const ragCount = group.rows.reduce(
                    (acc, r) => ({ ...acc, [r.ragStatus]: acc[r.ragStatus] + 1 }),
                    { green: 0, amber: 0, red: 0 },
                  )
                  return (
                    <TableRow key={`group-${group.key}`} className="bg-slate-100 font-semibold">
                      <TableCell colSpan={11}>
                        {group.key} - Avg {avg.toFixed(1)}% | G:{ragCount.green} A:{ragCount.amber} R:{ragCount.red}
                      </TableCell>
                    </TableRow>
                  )
                })}
              {pageRows.map(({ row }, index) => {
                const prev = pageRows[index - 1]?.row
                const hideEmployee = prev?.employeeName === row.employeeName && groupBy === "none"
                const attainmentClassName =
                  row.attainmentPct >= 100 ? "text-brand-green" : row.attainmentPct >= 85 ? "text-brand-amber" : "text-brand-red"
                const leftBorderClass = row.attainmentPct < 85 ? "border-l-2 border-red-400" : row.attainmentPct >= 100 ? "border-l-2 border-green-400" : ""

                return (
                  <TableRow
                    key={`${row.id}-${viewLevel}`}
                    className={cn("hover:bg-slate-50/80 cursor-pointer", leftBorderClass)}
                    onClick={() => onRowClick(row)}
                  >
                    {columns.employeeName && <TableCell className={cn("font-medium", hideEmployee ? "text-muted-foreground/70" : "")}>
                      {hideEmployee ? "" : row.employeeName}
                    </TableCell>}
                    {columns.role && <TableCell>
                      <Badge variant="outline" className={cn("capitalize border", roleBadgeClassName(row.role))}>
                        {formatRole(row.role)}
                      </Badge>
                    </TableCell>}
                    {columns.kpiName && <TableCell>{row.kpiName}</TableCell>}
                    {columns.unitType && <TableCell className="uppercase text-xs text-muted-foreground">{row.unitType}</TableCell>}
                    {columns.target && <TableCell className="font-mono text-sm">{formatValue(row.target, row.unitType)}</TableCell>}
                    {columns.actual && <TableCell
                      className="font-mono text-sm cursor-pointer"
                      onClick={() => {
                        if (!manualEntryMode) return
                        setEditingId(row.id)
                        setDraftActual(String(row.actual))
                      }}
                    >
                      {editingId === row.id ? (
                        <Input
                          autoFocus
                          value={draftActual}
                          onChange={(e) => setDraftActual(e.target.value)}
                          onBlur={() => saveInlineActual(row)}
                          onKeyDown={(e) => e.key === "Enter" && saveInlineActual(row)}
                          className="h-8"
                        />
                      ) : (
                        formatValue(row.actual, row.unitType)
                      )}
                    </TableCell>}
                    {columns.attainmentPct && <TableCell className={cn("font-mono font-semibold", attainmentClassName)}>{row.attainmentPct.toFixed(1)}%</TableCell>}
                    {columns.priorPeriodPct && <TableCell>
                      <span className="inline-flex items-center gap-1">
                        {row.priorPeriodPct >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={row.priorPeriodPct >= 0 ? "text-green-700" : "text-red-700"}>
                          {row.priorPeriodPct >= 0 ? "+" : ""}
                          {row.priorPeriodPct.toFixed(1)}%
                        </span>
                      </span>
                    </TableCell>}
                    {columns.ragStatus && <TableCell>
                      <Badge variant="outline" className={cn("capitalize border inline-flex items-center gap-1.5", ragClassName(row.ragStatus))}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {row.ragStatus}
                      </Badge>
                    </TableCell>}
                    {columns.trend && <TableCell>
                      <svg width="48" height="20" viewBox="0 0 48 20" aria-hidden="true">
                        <polyline
                          fill="none"
                          stroke={sparklineColor(row.ragStatus)}
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          points={buildSparklinePoints(row.trend)}
                        />
                      </svg>
                    </TableCell>}
                    {columns.actions && <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRowClick(row)
                        }}
                        aria-label={`Open ${row.employeeName} details`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {total === 0 ? 0 : start + 1}-{Math.min(end, total)} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  function handleSort(key: keyof ActualEntry, multi: boolean) {
    setSorts((prev) => {
      const current = prev.find((s) => s.key === key)
      const nextDirection = current?.direction === "asc" ? "desc" : "asc"
      if (!multi) return [{ key, direction: nextDirection }]
      const without = prev.filter((s) => s.key !== key)
      return [...without, { key, direction: nextDirection }]
    })
  }

  function renderSortIcon(key: keyof ActualEntry) {
    const index = sorts.findIndex((sort) => sort.key === key)
    if (index === -1) return null
    const isAsc = sorts[index].direction === "asc"
    return (
      <span className="inline-flex items-center">
        {isAsc ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />}
        {sorts.length > 1 && <span className="ml-1 text-[10px]">{index + 1}</span>}
      </span>
    )
  }

  function saveInlineActual(row: ActualEntry) {
    const parsed = Number(draftActual)
    setEditingId(null)
    if (Number.isNaN(parsed)) return
    const nextRows = rows.map((item) => {
      if (item.id !== row.id) return item
      const attainmentPct = item.target === 0 ? 0 : (parsed / item.target) * 100
      const ragStatus = (attainmentPct >= 100 ? "green" : attainmentPct >= 85 ? "amber" : "red") as ActualEntry["ragStatus"]
      return { ...item, actual: parsed, attainmentPct, ragStatus }
    })
    onRowsChange(nextRows)
    toast({ title: "Actual updated" })
  }
}
