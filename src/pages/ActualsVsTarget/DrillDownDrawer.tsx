import { useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ActualEntry } from "@/types/kpi.types"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Props = {
  entry: ActualEntry | null
  open: boolean
  onClose: () => void
  allEntries: ActualEntry[]
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

function roleBadgeClassName(role: ActualEntry["role"]): string {
  if (role === "leadership") return "border-orange-200 bg-orange-50 text-brand-blue"
  if (role === "branch-head") return "border-purple-200 bg-purple-50 text-purple-700"
  if (role === "sales-manager") return "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
  if (role === "sales-lead") return "border-amber-200 bg-amber-50 text-amber-700"
  if (role === "sales-executive") return "border-slate-200 bg-slate-50 text-slate-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

function ragClassName(rag: ActualEntry["ragStatus"]): string {
  if (rag === "green") return "bg-green-100 text-green-800 border-green-200"
  if (rag === "amber") return "bg-amber-100 text-amber-800 border-amber-200"
  return "bg-red-100 text-red-800 border-red-200"
}

function indicatorClassName(rag: ActualEntry["ragStatus"]): string {
  if (rag === "green") return "bg-green-500"
  if (rag === "amber") return "bg-amber-500"
  return "bg-red-500"
}

export default function DrillDownDrawer({ entry, open, onClose, allEntries }: Props) {
  const [note, setNote] = useState("")
  const [tab, setTab] = useState("overview")
  const [showEscalateConfirm, setShowEscalateConfirm] = useState(false)
  const [notes, setNotes] = useState<Array<{ id: string; author: string; timestamp: string; content: string }>>([
    { id: "1", author: "Manager", timestamp: "2026-03-01", content: "**Strong recovery** in conversion.\n- Keep momentum\n- Focus enterprise mix" },
  ])
  const employeeRows = useMemo(
    () => allEntries.filter((item) => item.employeeName === entry?.employeeName),
    [allEntries, entry?.employeeName],
  )

  const initials = (entry?.employeeName ?? "")
    .split(" ")
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto bg-white">
        {entry ? (
          <div className="space-y-4">
            <SheetHeader>
              <div className="flex items-start gap-3 pr-8">
                <div className="h-10 w-10 rounded-full bg-orange-100 text-brand-blue flex items-center justify-center font-semibold text-sm">
                  {initials}
                </div>
                <div>
                  <SheetTitle>{entry.employeeName}</SheetTitle>
                  <SheetDescription className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className={cn("border", roleBadgeClassName(entry.role))}>
                      {entry.role.replace("-", " ")}
                    </Badge>
                    <span>UAE Region</span>
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <Separator />

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
            </Tabs>

            {tab === "overview" && <div>
              <p className="text-sm font-medium mb-3">FY 2025-26 YTD Performance</p>
              <div className="rounded-md border">
                <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_0.8fr] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                  <span>KPI</span>
                  <span>Target</span>
                  <span>Actual</span>
                  <span>Attainment</span>
                  <span>RAG</span>
                </div>
                <div>
                  {employeeRows.map((item) => (
                    <div key={item.id} className="px-3 py-2 border-b last:border-b-0">
                      <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_0.8fr] gap-2 text-xs items-center">
                        <span className="font-medium text-foreground">{item.kpiName}</span>
                        <span className="font-mono">{formatValue(item.target, item.unitType)}</span>
                        <span className="font-mono">{formatValue(item.actual, item.unitType)}</span>
                        <span className="font-mono">{item.attainmentPct.toFixed(1)}%</span>
                        <Badge variant="outline" className={cn("capitalize border w-fit", ragClassName(item.ragStatus))}>
                          {item.ragStatus}
                        </Badge>
                      </div>
                      <Progress
                        value={Math.min(item.attainmentPct, 120)}
                        className="mt-2 h-1.5 bg-muted"
                        indicatorClassName={indicatorClassName(item.ragStatus)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>}

            <Separator />

            {tab === "history" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Last 6 Periods</p>
                <svg width="100%" height="40" viewBox="0 0 320 40">
                  <polyline
                    fill="none"
                    stroke="#1558A8"
                    strokeWidth="2"
                    points={(entry?.trend ?? []).map((v, i) => `${(i / Math.max((entry?.trend.length ?? 1) - 1, 1)) * 320},${40 - (v / 120) * 40}`).join(" ")}
                  />
                </svg>
                <div className="space-y-2">
                  {(entry?.trend ?? []).slice(-6).map((value, index) => {
                    const rag: ActualEntry["ragStatus"] = value >= 100 ? "green" : value >= 85 ? "amber" : "red"
                    return (
                      <div key={`${entry?.id}-${index}`} className="text-xs rounded border p-2 grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center">
                        <span>P{index + 1}</span>
                        <span>Actual: {formatValue((entry?.target ?? 0) * (value / 100), entry?.unitType ?? "number")}</span>
                        <span>Target: {formatValue(entry?.target ?? 0, entry?.unitType ?? "number")}</span>
                        <span>{value.toFixed(1)}%</span>
                        <span className={cn("h-2.5 w-2.5 rounded-full", indicatorClassName(rag))} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <Separator />

            {tab === "notes" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {notes.map((item) => (
                    <div key={item.id} className="rounded border p-2 text-sm">
                      <div className="text-xs text-muted-foreground mb-1">{item.timestamp} by {item.author}</div>
                      <div className="prose prose-sm max-w-none">{renderSimpleMarkdown(item.content)}</div>
                    </div>
                  ))}
                </div>
                <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add note (markdown supported)..." />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!note.trim()) return
                    setNotes((prev) => [
                      { id: crypto.randomUUID(), author: "You", timestamp: new Date().toISOString().slice(0, 10), content: note },
                      ...prev,
                    ])
                    setNote("")
                    toast({ title: "Note added" })
                  }}
                >
                  Submit Note
                </Button>
              </div>
            )}

            {tab === "actions" && (
              <div className="space-y-2">
                <Button className="w-full" variant="outline" onClick={() => toast({ title: "Explanation requested", description: "Notification sent to employee." })}>
                  Request Explanation
                </Button>
                <Button className="w-full" variant="outline" onClick={() => setShowEscalateConfirm(true)}>
                  Escalate to Manager
                </Button>
                <Button className="w-full" variant="outline" onClick={() => toast({ title: "Marked as reviewed" })}>
                  Mark as Reviewed
                </Button>
                <Button className="w-full" variant="outline" onClick={() => window.print()}>
                  Download KPI Report
                </Button>
                <Button variant="ghost" className="w-full justify-between">
                  View Full Profile
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Select a KPI row to view details.</div>
        )}
      </SheetContent>
      <AlertDialog open={showEscalateConfirm} onOpenChange={setShowEscalateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Escalate to manager?</AlertDialogTitle>
            <AlertDialogDescription>This action sends an escalation notification.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className={buttonVariants()} onClick={() => toast({ title: "Escalation sent" })}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

function renderSimpleMarkdown(content: string) {
  const html = content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>")
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
