import { useEffect, useMemo, useRef, useState } from "react"
import { Download, TrendingUp, CheckCircle2, AlertTriangle, XCircle, CalendarIcon, Save } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { ActualEntry } from "@/types/kpi.types"
import { useTenantActuals } from "@/hooks/useTenantScope"
import PerformanceCharts from "./PerformanceCharts"
import PerformanceTable from "./PerformanceTable"
import DrillDownDrawer from "./DrillDownDrawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { useCountUp } from "@/hooks/useCountUp"
import { useSearchParams } from "react-router-dom"
import { toast } from "@/hooks/use-toast"
import * as XLSX from "xlsx"

type PeriodFilter = "ytd" | "monthly"
type ViewLevel = "individual" | "team" | "branch" | "region"
type RoleFilter = "all" | "leadership" | "branch-head" | "sales-manager" | "sales-lead" | "sales-executive"
type CategoryFilter = "all" | "delivery" | "financial" | "sales" | "operations" | "compliance"

type FilterBarProps = {
  period: PeriodFilter
  role: RoleFilter
  category: CategoryFilter
  viewLevel: ViewLevel
  dateFrom: string
  dateTo: string
  presets: Array<{ name: string; state: Record<string, string> }>
  onSavePreset: () => void
  onApplyPreset: (name: string) => void
  onClearFilters: () => void
  onExportCsv: () => void
  onExportPdf: () => void
  onExportExcel: () => void
  setPeriod: (value: PeriodFilter) => void
  setRole: (value: RoleFilter) => void
  setCategory: (value: CategoryFilter) => void
  setViewLevel: (value: ViewLevel) => void
  setDateFrom: (value: string) => void
  setDateTo: (value: string) => void
  activeChips: Array<{ key: string; label: string; value: string }>
  removeChip: (key: string) => void
}

function FilterBar({
  period, role, category, viewLevel, setPeriod, setRole, setCategory, setViewLevel, dateFrom, dateTo, setDateFrom, setDateTo,
  activeChips, removeChip, onClearFilters, presets, onApplyPreset, onSavePreset, onExportCsv, onExportPdf, onExportExcel,
}: FilterBarProps) {

  return (
    <div className="bg-white border-b px-6 py-3 flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ytd">YTD</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4" />
              {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : "Pick date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="space-y-2">
              <Calendar
                mode="range"
                selected={{
                  from: dateFrom ? new Date(dateFrom) : undefined,
                  to: dateTo ? new Date(dateTo) : undefined,
                }}
                onSelect={(range) => {
                  if (range?.from) setDateFrom(range.from.toISOString().slice(0, 10))
                  if (range?.to) setDateTo(range.to.toISOString().slice(0, 10))
                }}
              />
            </div>
          </PopoverContent>
        </Popover>

        <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="leadership">Leadership</SelectItem>
            <SelectItem value="branch-head">Branch Head</SelectItem>
            <SelectItem value="sales-manager">Sales Manager</SelectItem>
            <SelectItem value="sales-lead">Sales Lead</SelectItem>
            <SelectItem value="sales-executive">Sales Executive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setCategory(value as CategoryFilter)}>
        <SelectTrigger className="w-[190px] h-9">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          <SelectItem value="delivery">Delivery</SelectItem>
          <SelectItem value="financial">Financial</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="operations">Operations</SelectItem>
          <SelectItem value="compliance">Compliance</SelectItem>
        </SelectContent>
        </Select>

        <div className="inline-flex items-center rounded-md border p-0.5">
          {(["individual", "team", "branch", "region"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setViewLevel(level)}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-sm capitalize transition-colors",
                viewLevel === level ? "bg-slate-100 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {level}
            </button>
          ))}
        </div>

        <Select onValueChange={(name) => onApplyPreset(name)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="My Filters" /></SelectTrigger>
          <SelectContent>
            {presets.map((preset) => <SelectItem key={preset.name} value={preset.name}>{preset.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onSavePreset}><Save className="h-4 w-4" />Save Filter</Button>
        <Button variant="outline" size="sm" onClick={onExportCsv} className="ml-auto"><Download className="h-4 w-4" />Export CSV</Button>
        <Button variant="outline" size="sm" onClick={onExportPdf}>Export PDF</Button>
        <Button variant="outline" size="sm" onClick={onExportExcel}>Export Excel</Button>
      </div>
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1">
              {chip.label}: {chip.value}
              <button onClick={() => removeChip(chip.key)} className="ml-1">x</button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>Clear all</Button>
        </div>
      )}
    </div>
  )
}

