import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Clock3, History, Lock, Unlock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import Pagination from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useTenantActuals, useTenantAllocations, useTenantKpiItems, useTenantKpiTemplates } from "@/hooks/useTenantScope"
import type { PeriodType } from "@/types/kpi.types"

type PeriodState = "open" | "closed"

type PeriodCloseResult = {
  target: number
  actual: number
  backlogCarried: number
  fulfilledCount: number
  totalCount: number
  details: Array<{
    user: string
    kpi: string
    periodType: PeriodType
    target: number
    actual: number
    incomingBacklog: number
    currentMonthBacklog: number
    carriedBacklog: number
    nextAdjustedTarget: number
    nextCycleLabel: string
  }>
}

type HistoryEntry = {
  timestamp: string
  action: "open" | "close"
  periodIndex: number
  periodLabel: string
  result?: PeriodCloseResult
}

type TrackerState = {
  periodStateByIndex: Record<number, PeriodState>
  backlogByCycleKey: Record<string, number>
  history: HistoryEntry[]
}

const STORAGE_KEY = "period-tracker-state-v1"
const TRACKER_PERIOD_TYPES: PeriodType[] = ["quarterly", "monthly", "weekly", "daily"]

function periodLabels(periodType: PeriodType): string[] {
  if (periodType === "monthly") return ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
  if (periodType === "quarterly") return ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"]
  if (periodType === "weekly") {
    const year = new Date().getFullYear()
    const start = new Date(year, 0, 1)
    return Array.from({ length: 52 }, (_, idx) => {
      const d = new Date(start)
      d.setDate(start.getDate() + idx * 7)
      return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    })
  }
  if (periodType === "daily") {
    const year = new Date().getFullYear()
    const start = new Date(year, 0, 1)
    return Array.from({ length: 365 }, (_, idx) => {
      const d = new Date(start)
      d.setDate(start.getDate() + idx)
      return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
    })
  }
  return ["Annual"]
}

function countForPeriodType(periodType: PeriodType): number {
  if (periodType === "daily") return 365
  if (periodType === "weekly") return 52
  if (periodType === "monthly") return 12
  if (periodType === "quarterly") return 4
  return 1
}

function cycleIndexFromMonthIndex(monthIndex: number, periodType: PeriodType): number {
  if (periodType === "monthly") return monthIndex
  if (periodType === "quarterly") return Math.floor(monthIndex / 3)
  if (periodType === "annual") return 0
  // Approx mapping of selected month to fiscal day offset (for daily/weekly cadence)
  const monthDays = [30, 31, 30, 31, 31, 30, 31, 30, 31, 31, 28, 31] // Apr->Mar
  const dayOffset = monthDays.slice(0, monthIndex).reduce((sum, d) => sum + d, 0)
  if (periodType === "weekly") return Math.min(51, Math.floor(dayOffset / 7))
  return Math.min(364, dayOffset)
}

function labelForCycle(periodType: PeriodType, cycleIndex: number): string {
  if (periodType === "monthly") return periodLabels("monthly")[cycleIndex] ?? `M${cycleIndex + 1}`
  if (periodType === "quarterly") return `Q${cycleIndex + 1}`
  if (periodType === "weekly") return `Week ${cycleIndex + 1}`
  if (periodType === "daily") return `Day ${cycleIndex + 1}`
  return "Annual"
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

export default function PeriodTrackerPage() {
  const templates = useTenantKpiTemplates()
  const allocations = useTenantAllocations()
  const actuals = useTenantActuals()
  const kpiItems = useTenantKpiItems()

  const fiscalYearOptions = useMemo(() => [...new Set(allocations.map((a) => a.fiscalYear))], [allocations])
  const [fiscalYear, setFiscalYear] = useState<string>(fiscalYearOptions[0] ?? "FY 2025-26")
  const [trackerPeriodType, setTrackerPeriodType] = useState<PeriodType>("monthly")
  const [templateId, setTemplateId] = useState<string>("")
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportHistoryEntry, setReportHistoryEntry] = useState<HistoryEntry | null>(null)
  const [reportSearch, setReportSearch] = useState("")
  const [reportPage, setReportPage] = useState(1)
  const [reportRowsPerPage, setReportRowsPerPage] = useState(20)
  const [stateByKey, setStateByKey] = useState<Record<string, TrackerState>>({})
  const periodStripRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, TrackerState>
      setStateByKey(parsed)
    } catch {
      // noop for corrupt local data
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateByKey))
  }, [stateByKey])

  const templatesForYear = useMemo(() => {
    const ids = new Set(allocations.filter((a) => a.fiscalYear === fiscalYear).map((a) => a.templateId))
    return templates.filter((t) => ids.has(t.id))
  }, [allocations, templates, fiscalYear])

  useEffect(() => {
    if (!templatesForYear.length) {
      setTemplateId("")
      return
    }
    if (!templateId || !templatesForYear.some((t) => t.id === templateId)) setTemplateId(templatesForYear[0]!.id)
  }, [templatesForYear, templateId])

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId) ?? null, [templates, templateId])
  const currentKey = `${fiscalYear}::${templateId}::${trackerPeriodType}`
  const trackerState = stateByKey[currentKey] ?? { periodStateByIndex: {}, backlogByCycleKey: {}, history: [] }
  const labels = selectedTemplate ? periodLabels(trackerPeriodType) : []
  const kpiItemById = useMemo(() => Object.fromEntries(kpiItems.map((k) => [k.id, k])), [kpiItems])
  const currentPeriodIndex = useMemo(() => {
    const now = new Date()
    if (trackerPeriodType === "monthly") {
      const m = now.getMonth()
      return m >= 3 ? m - 3 : m + 9
    }
    if (trackerPeriodType === "quarterly") {
      const m = now.getMonth()
      const fiscalMonth = m >= 3 ? m - 3 : m + 9
      return Math.floor(fiscalMonth / 3)
    }
    if (trackerPeriodType === "weekly") return Math.max(0, Math.min(51, Math.floor((dayOfYear(now) - 1) / 7)))
    if (trackerPeriodType === "daily") return Math.max(0, Math.min(364, dayOfYear(now) - 1))
    return 0
  }, [trackerPeriodType])

  useEffect(() => {
    setSelectedPeriodIndex(currentPeriodIndex)
  }, [templateId, fiscalYear, trackerPeriodType, currentPeriodIndex])

  useEffect(() => {
    const strip = periodStripRef.current
    if (!strip) return
    const chip = strip.querySelector<HTMLElement>(`[data-period-chip-index="${selectedPeriodIndex}"]`)
    if (!chip) return
    chip.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [selectedPeriodIndex, labels.length, trackerPeriodType])

  const closePeriod = (periodIndex: number) => {
    if (!selectedTemplate) return
    const rows = allocations.filter((a) => a.fiscalYear === fiscalYear && a.templateId === selectedTemplate.id)

    let totalTarget = 0
    let totalActual = 0
    let totalBacklog = 0
    let fulfilled = 0
    let total = 0

    const details: PeriodCloseResult["details"] = []
    const nextBacklogPatch: Record<string, number> = {}

    for (const alloc of rows) {
      for (const t of alloc.targets) {
        const rawItemPeriodType = kpiItemById[t.kpiItemId]?.periodType ?? selectedTemplate.periodType
        // Annual-configured items should still participate in tracked cadence by split.
        const itemPeriodType = rawItemPeriodType === "annual" ? trackerPeriodType : rawItemPeriodType
        if (itemPeriodType !== trackerPeriodType) continue
        total += 1
        const cycleCount = countForPeriodType(itemPeriodType)
        const cycleIndex = cycleIndexFromMonthIndex(periodIndex, itemPeriodType)
        const nextCycleIndex = Math.min(cycleCount - 1, cycleIndex + 1)
        const key = `${itemPeriodType}:${cycleIndex}:${alloc.id}:${t.kpiItemId}`
        const nextKey = `${itemPeriodType}:${nextCycleIndex}:${alloc.id}:${t.kpiItemId}`
        const targetForPeriod = t.annualTarget / cycleCount
        const actualRow = actuals.find((a) => a.allocationId === alloc.id && a.kpiItemId === t.kpiItemId)
        const actualForPeriod = (actualRow?.actual ?? 0) / cycleCount
        const incomingBacklog = trackerState.backlogByCycleKey[key] ?? 0
        const expected = targetForPeriod + incomingBacklog
        const currentMonthBacklog = Math.max(0, targetForPeriod - actualForPeriod)
        const missing = Math.max(0, expected - actualForPeriod)

        totalTarget += expected
        totalActual += actualForPeriod
        totalBacklog += missing
        if (missing <= 0) fulfilled += 1
        nextBacklogPatch[nextKey] = (trackerState.backlogByCycleKey[nextKey] ?? 0) + missing
        details.push({
          user: alloc.allocatedTo,
          kpi: t.kpiName,
          periodType: itemPeriodType,
          target: targetForPeriod,
          actual: actualForPeriod,
          incomingBacklog,
          currentMonthBacklog,
          carriedBacklog: missing,
          nextAdjustedTarget: targetForPeriod + missing,
          nextCycleLabel: labelForCycle(itemPeriodType, nextCycleIndex),
        })
      }
    }

    const result: PeriodCloseResult = {
      target: totalTarget,
      actual: totalActual,
      backlogCarried: totalBacklog,
      fulfilledCount: fulfilled,
      totalCount: total,
      details,
    }

    setStateByKey((prev) => {
      const current = prev[currentKey] ?? { periodStateByIndex: {}, backlogByCycleKey: {}, history: [] }
      return {
        ...prev,
        [currentKey]: {
          ...current,
          periodStateByIndex: { ...current.periodStateByIndex, [periodIndex]: "closed" },
          backlogByCycleKey: { ...current.backlogByCycleKey, ...nextBacklogPatch },
          history: [
            {
              timestamp: new Date().toISOString(),
              action: "close",
              periodIndex,
              periodLabel: labels[periodIndex] ?? `Period ${periodIndex + 1}`,
              result,
            },
            ...current.history,
          ],
        },
      }
    })

    if (result.fulfilledCount < result.totalCount) {
      toast({
        variant: "destructive",
        title: "Period closed with backlog",
        description: `${result.totalCount - result.fulfilledCount} KPI targets not fulfilled. Backlog moved to next period.`,
      })
      return
    }
    toast({ title: "Period closed", description: "All KPI targets fulfilled for this period." })
  }

  const openPeriod = (periodIndex: number) => {
    setStateByKey((prev) => {
      const current = prev[currentKey] ?? { periodStateByIndex: {}, backlogByCycleKey: {}, history: [] }
      return {
        ...prev,
        [currentKey]: {
          ...current,
          periodStateByIndex: { ...current.periodStateByIndex, [periodIndex]: "open" },
          history: [
            {
              timestamp: new Date().toISOString(),
              action: "open",
              periodIndex,
              periodLabel: labels[periodIndex] ?? `Period ${periodIndex + 1}`,
            },
            ...current.history,
          ],
        },
      }
    })
    toast({ title: "Period reopened", description: "Period is now open for updates." })
  }

  const allHistory = trackerState.history
  const selectedState = trackerState.periodStateByIndex[selectedPeriodIndex] ?? "open"
  const reportRows = useMemo(
    () =>
      trackerState.history
        .filter((h) => h.action === "close" && h.result?.details?.length)
        .flatMap((h) =>
          (h.result?.details ?? []).map((d) => ({
            timestamp: h.timestamp,
            periodLabel: h.periodLabel,
            ...d,
          })),
        ),
    [trackerState.history],
  )
  const selectedReportRows = useMemo(
    () =>
      (reportHistoryEntry?.result?.details ?? []).map((d) => ({
        timestamp: reportHistoryEntry?.timestamp ?? "",
        periodLabel: reportHistoryEntry?.periodLabel ?? "",
        ...d,
      })),
    [reportHistoryEntry],
  )
  const reportSourceRows = reportHistoryEntry ? selectedReportRows : reportRows
  const filteredReportRows = useMemo(() => {
    const q = reportSearch.trim().toLowerCase()
    if (!q) return reportSourceRows
    return reportSourceRows.filter((r) => {
      return (
        r.user.toLowerCase().includes(q) ||
        r.kpi.toLowerCase().includes(q) ||
        r.periodType.toLowerCase().includes(q) ||
        r.periodLabel.toLowerCase().includes(q) ||
        r.nextCycleLabel.toLowerCase().includes(q)
      )
    })
  }, [reportSourceRows, reportSearch])
  const reportTotalPages = Math.max(1, Math.ceil(filteredReportRows.length / reportRowsPerPage))
  const reportStart = (reportPage - 1) * reportRowsPerPage
  const reportPageRows = filteredReportRows.slice(reportStart, reportStart + reportRowsPerPage)

  useEffect(() => {
    setReportPage(1)
  }, [reportSearch, reportRowsPerPage, reportHistoryEntry, reportOpen])

  return (
    <div className="space-y-4 bg-slate-50 min-h-full p-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-brand-blue">Period Tracker</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open/close periods, validate fulfillment, and carry backlog to next period.</p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <div className="w-[180px]">
            <Select value={fiscalYear} onValueChange={setFiscalYear}>
              <SelectTrigger><SelectValue placeholder="Fiscal year" /></SelectTrigger>
              <SelectContent>
                {fiscalYearOptions.map((fy) => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[320px]">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
              <SelectContent>
                {templatesForYear.map((t) => <SelectItem key={t.id} value={t.id}>{t.templateName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
              <div className="w-[180px]">
                <Select value={trackerPeriodType} onValueChange={(v) => setTrackerPeriodType(v as PeriodType)}>
                  <SelectTrigger><SelectValue placeholder="Period Type" /></SelectTrigger>
                  <SelectContent>
                    {TRACKER_PERIOD_TYPES.map((pt) => (
                      <SelectItem key={pt} value={pt}>
                        {pt.charAt(0).toUpperCase() + pt.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
          {selectedTemplate ? (
            <Badge variant="outline" className="capitalize">
              Tracking: {trackerPeriodType}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      {selectedTemplate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div ref={periodStripRef} className="flex gap-2 pb-1">
                {labels.map((label, idx) => {
                  const state = trackerState.periodStateByIndex[idx] ?? "open"
                  const isActive = idx === selectedPeriodIndex
                  return (
                    <button
                      key={`${label}-${idx}`}
                      data-period-chip-index={idx}
                      type="button"
                      onClick={() => setSelectedPeriodIndex(idx)}
                      className={`rounded-md border px-3 py-2 text-xs min-w-max ${isActive ? "border-brand-blue bg-orange-50 text-brand-blue" : "border-slate-200 bg-white"}`}
                    >
                      <div className="font-medium">{label}</div>
                      <div className="mt-1">
                        <Badge variant="outline" className={state === "closed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                          {state}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No template allocations available for selected fiscal year.</CardContent></Card>
      )}

      {selectedTemplate ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Period Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{labels[selectedPeriodIndex]}</div>
                  <div className="text-xs text-muted-foreground">Current state: {selectedState}</div>
                </div>
                {selectedState === "closed" ? (
                  <Button variant="outline" onClick={() => openPeriod(selectedPeriodIndex)}>
                    <Unlock className="h-4 w-4 mr-1" /> Reopen
                  </Button>
                ) : (
                  <Button onClick={() => closePeriod(selectedPeriodIndex)}>
                    <Lock className="h-4 w-4 mr-1" /> Close Period
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                On close, system validates KPI rows configured as <span className="font-medium capitalize">{trackerPeriodType}</span> and carries shortfall to next{" "}
                <span className="font-medium">{trackerPeriodType === "daily" ? "day" : trackerPeriodType === "weekly" ? "week" : trackerPeriodType === "quarterly" ? "quarter" : "month"}</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">History (All Periods)</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {allHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No actions recorded for this period yet.</div>
              ) : (
                allHistory.map((h, idx) => (
                  <div key={`${h.timestamp}-${idx}`} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize flex items-center gap-2">
                        {h.action === "close" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock3 className="h-4 w-4 text-amber-600" />}
                        {h.action} period ({h.periodLabel})
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReportHistoryEntry(h)
                          setReportOpen(true)
                        }}
                        disabled={!h.result?.details?.length}
                      >
                        View Report
                      </Button>
                    </div>
                    {h.result ? (
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>Target: <span className="font-mono">{h.result.target.toFixed(2)}</span></div>
                        <div>Actual: <span className="font-mono">{h.result.actual.toFixed(2)}</span></div>
                        <div>Fulfilled: <span className="font-mono">{h.result.fulfilledCount}/{h.result.totalCount}</span></div>
                        <div>Backlog moved: <span className="font-mono">{h.result.backlogCarried.toFixed(2)}</span></div>
                      </div>
                    ) : null}
                    {/* Detailed rows are shown in dialog only via View Report */}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
      <Dialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open)
          if (!open) {
            setReportHistoryEntry(null)
            setReportSearch("")
            setReportPage(1)
          }
        }}
      >
        <DialogContent className="max-w-6xl bg-white">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DialogTitle>
                {reportHistoryEntry
                  ? `Period Tracking Report - ${reportHistoryEntry.periodLabel} (${reportHistoryEntry.action})`
                  : "Period Tracking Report (All Periods)"}
              </DialogTitle>
              <div className="w-full sm:w-[320px]">
                <Input
                  placeholder="Search user, KPI, period type..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                />
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto rounded border bg-white">
            {filteredReportRows.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No close-period report rows available yet.</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">User</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">KPI</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Type</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Period</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Target</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Actual</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Opening Backlog</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Current Month Backlog</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Carry Forward Backlog</th>
                    <th className="px-2 py-2 text-right font-semibold text-slate-700">Next Target</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Next Period</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-700">Time stamp</th>
                  </tr>
                </thead>
                <tbody>
                  {reportPageRows.map((r, idx) => (
                    <tr key={`${r.timestamp}-${r.user}-${r.kpi}-${idx}`} className="border-t hover:bg-slate-50/70">
                      <td className="px-2 py-1">{r.user}</td>
                      <td className="px-2 py-1">{r.kpi}</td>
                      <td className="px-2 py-1 capitalize">
                        <Badge
                          variant="outline"
                          className={
                            r.periodType === "daily"
                              ? "border-purple-200 bg-purple-50 text-purple-700"
                              : r.periodType === "weekly"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : r.periodType === "quarterly"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }
                        >
                          {r.periodType}
                        </Badge>
                      </td>
                      <td className="px-2 py-1">{r.periodLabel}</td>
                      <td className="px-2 py-1 text-right font-mono">{r.target.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-mono ${r.actual >= r.target ? "text-emerald-700" : "text-red-700"}`}>{r.actual.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-mono ${r.incomingBacklog > 0 ? "text-red-700" : "text-emerald-700"}`}>{r.incomingBacklog.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-mono ${r.currentMonthBacklog > 0 ? "text-amber-700 font-semibold" : "text-emerald-700"}`}>{r.currentMonthBacklog.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-mono ${r.carriedBacklog > 0 ? "text-red-700 font-semibold" : "text-emerald-700"}`}>{r.carriedBacklog.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-right font-mono ${r.carriedBacklog > 0 ? "text-amber-700" : "text-slate-800"}`}>{r.nextAdjustedTarget.toFixed(2)}</td>
                      <td className="px-2 py-1">{r.nextCycleLabel}</td>
                      <td className="px-2 py-1">{new Date(r.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing {filteredReportRows.length === 0 ? 0 : reportStart + 1}-{Math.min(reportStart + reportRowsPerPage, filteredReportRows.length)} of {filteredReportRows.length}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows</span>
              <Select value={String(reportRowsPerPage)} onValueChange={(v) => setReportRowsPerPage(Number(v))}>
                <SelectTrigger className="w-[90px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <Pagination page={reportPage} totalPages={reportTotalPages} onPageChange={setReportPage} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