function SummaryCards({ rows, animateKey }: { rows: ActualEntry[]; animateKey: string }) {
  const attainment = rows.reduce((sum, r) => sum + r.attainmentPct, 0) / Math.max(rows.length, 1)
  const green = rows.filter((r) => r.ragStatus === "green").length
  const amber = rows.filter((r) => r.ragStatus === "amber").length
  const red = rows.filter((r) => r.ragStatus === "red").length
  const total = rows.length
  const attainmentCounter = useCountUp(attainment, 800, animateKey)
  const greenCounter = useCountUp(green, 800, animateKey)
  const amberCounter = useCountUp(amber, 800, animateKey)
  const redCounter = useCountUp(red, 800, animateKey)
  const circleRadius = 22
  const circumference = 2 * Math.PI * circleRadius
  const animatedPct = useCountUp(attainment, 800, animateKey)
  const dashOffset = circumference * (1 - animatedPct / 100)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="bg-white">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-muted-foreground">Overall Attainment</p>
              <p className="text-3xl font-mono font-semibold text-brand-teal">{attainmentCounter.toFixed(1)}%</p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3.5 w-3.5" />
                +2.1% vs last quarter
              </p>
            </div>
            <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
              <circle cx="26" cy="26" r={circleRadius} fill="none" stroke="#E2DFD8" strokeWidth="6" />
              <circle
                cx="26"
                cy="26"
                r={circleRadius}
                fill="none"
                stroke="#0C6B50"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 26 26)"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4 flex items-start justify-between">
          <div>
            <p className="text-2xl font-mono font-semibold text-brand-green">{Math.round(greenCounter)} / {total} KPIs</p>
            <p className="text-xs text-slate-600">On Target</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-brand-green" />
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-start justify-between">
          <div>
            <p className="text-2xl font-mono font-semibold text-brand-amber">{Math.round(amberCounter)}</p>
            <p className="text-xs text-slate-600">KPIs Near Miss</p>
          </div>
          <AlertTriangle className="h-5 w-5 text-brand-amber" />
        </CardContent>
      </Card>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4 flex items-start justify-between">
          <div>
            <p className="text-2xl font-mono font-semibold text-brand-red">{Math.round(redCounter)}</p>
            <p className="text-xs text-slate-600">KPIs Below Threshold</p>
          </div>
          <XCircle className="h-5 w-5 text-brand-red" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActualsVsTargetPage() {
  const actuals = useTenantActuals()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editableRows, setEditableRows] = useState<ActualEntry[]>(actuals)
  const [period, setPeriod] = useState<PeriodFilter>("ytd")
  const [role, setRole] = useState<RoleFilter>("all")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [viewLevel, setViewLevel] = useState<ViewLevel>("individual")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [groupBy, setGroupBy] = useState<"none" | "employee" | "role" | "category">("none")
  const [visibleRows, setVisibleRows] = useState<ActualEntry[]>(actuals)
  const [manualEntryMode] = useState(true)
  const initializedFromUrl = useRef(false)
  const [presets, setPresets] = useState<Array<{ name: string; state: Record<string, string> }>>(() => {
    const saved = window.localStorage.getItem("kpi_filter_presets")
    return saved ? JSON.parse(saved) : []
  })
  const [selectedEntry, setSelectedEntry] = useState<ActualEntry | null>(null)

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    // TODO: remove once API is connected
    const t = window.setTimeout(() => setLoading(false), 600)
    return () => window.clearTimeout(t)
  }, [searchParams])

  useEffect(() => {
    setEditableRows(actuals)
  }, [actuals])

  useEffect(() => {
    if (initializedFromUrl.current) return
    const fromParams = {
      period: searchParams.get("period"),
      role: searchParams.get("role"),
      category: searchParams.get("category"),
      viewLevel: searchParams.get("viewLevel"),
      dateFrom: searchParams.get("dateFrom"),
      dateTo: searchParams.get("dateTo"),
      groupBy: searchParams.get("groupBy"),
    }
    if (fromParams.period) setPeriod(fromParams.period as PeriodFilter)
    if (fromParams.role) setRole(fromParams.role as RoleFilter)
    if (fromParams.category) setCategory(fromParams.category as CategoryFilter)
    if (fromParams.viewLevel) setViewLevel(fromParams.viewLevel as ViewLevel)
    if (fromParams.dateFrom) setDateFrom(fromParams.dateFrom)
    if (fromParams.dateTo) setDateTo(fromParams.dateTo)
    if (fromParams.groupBy) setGroupBy(fromParams.groupBy as "none" | "employee" | "role" | "category")
    initializedFromUrl.current = true
  }, [searchParams])

  useEffect(() => {
    setSearchParams({
      period, role, category, viewLevel, dateFrom, dateTo, groupBy,
    })
  }, [period, role, category, viewLevel, dateFrom, dateTo, groupBy, setSearchParams])

  useEffect(() => {
    window.localStorage.setItem("kpi_filter_presets", JSON.stringify(presets))
  }, [presets])

  useEffect(() => {
    if (!selectedEntry) return
    const stillVisible = visibleRows.some((row) => row.id === selectedEntry.id)
    if (!stillVisible) setSelectedEntry(null)
  }, [visibleRows, selectedEntry])

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; value: string }> = []
    if (period !== "ytd") chips.push({ key: "period", label: "Period", value: period })
    if (role !== "all") chips.push({ key: "role", label: "Role", value: role })
    if (category !== "all") chips.push({ key: "category", label: "Category", value: category })
    if (viewLevel !== "individual") chips.push({ key: "viewLevel", label: "View", value: viewLevel })
    if (dateFrom && dateTo) chips.push({ key: "date", label: "Date", value: `${dateFrom} - ${dateTo}` })
    if (groupBy !== "none") chips.push({ key: "groupBy", label: "Group by", value: groupBy })
    return chips
  }, [period, role, category, viewLevel, dateFrom, dateTo, groupBy])

  if (loading) {
    return (
      <div className="space-y-4 bg-slate-50 min-h-full">
        <div className="px-6 pt-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        <div className="bg-white border-b px-6 py-3 flex items-center gap-3 flex-wrap">
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-[420px]" />
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-9 w-40 ml-auto rounded-md" />
        </div>

        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="bg-white">
                <CardContent className="p-4 flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6 bg-white">
            <CardContent>
              <div className="overflow-x-auto">
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-12" />
                      <Skeleton className="h-9 w-10 rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Card key={idx} className="bg-white">
                <CardHeader>
                  <Skeleton className="h-5 w-64" />
                </CardHeader>
                <CardContent className="h-[240px]">
                  <Skeleton className="h-full w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-slate-50 min-h-full">
      <div className="px-6 pt-6">
        <h2 className="text-2xl font-semibold tracking-tight text-brand-blue">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track performance by employee, KPI, and hierarchy</p>
      </div>
      <FilterBar
        period={period}
        role={role}
        category={category}
        viewLevel={viewLevel}
        dateFrom={dateFrom}
        dateTo={dateTo}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        activeChips={activeChips}
        removeChip={(key) => {
          if (key === "period") setPeriod("ytd")
          if (key === "role") setRole("all")
          if (key === "category") setCategory("all")
          if (key === "viewLevel") setViewLevel("individual")
          if (key === "date") {
            setDateFrom("")
            setDateTo("")
          }
          if (key === "groupBy") setGroupBy("none")
        }}
        presets={presets}
        onApplyPreset={(name) => {
          const preset = presets.find((p) => p.name === name)
          if (!preset) return
          setPeriod((preset.state.period as PeriodFilter) ?? "ytd")
          setRole((preset.state.role as RoleFilter) ?? "all")
          setCategory((preset.state.category as CategoryFilter) ?? "all")
          setViewLevel((preset.state.viewLevel as ViewLevel) ?? "individual")
          setDateFrom(preset.state.dateFrom ?? "")
          setDateTo(preset.state.dateTo ?? "")
          setGroupBy((preset.state.groupBy as "none" | "employee" | "role" | "category") ?? "none")
        }}
        onSavePreset={() => {
          const name = window.prompt("Preset name")
          if (!name) return
          setPresets((prev) => [...prev, { name, state: { period, role, category, viewLevel, dateFrom, dateTo, groupBy } }])
          toast({ title: "Filter preset saved" })
        }}
        onClearFilters={() => {
          setPeriod("ytd")
          setRole("all")
          setCategory("all")
          setViewLevel("individual")
          setDateFrom("")
          setDateTo("")
          setGroupBy("none")
        }}
        onExportCsv={() => {
          const csvRows = visibleRows.map((r) => ({
            Employee: r.employeeName,
            Role: r.role,
            KPI: r.kpiName,
            Target: r.target,
            Actual: r.actual,
            AttainmentPct: r.attainmentPct.toFixed(1),
            RAG: r.ragStatus,
          }))
          const header = Object.keys(csvRows[0] ?? {}).join(",")
          const body = csvRows.map((row) => Object.values(row).join(",")).join("\n")
          const csv = `${header}\n${body}`
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.href = url
          link.download = `KPI_Performance_FY_2025-26_${period}_${new Date().toISOString().slice(0, 10)}.csv`
          link.click()
          URL.revokeObjectURL(url)
        }}
        onExportPdf={() => window.print()}
        onExportExcel={() => {
          const wb = XLSX.utils.book_new()
          const summary = XLSX.utils.json_to_sheet([{ Period: period, Role: role, Category: category, View: viewLevel, Rows: visibleRows.length }])
          const raw = XLSX.utils.json_to_sheet(visibleRows)
          const chartData = XLSX.utils.json_to_sheet(visibleRows.map((r) => ({ employee: r.employeeName, kpi: r.kpiName, attainment: r.attainmentPct })))
          XLSX.utils.book_append_sheet(wb, summary, "Summary")
          XLSX.utils.book_append_sheet(wb, raw, "Raw Data")
          XLSX.utils.book_append_sheet(wb, chartData, "Charts data")
          XLSX.writeFile(wb, `KPI_Performance_FY_2025-26_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`)
        }}
        setPeriod={setPeriod}
        setRole={setRole}
        setCategory={setCategory}
        setViewLevel={setViewLevel}
      />
      <div className="px-6 pb-6">
        <SummaryCards rows={visibleRows} animateKey={`${period}-${role}-${category}-${viewLevel}-${dateFrom}-${dateTo}`} />
        <PerformanceCharts rows={visibleRows} />
        <PerformanceTable
          rows={editableRows}
          period={period}
          role={role}
          category={category}
          viewLevel={viewLevel}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          manualEntryMode={manualEntryMode}
          onRowsChange={setEditableRows}
          onVisibleRowsChange={setVisibleRows}
          onRowClick={setSelectedEntry}
          onResetFilters={() => {
            setPeriod("ytd")
            setRole("all")
            setCategory("all")
            setViewLevel("individual")
            setDateFrom("")
            setDateTo("")
            setGroupBy("none")
            setSelectedEntry(null)
          }}
        />
      </div>
      <DrillDownDrawer
        open={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry}
        allEntries={editableRows}
      />
    </div>
  )
}
