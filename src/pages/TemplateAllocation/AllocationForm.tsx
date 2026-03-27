import { zodResolver } from "@hookform/resolvers/zod"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Info,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { autoDistribute, cn, formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { useTenantAllocations, useTenantKpiTemplates } from "@/hooks/useTenantScope"
import { useKPIStore } from "@/store/kpiStore"
import type { HierarchyNode, KPITarget, KPITemplate, HierarchyLevel, RAGStatus, TemplateAllocation } from "@/types/kpi.types"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AllocationHistoryEntry } from "./index"
import { getVisionFlowAmounts } from "@/data/visionCentralDubai"

const ALLOCATION_FISCAL_YEAR = "FY 2025-26"
/** Shown for “copy from last year” until API provides archived FY data */
const PREVIOUS_FISCAL_YEAR = "FY 2024-25"

type Props = {
  node: HierarchyNode | null
  allNodes: HierarchyNode[]
  externalTargetsByNodeId: Record<string, KPITarget[]>
  externalLockedByNodeId: Record<string, boolean>
  historyByNodeId: Record<string, AllocationHistoryEntry[]>
  onTargetsChange: (nodeId: string, targets: KPITarget[]) => void
  onLockChange: (nodeId: string, locked: boolean) => void
  onHistoryEvent: (nodeId: string, event: AllocationHistoryEntry) => void
  onCopyTargets: (toNodeId: string, fromNodeId: string, targets: KPITarget[]) => void
}

type TargetFormRow = {
  annualTarget: number
  h1Target: number
  h2Target: number
  q1Target: number
  q2Target: number
  q3Target: number
  q4Target: number
}

type TargetFormData = {
  rows: TargetFormRow[]
}

const targetRowSchema = z.object({
  annualTarget: z.number().min(0),
  h1Target: z.number().min(0),
  h2Target: z.number().min(0),
  q1Target: z.number().min(0),
  q2Target: z.number().min(0),
  q3Target: z.number().min(0),
  q4Target: z.number().min(0),
})

const targetsSchema = z.object({
  rows: z.array(targetRowSchema),
})

function unitLabelForUnitType(unitType: KPITarget["unitType"]): string {
  switch (unitType) {
    case "percentage":
      return "%"
    case "currency":
      return "Amount"
    case "teu":
      return "TEU"
    case "score":
      return "Score"
    case "days":
      return "days"
    case "hours":
      return "hrs"
    case "number":
      return "Number"
    case "cbm":
      return "CBM"
    case "tonnes":
      return "t"
    case "ratio":
      return "ratio"
    default:
      return unitType
  }
}

function unitLabelForTarget(t: KPITarget): string {
  return unitLabelForUnitType(t.unitType)
}

function displayRagForRow(index: number): RAGStatus {
  return index % 3 === 0 ? "green" : index % 3 === 1 ? "amber" : "red"
}

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 4)
    .join("")
}

const NODE_NAME_BY_ID: Record<string, string> = {
  leadership: "Corporate HQ",
  "branch-dubai": "Dubai, UAE",
  "sm-sea": "Sea Freight Dept",
  "sl-import": "Import Team",
  "sl-export": "Export Team",
  "se-ahmed": "Dileep",
  "se-priya": "Krishna",
  "se-ravi": "Guru",
  "se-sara": "Vishnu",
  "se-sajeer": "Sajeer",
  "se-akshai": "Akshai",
  "se-vishnu-muraly": "Vishnu Muraly",
  "se-eric": "Eric",
}

function roleBadgeClasses(role: HierarchyLevel) {
  switch (role) {
    case "leadership":
      return "border-orange-200 bg-orange-50 text-brand-blue"
    case "branch-head":
      return "border-purple-200 bg-purple-50 text-purple-700"
    case "sales-manager":
      return "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
    case "sales-lead":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "sales-executive":
      return "border-slate-200 bg-slate-50 text-slate-700"
  }
}

function roleLabel(role: HierarchyLevel) {
  switch (role) {
    case "leadership":
      return "Leadership"
    case "branch-head":
      return "Branch Head"
    case "sales-manager":
      return "Sales Mgr"
    case "sales-lead":
      return "Lead"
    case "sales-executive":
      return "Sales Exec"
  }
}

function defaultAllocationTypeForNode(node: HierarchyNode): "individual" | "team" {
  return node.role === "sales-executive" ? "individual" : "team"
}

function formatFlowAmount(amount: number): string {
  return formatCurrency(amount)
}

function splitAnnual(annualTarget: number) {
  const split = autoDistribute(annualTarget)
  return {
    h1Target: split.h1,
    h2Target: split.h2,
    q1Target: split.q1,
    q2Target: split.q2,
    q3Target: split.q3,
    q4Target: split.q4,
  }
}

/** Demo snapshot: scales each row’s annual target (~88% of baseline) and re-splits periods. */
function buildLastYearTargetsFromCurrent(targets: KPITarget[]): KPITarget[] {
  return targets.map((t, idx) => {
    const basis = t.annualTarget > 0 ? t.annualTarget : 55_000 + idx * 18_000
    const annualTarget = Math.max(0, Math.round(basis * 0.88))
    const split = splitAnnual(annualTarget)
    return { ...t, annualTarget, ...split }
  })
}

type DistributionMethod = "equal" | "headcount" | "custom"
type DistributionView = "annual-quarterly" | "monthly" | "weekly" | "daily"
type DistributionPeriodView = Exclude<DistributionView, "annual-quarterly">

type FlowSlotDetail = {
  role: HierarchyLevel
  label: string
  unitName: string
  amount: number
  peopleInScope: number
  status: "complete" | "partial" | "pending"
}

function flowSlotStatusBadge(status: FlowSlotDetail["status"]): { label: string; className: string } {
  switch (status) {
    case "complete":
      return { label: "Allocated", className: "border-emerald-200 bg-emerald-50 text-emerald-800" }
    case "partial":
      return { label: "In progress", className: "border-amber-200 bg-amber-50 text-amber-800" }
    case "pending":
      return { label: "Pending", className: "border-slate-200 bg-slate-50 text-slate-700" }
  }
}

function getMismatch(row: KPITarget): { hMismatch: boolean; qMismatch: boolean } {
  const hMismatch = row.h1Target + row.h2Target !== row.annualTarget
  const qMismatch = row.q1Target + row.q2Target + row.q3Target + row.q4Target !== row.annualTarget
  return { hMismatch, qMismatch }
}

function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor(total / parts)
  const remainder = total - base * parts
  return Array.from({ length: parts }, (_, idx) => base + (idx < remainder ? 1 : 0))
}

function getPeriodCount(view: DistributionPeriodView): number {
  if (view === "monthly") return 12
  if (view === "weekly") return 52
  return 365
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

function toRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1 day ago"
  return `${diffDays} days ago`
}

function ragBadgeClasses(rag: RAGStatus) {
  switch (rag) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "red":
      return "border-red-200 bg-red-50 text-red-700"
  }
}

function buildTargetsForNode(_node: HierarchyNode): KPITarget[] {
  return []
}

function buildEmptyTargets(): KPITarget[] {
  return []
}

function buildTargetsFromTemplate(tpl: KPITemplate): KPITarget[] {
  const sorted = [...(tpl.kpiItems ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)
  return sorted.map((line) => {
    const z = splitAnnual(0)
    return {
      kpiItemId: line.kpiItemId,
      kpiCode: line.kpiCode,
      kpiName: line.kpiName,
      unitType: line.unitType,
      weight: line.weight,
      annualTarget: 0,
      h1Target: z.h1Target,
      h2Target: z.h2Target,
      q1Target: z.q1Target,
      q2Target: z.q2Target,
      q3Target: z.q3Target,
      q4Target: z.q4Target,
    }
  })
}

function targetsToFormRows(targets: KPITarget[]): TargetFormRow[] {
  return targets.map((t) => ({
    annualTarget: t.annualTarget,
    h1Target: t.h1Target,
    h2Target: t.h2Target,
    q1Target: t.q1Target,
    q2Target: t.q2Target,
    q3Target: t.q3Target,
    q4Target: t.q4Target,
  }))
}

export default function AllocationForm({
  node,
  allNodes,
  externalTargetsByNodeId,
  externalLockedByNodeId,
  historyByNodeId,
  onTargetsChange,
  onLockChange,
  onHistoryEvent,
  onCopyTargets,
}: Props) {
  const templates = useTenantKpiTemplates()
  const allocations = useTenantAllocations()
  const upsertAllocation = useKPIStore((s) => s.upsertAllocation)
  const selectedTemplateOptions = useMemo(() => {
    if (!node) return []
    return templates.filter((t) => t.statusId === "active" && (t.applicableRoles ?? []).includes(node.role))
  }, [node, templates])

  const allocationForNode = useMemo(() => {
    if (!node) return null
    return (
      allocations.find(
        (a) =>
          a.allocatedTo === node.name &&
          a.hierarchyLevel === node.role &&
          a.fiscalYear === ALLOCATION_FISCAL_YEAR,
      ) ?? null
    )
  }, [allocations, node])

  const initialTargets = useMemo(() => {
    if (!node) return buildEmptyTargets()
    if (externalTargetsByNodeId[node.id]) return externalTargetsByNodeId[node.id]!
    if (allocationForNode) return allocationForNode.targets
    return buildTargetsForNode(node)
  }, [allocationForNode, externalTargetsByNodeId, node])

  const [allocationToType, setAllocationToType] = useState<"individual" | "team">(
    () => allocationForNode?.allocatedToType ?? "team",
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [locked, setLocked] = useState<boolean>(false)
  const [targets, setTargets] = useState<KPITarget[]>(() => initialTargets)
  const [distributionMethod, setDistributionMethod] = useState<DistributionMethod>("equal")
  const [distributionView, setDistributionView] = useState<DistributionView>("annual-quarterly")
  const [periodOverridesByView, setPeriodOverridesByView] = useState<
    Record<DistributionPeriodView, Record<string, number[]>>
  >({
    monthly: {},
    weekly: {},
    daily: {},
  })
  const [customRatios, setCustomRatios] = useState<number[]>([50, 50])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [copySearch, setCopySearch] = useState("")
  const [copyFromNodeId, setCopyFromNodeId] = useState<string>("")
  const [confirmCopyOpen, setConfirmCopyOpen] = useState(false)
  const [copyConfirmKind, setCopyConfirmKind] = useState<"peer" | "lastYear">("peer")
  const [addKpiDialogOpen, setAddKpiDialogOpen] = useState(false)
  const [addKpiSearch, setAddKpiSearch] = useState("")
  const periodScrollContainerRef = useRef<HTMLDivElement | null>(null)

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null
    return (
      templates.find((t) => t.id === selectedTemplateId) ??
      selectedTemplateOptions.find((t) => t.id === selectedTemplateId) ??
      null
    )
  }, [templates, selectedTemplateOptions, selectedTemplateId])

  const addableKpiLines = useMemo(() => {
    if (!selectedTemplate) return []
    const taken = new Set(targets.map((t) => t.kpiItemId))
    return selectedTemplate.kpiItems.filter((k) => !taken.has(k.kpiItemId))
  }, [selectedTemplate, targets])

  const filteredAddableKpis = useMemo(() => {
    const q = addKpiSearch.trim().toLowerCase()
    if (!q) return addableKpiLines
    return addableKpiLines.filter(
      (k) =>
        k.kpiName.toLowerCase().includes(q) ||
        k.kpiCode.toLowerCase().includes(q) ||
        k.unitType.toLowerCase().includes(q),
    )
  }, [addableKpiLines, addKpiSearch])

  const periodHeaders = useMemo(() => {
    if (distributionView === "monthly") {
      return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    }
    if (distributionView === "weekly") {
      const year = new Date().getFullYear()
      const start = new Date(year, 0, 1)
      return Array.from({ length: 52 }, (_, idx) => {
        const d = new Date(start)
        d.setDate(start.getDate() + idx * 7)
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
      })
    }
    if (distributionView === "daily") {
      const year = new Date().getFullYear()
      const start = new Date(year, 0, 1)
      return Array.from({ length: 365 }, (_, idx) => {
        const d = new Date(start)
        d.setDate(start.getDate() + idx)
        return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
      })
    }
    return []
  }, [distributionView])

  const currentPeriodIndex = useMemo(() => {
    if (distributionView === "annual-quarterly") return -1
    if (distributionView === "monthly") return new Date().getMonth()
    const today = new Date()
    const doy = dayOfYear(today)
    if (distributionView === "weekly") return Math.max(0, Math.min(51, Math.floor((doy - 1) / 7)))
    return Math.max(0, Math.min(364, doy - 1))
  }, [distributionView])

  useEffect(() => {
    if (distributionView === "annual-quarterly") return
    if (currentPeriodIndex < 0) return
    const container = periodScrollContainerRef.current
    if (!container) return

    let attempts = 0
    const maxAttempts = 8
    let timer: ReturnType<typeof setTimeout> | null = null

    const scrollToCurrent = () => {
      const currentHeader = container.querySelector<HTMLElement>(`[data-period-index="${currentPeriodIndex}"]`)
      if (!currentHeader) {
        attempts += 1
        if (attempts < maxAttempts) timer = setTimeout(scrollToCurrent, 40)
        return
      }

      currentHeader.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }

    requestAnimationFrame(() => requestAnimationFrame(scrollToCurrent))

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [distributionView, currentPeriodIndex, periodHeaders.length, targets.length])

  const getNonAnnualPeriods = (row: KPITarget, view: DistributionPeriodView): number[] => {
    const overridden = periodOverridesByView[view][row.kpiItemId]
    if (overridden?.length === getPeriodCount(view)) return overridden
    return splitEvenly(row.annualTarget, getPeriodCount(view))
  }

  const form = useForm<TargetFormData>({
    resolver: zodResolver(targetsSchema),
    mode: "onChange",
    defaultValues: {
      rows: targetsToFormRows(initialTargets),
    },
  })

  useEffect(() => {
    if (!node) return
    let nextTargets = externalTargetsByNodeId[node.id] ?? allocationForNode?.targets ?? buildTargetsForNode(node)
    const validIds = new Set(selectedTemplateOptions.map((t) => t.id))
    const fromAlloc = allocationForNode?.templateId
    let resolvedTemplateId = ""
    if (fromAlloc && validIds.has(fromAlloc)) resolvedTemplateId = fromAlloc
    else if (selectedTemplateId && validIds.has(selectedTemplateId)) resolvedTemplateId = selectedTemplateId
    else resolvedTemplateId = selectedTemplateOptions[0]?.id ?? ""

    if (nextTargets.length === 0 && resolvedTemplateId) {
      const tpl =
        templates.find((t) => t.id === resolvedTemplateId) ??
        selectedTemplateOptions.find((t) => t.id === resolvedTemplateId) ??
        null
      if (tpl?.kpiItems?.length) nextTargets = buildTargetsFromTemplate(tpl)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargets(nextTargets)
    form.reset({ rows: targetsToFormRows(nextTargets) })
    setAllocationToType(allocationForNode?.allocatedToType ?? defaultAllocationTypeForNode(node))
    setLocked(externalLockedByNodeId[node.id] ?? false)
    // Prefer saved allocation template; otherwise keep a valid manual dropdown choice; else first option.
    // (Do not reset to [0] on every render — that broke template changes when no allocation exists.)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTemplateId((prev) => {
      const fromAllocId = allocationForNode?.templateId
      if (fromAllocId && validIds.has(fromAllocId)) return fromAllocId
      if (prev && validIds.has(prev)) return prev
      return selectedTemplateOptions[0]?.id ?? ""
    })
    setPeriodOverridesByView({ monthly: {}, weekly: {}, daily: {} })
    setAddKpiDialogOpen(false)
    setAddKpiSearch("")
  }, [node?.id, allocationForNode, selectedTemplateOptions, templates, form, externalTargetsByNodeId, externalLockedByNodeId])

  const lockInputs = locked
  const historyEntries = node ? historyByNodeId[node.id] ?? [] : []
  const peerNodes = useMemo(() => {
    if (!node) return []
    return allNodes.filter((n) => n.role === node.role && n.id !== node.id)
  }, [allNodes, node])
  const filteredPeers = useMemo(() => {
    const q = copySearch.trim().toLowerCase()
    if (!q) return peerNodes
    return peerNodes.filter((p) => p.name.toLowerCase().includes(q))
  }, [copySearch, peerNodes])

  const setRowField = (rowIndex: number, field: keyof TargetFormRow, value: number) => {
    if (!node) return
    setTargets((prev) => {
      const next = prev.map((t, idx) => {
        if (idx !== rowIndex) return t
        if (field === "annualTarget") return { ...t, annualTarget: value }
        if (field === "h1Target") return { ...t, h1Target: value }
        if (field === "h2Target") return { ...t, h2Target: value }
        if (field === "q1Target") return { ...t, q1Target: value }
        if (field === "q2Target") return { ...t, q2Target: value }
        if (field === "q3Target") return { ...t, q3Target: value }
        return { ...t, q4Target: value }
      })
      form.setValue("rows", targetsToFormRows(next), { shouldValidate: true })
      onTargetsChange(node.id, next)
      return next
    })
  }

  const autoDistributeRow = (rowIndex: number) => {
    if (!node) return
    setTargets((prev) => {
      const next = prev.map((t, idx) => {
        if (idx !== rowIndex) return t
        const split = splitAnnual(t.annualTarget)
        return { ...t, ...split }
      })
      form.setValue("rows", targetsToFormRows(next), { shouldValidate: true })
      onTargetsChange(node.id, next)
      return next
    })
    toast({ title: "Row targets distributed", description: "Annual target split into H1/H2 and quarters." })
  }

  const autoDistributeAll = () => {
    if (!node) return
    setTargets((prev) => {
      const next = prev.map((t) => {
        const split = splitAnnual(t.annualTarget)
        return { ...t, ...split }
      })
      form.setValue("rows", targetsToFormRows(next), { shouldValidate: true })
      onTargetsChange(node.id, next)
      return next
    })
    toast({ title: "Targets distributed", description: "All annual targets were distributed across periods." })
  }

  const addKpiFromTemplate = (kpiItemId: string) => {
    if (!node || !selectedTemplateId || lockInputs) return
    const tpl =
      templates.find((t) => t.id === selectedTemplateId) ??
      selectedTemplateOptions.find((t) => t.id === selectedTemplateId) ??
      null
    const line = tpl?.kpiItems.find((k) => k.kpiItemId === kpiItemId)
    if (!line) return
    const z = splitAnnual(0)
    const newRow: KPITarget = {
      kpiItemId: line.kpiItemId,
      kpiCode: line.kpiCode,
      kpiName: line.kpiName,
      unitType: line.unitType,
      weight: line.weight,
      annualTarget: 0,
      h1Target: z.h1Target,
      h2Target: z.h2Target,
      q1Target: z.q1Target,
      q2Target: z.q2Target,
      q3Target: z.q3Target,
      q4Target: z.q4Target,
    }
    setTargets((prev) => {
      const next = [...prev, newRow]
      form.reset({ rows: targetsToFormRows(next) })
      onTargetsChange(node.id, next)
      return next
    })
    onHistoryEvent(node.id, {
      date: new Date().toISOString(),
      changedBy: "Current User",
      action: "target-set",
      detail: `Added KPI ${line.kpiName}`,
    })
    toast({ title: "KPI added", description: line.kpiName })
  }

  const handleAddKpiButtonClick = () => {
    if (!selectedTemplateId) {
      toast({
        title: "Select a template",
        description: "Choose a KPI template above before adding KPIs to this allocation.",
      })
      return
    }
    if (!selectedTemplate?.kpiItems?.length) {
      toast({
        title: "No KPIs on template",
        description: "This template has no KPI items. Edit the template or pick another one.",
      })
      return
    }
    if (addableKpiLines.length === 0) {
      toast({
        title: "All template KPIs are in the table",
        description: "Remove a row below if you want to swap in a different KPI from this template.",
      })
      return
    }
    setAddKpiSearch("")
    setAddKpiDialogOpen(true)
  }

  const removeKpiRow = (rowIndex: number) => {
    if (!node || lockInputs) return
    setTargets((prev) => {
      const next = prev.filter((_, i) => i !== rowIndex)
      form.reset({ rows: targetsToFormRows(next) })
      onTargetsChange(node.id, next)
      return next
    })
    onHistoryEvent(node.id, {
      date: new Date().toISOString(),
      changedBy: "Current User",
      action: "target-set",
      detail: "Removed a KPI row",
    })
    toast({ title: "KPI removed", description: "The KPI row was removed from this allocation." })
  }

  const distributeTargetsDown = () => {
    if (!node) return
    const children = allNodes.filter((n) => n.parentId === node.id)
    if (children.length === 0) {
      toast({ title: "No direct reports", description: "This node has no children to distribute to." })
      return
    }
    if (distributionMethod === "custom") {
      const ratioTotal = customRatios.reduce((sum, value) => sum + value, 0)
      if (ratioTotal !== 100) {
        toast({ title: "Invalid ratio", description: "Custom ratio must add up to 100%." })
        return
      }
    }
    const weightByChild = children.map((child, idx) => {
      if (distributionMethod === "equal") return 1
      if (distributionMethod === "headcount") {
        const leafCount = allNodes.filter((n) => n.parentId === child.id).length || 1
        return leafCount
      }
      return customRatios[idx] ?? 0
    })
    const totalWeight = weightByChild.reduce((sum, w) => sum + w, 0) || 1
    const nextByChild: Record<string, KPITarget[]> = {}
    children.forEach((child, idx) => {
      const ratio = weightByChild[idx]! / totalWeight
      nextByChild[child.id] = targets.map((row) => {
        const annualTarget = Math.round(row.annualTarget * ratio)
        const split = splitAnnual(annualTarget)
        return { ...row, annualTarget, ...split }
      })
      onTargetsChange(child.id, nextByChild[child.id]!)
      onHistoryEvent(child.id, {
        date: new Date().toISOString(),
        changedBy: "Current User",
        action: "distributed",
        detail: `Distributed from ${node.name} (${distributionMethod})`,
      })
    })
    toast({ title: "Targets cascaded", description: `Targets cascaded to ${children.length} direct reports` })
  }

  const parentName = node?.parentId ? NODE_NAME_BY_ID[node.parentId] ?? null : null

  const flowSlots = useMemo((): FlowSlotDetail[] => {
    if (!node) return []
    const { slots } = getVisionFlowAmounts(node)
    const scopeByRole: Record<HierarchyLevel, number> = {
      leadership: 1,
      "branch-head": 4,
      "sales-manager": 8,
      "sales-lead": 6,
      "sales-executive": 5,
    }
    const statusByRole: Record<HierarchyLevel, FlowSlotDetail["status"]> = {
      leadership: "complete",
      "branch-head": "complete",
      "sales-manager": "partial",
      "sales-lead": "partial",
      "sales-executive": "pending",
    }
    return slots.map((s) => ({
      role: s.role,
      label: s.label,
      unitName: s.unitName,
      amount: s.amount,
      peopleInScope: scopeByRole[s.role] ?? 4,
      status: statusByRole[s.role] ?? "partial",
    }))
  }, [node])

  const selectedFlowSlotIdx = useMemo(() => {
    if (!node) return -1
    return flowSlots.findIndex((s) => s.role === node.role)
  }, [flowSlots, node?.role])

  const currentFlowSlot = selectedFlowSlotIdx >= 0 ? flowSlots[selectedFlowSlotIdx] : undefined

  /** Flow envelope is TOTAL SALES (currency); compare to that row, not the sum of mixed units. */
  const enteredAnnualTotal = useMemo(() => {
    const ts = targets.find((t) => t.kpiName === "TOTAL SALES")
    if (ts) return ts.annualTarget
    return targets.filter((t) => t.unitType === "currency").reduce((sum, row) => sum + row.annualTarget, 0)
  }, [targets])

  const budgetUtilizationPct = useMemo(() => {
    if (!currentFlowSlot || currentFlowSlot.amount <= 0) return 0
    return Math.min(100, Math.round((enteredAnnualTotal / currentFlowSlot.amount) * 100))
  }, [currentFlowSlot, enteredAnnualTotal])

  const varianceVsBudget = useMemo(() => {
    if (!currentFlowSlot) return 0
    return enteredAnnualTotal - currentFlowSlot.amount
  }, [currentFlowSlot, enteredAnnualTotal])

  const directReportNodes = useMemo(() => {
    if (!node) return []
    return allNodes.filter((n) => n.parentId === node.id)
  }, [allNodes, node])

  const distributionMethodHelp = useMemo(() => {
    switch (distributionMethod) {
      case "equal":
        return "Splits your current table totals evenly across each direct report. Best when teams are similar in size and scope."
      case "headcount":
        return "Weights each child by its downstream headcount (leaf nodes under that branch). Use when larger sub-teams should carry more of the total."
      case "custom":
        return "You set explicit percentage shares per direct report. Shares must total 100% before you can cascade."
      default:
        return ""
    }
  }, [distributionMethod])

  const layerPeopleSummary = useMemo(() => {
    if (!currentFlowSlot) return { allocated: 0, total: 0, pending: 0 }
    const total = currentFlowSlot.peopleInScope
    const allocated =
      currentFlowSlot.status === "complete"
        ? total
        : currentFlowSlot.status === "partial"
          ? Math.max(1, Math.floor(total * 0.78))
          : Math.max(0, Math.floor(total * 0.44))
    const pending = Math.max(0, total - allocated)
    return { allocated, total, pending }
  }, [currentFlowSlot])

  /** Fill annual targets from this level's flow budget (demo amounts), split by KPI weight, then sync periods. */
  const fullFillFromFlow = () => {
    if (!node || lockInputs) return
    if (targets.length === 0) {
      toast({ title: "No KPI rows", description: "Add KPIs from your template before using Full fill." })
      return
    }
    const slot = flowSlots.find((s) => s.role === node.role)
    const budget = slot?.amount ?? 0
    if (budget <= 0) {
      toast({ title: "No flow budget", description: "There is no budget amount for this level in the distribution flow." })
      return
    }
    const totalSalesIdx = targets.findIndex((t) => t.kpiName === "TOTAL SALES")
    if (totalSalesIdx >= 0) {
      setTargets((prev) => {
        const next = prev.map((t, idx) => {
          if (idx !== totalSalesIdx) return t
          const annualTarget = budget
          const split = splitAnnual(annualTarget)
          return { ...t, annualTarget, ...split }
        })
        form.setValue("rows", targetsToFormRows(next), { shouldValidate: true })
        onTargetsChange(node.id, next)
        return next
      })
      onHistoryEvent(node.id, {
        date: new Date().toISOString(),
        changedBy: "Current User",
        action: "target-set",
        detail: `Full fill: TOTAL SALES set to ${formatFlowAmount(budget)} from flow`,
      })
      toast({
        title: "Full fill applied",
        description: `TOTAL SALES set to ${formatFlowAmount(budget)} (flow envelope); other KPIs unchanged.`,
      })
      return
    }

    const weights = targets.map((t) => Math.max(t.weight, 0))
    const sumW = weights.reduce((a, b) => a + b, 0)
    const useWeights = sumW > 0
    const n = targets.length
    const portions: number[] = []
    let allocated = 0
    for (let i = 0; i < n; i++) {
      if (i === n - 1) {
        portions.push(Math.max(0, budget - allocated))
      } else {
        const w = useWeights ? weights[i]! / sumW : 1 / n
        const p = Math.round(budget * w)
        portions.push(p)
        allocated += p
      }
    }
    setTargets((prev) => {
      const next = prev.map((t, idx) => {
        const annualTarget = portions[idx] ?? 0
        const split = splitAnnual(annualTarget)
        return { ...t, annualTarget, ...split }
      })
      form.setValue("rows", targetsToFormRows(next), { shouldValidate: true })
      onTargetsChange(node.id, next)
      return next
    })
    onHistoryEvent(node.id, {
      date: new Date().toISOString(),
      changedBy: "Current User",
      action: "target-set",
      detail: `Full fill from flow (${formatFlowAmount(budget)} by KPI weight)`,
    })
    toast({
      title: "Full fill applied",
      description: `Annual targets set from flow budget (${formatFlowAmount(budget)}); periods synced.`,
    })
  }

  const handleSaveAllocation = async () => {
    if (!node) return
    if (!selectedTemplateId) {
      toast({
        title: "Select a template",
        description: "Choose a KPI template before saving this allocation.",
      })
      return
    }
    if (targets.length === 0) {
      toast({
        title: "Add at least one KPI",
        description: "Use Add KPI item to add KPIs from the selected template.",
      })
      return
    }
    const valid = await form.trigger()
    if (!valid) {
      toast({
        title: "Fix target values",
        description: "Correct invalid period fields before saving.",
      })
      return
    }
    const template = templates.find((t) => t.id === selectedTemplateId)
    const statusId: TemplateAllocation["statusId"] = locked ? "locked" : "confirmed"
    upsertAllocation({
      id: allocationForNode?.id ?? crypto.randomUUID(),
      templateId: selectedTemplateId,
      allocatedTo: node.name,
      allocatedToType: allocationToType,
      hierarchyLevel: node.role,
      fiscalYear: ALLOCATION_FISCAL_YEAR,
      periodType: template?.periodType ?? "annual",
      targets: targets.map((t) => ({ ...t })),
      statusId,
      createdAt: allocationForNode?.createdAt ?? new Date().toISOString(),
    })
    onHistoryEvent(node.id, {
      date: new Date().toISOString(),
      changedBy: "Current User",
      action: "target-set",
      detail: `Saved allocation — ${template?.templateName ?? selectedTemplateId}`,
    })
    toast({
      title: "Allocation saved",
      description: `${node.name}: ${template?.templateName ?? "Template"} for ${ALLOCATION_FISCAL_YEAR}.`,
    })
  }

  if (!node) {
    return <EmptyState icon={Users} title="No selection yet" description="Select a person or team from the hierarchy." />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-brand-blue text-sm font-semibold">
              {initialsFromName(node.name)}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-semibold truncate">{node.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className={cn("border-0", roleBadgeClasses(node.role))}>
                  {roleLabel(node.role)}
                </Badge>
                <span className="text-muted-foreground">{node.region}</span>
                <span className="text-muted-foreground">
                  Reports to: {parentName ?? "—"}
                </span>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => setCopyDialogOpen(true)}>
                Copy from...
              </Button>
              <div className="min-w-[220px]">
                <div className="text-xs font-medium text-muted-foreground mb-1">Template:</div>
                <Select
                  value={selectedTemplateId}
                  onValueChange={(val) => {
                    setSelectedTemplateId(val)
                    const tpl =
                      templates.find((t) => t.id === val) ?? selectedTemplateOptions.find((t) => t.id === val) ?? null
                    if (tpl?.kpiItems?.length) {
                      const next = buildTargetsFromTemplate(tpl)
                      setTargets(next)
                      form.reset({ rows: targetsToFormRows(next) })
                      onTargetsChange(node.id, next)
                    } else {
                      setTargets([])
                      form.reset({ rows: [] })
                      onTargetsChange(node.id, [])
                    }
                    onHistoryEvent(node.id, {
                      date: new Date().toISOString(),
                      changedBy: "Current User",
                      action: "template-changed",
                      detail: tpl ? `Template: ${tpl.templateName}` : "Template changed",
                    })
                    if (tpl) {
                      toast({
                        title: "Template applied",
                        description: `${tpl.kpiItems.length} KPI row${tpl.kpiItems.length === 1 ? "" : "s"} loaded — adjust targets or use Add KPI for more.`,
                      })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedTemplateOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[160px]">
                <div className="text-xs font-medium text-muted-foreground mb-1">Mode:</div>
                <div className="flex overflow-hidden rounded-md border bg-white">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "flex-1 rounded-none border-r border-slate-200",
                      allocationToType === "individual" ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "text-slate-700",
                    )}
                    onClick={() => setAllocationToType("individual")}
                    disabled={node.role !== "sales-executive"}
                  >
                    Individual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "flex-1 rounded-none",
                      allocationToType === "team" ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "text-slate-700",
                    )}
                    onClick={() => setAllocationToType("team")}
                    disabled={node.role === "sales-executive"}
                  >
                    Team
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                className="shrink-0 gap-1.5 !bg-orange-500 !text-white hover:!bg-orange-600"
                disabled={!selectedTemplateId || targets.length === 0}
                onClick={() => void handleSaveAllocation()}
              >
                <Save className="h-4 w-4 text-orange-500" aria-hidden="true" />
                Save allocation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base font-semibold">FY 2025-26 Target Distribution</CardTitle>
              <div className="inline-flex items-center rounded-md border bg-white p-0.5">
                {([
                  { id: "annual-quarterly", label: "Annual & Quarterly" },
                  { id: "monthly", label: "Monthly" },
                  { id: "weekly", label: "Weekly" },
                  { id: "daily", label: "Daily" },
                ] as Array<{ id: DistributionView; label: string }>).map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    className={cn(
                      "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                      distributionView === view.id ? "bg-orange-500 text-white hover:bg-orange-600" : "text-slate-700 hover:bg-slate-100",
                    )}
                    onClick={() => setDistributionView(view.id)}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={lockInputs || !selectedTemplateId}
                title={
                  !selectedTemplateId
                    ? "Choose a template first"
                    : lockInputs
                      ? "Unlock targets to add or remove KPIs"
                      : undefined
                }
                onClick={handleAddKpiButtonClick}
              >
                <Plus className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                Add KPI
              </Button>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" size="sm" onClick={autoDistributeAll} disabled={lockInputs || targets.length === 0}>
                  Auto-distribute all
                </Button>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={locked}
                    onCheckedChange={(checked) => {
                      setLocked(checked)
                      onLockChange(node.id, checked)
                    }}
                  />
                  <span className="text-sm text-muted-foreground">Lock Targets</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div ref={periodScrollContainerRef} className="overflow-x-auto relative">
            {lockInputs ? (
              <div className="absolute inset-0 z-10 grid place-content-center bg-white/45">
                <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-1 text-sm text-muted-foreground shadow-sm">
                  <Lock className="h-4 w-4" />
                  Locked
                </div>
              </div>
            ) : null}
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-30 min-w-[170px] bg-white">KPI Item</TableHead>
                <TableHead className="sticky z-30 min-w-[64px] bg-white text-center" style={{ left: "170px" }}>Unit</TableHead>
                <TableHead className="sticky z-30 min-w-[70px] bg-white text-right" style={{ left: "234px" }}>Weight</TableHead>
                {distributionView === "annual-quarterly" ? (
                  <>
                    <TableHead className="sticky z-30 min-w-[120px] bg-white text-center" style={{ left: "304px" }}>Annual Target</TableHead>
                    <TableHead className="text-center">H1</TableHead>
                    <TableHead className="text-center">H2</TableHead>
                    <TableHead className="text-center">Q1</TableHead>
                    <TableHead className="text-center">Q2</TableHead>
                    <TableHead className="text-center">Q3</TableHead>
                    <TableHead className="text-center">Q4</TableHead>
                    <TableHead className="text-center">↕</TableHead>
                  </>
                ) : (
                  <>
<TableHead
  className="sticky z-30 min-w-[120px] bg-white text-center whitespace-nowrap overflow-hidden text-ellipsis"
  style={{ left: "304px" }}
>
  Annual Target
</TableHead>                    
{periodHeaders.map((header, idx) => (
                      <TableHead
                        key={`${header}-${idx}`}
                        data-period-index={idx}
                        className={cn(
                          "text-center font-mono text-[11px]",
                          idx === currentPeriodIndex ? "bg-orange-50 text-orange-700" : "",
                        )}
                      >
                        {header}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">↕</TableHead>
                  </>
                )}
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center w-[52px]"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {targets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={distributionView === "annual-quarterly" ? 13 : 6 + periodHeaders.length}
                    className="py-12 text-center text-muted-foreground text-sm"
                  >
                    No KPI rows yet. Pick a template above to load its KPIs automatically, or use{" "}
                    <span className="font-medium text-foreground">Add KPI</span> after choosing a template. Remove rows with the trash icon if needed.
                  </TableCell>
                </TableRow>
              ) : null}
              {targets.map((row, idx) => {
                const rag = displayRagForRow(idx)
                const mismatch = getMismatch(row)
                const nonAnnualView = distributionView === "annual-quarterly" ? null : distributionView
                const nonAnnualPeriods = nonAnnualView ? getNonAnnualPeriods(row, nonAnnualView) : []
                const nonAnnualMismatch = nonAnnualView ? nonAnnualPeriods.reduce((sum, n) => sum + n, 0) !== row.annualTarget : false
                const fields: Array<{ key: keyof TargetFormRow; value: number }> = [
                  { key: "annualTarget", value: row.annualTarget },
                  { key: "h1Target", value: row.h1Target },
                  { key: "h2Target", value: row.h2Target },
                  { key: "q1Target", value: row.q1Target },
                  { key: "q2Target", value: row.q2Target },
                  { key: "q3Target", value: row.q3Target },
                  { key: "q4Target", value: row.q4Target },
                ]
                return (
                  <TableRow key={`${row.kpiItemId}-${idx}`}>
                    <TableCell className="sticky left-0 z-20 min-w-[170px] bg-white font-medium">
                      <div className="flex items-center gap-1">
                        <span>{row.kpiName}</span>
                        {(mismatch.hMismatch || mismatch.qMismatch || nonAnnualMismatch) ? (
                          <TriangleAlert className="h-4 w-4 text-amber-500" aria-label="Period mismatch warning" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="sticky z-20 min-w-[64px] bg-white text-center" style={{ left: "170px" }}>{unitLabelForTarget(row)}</TableCell>
                    <TableCell className="sticky z-20 min-w-[70px] bg-white text-xs font-mono text-muted-foreground text-right" style={{ left: "234px" }}>{row.weight}%</TableCell>

                    {distributionView === "annual-quarterly"
                      ? fields.map((f) => {
                      const mismatchedCell =
                        (f.key === "h1Target" || f.key === "h2Target") && mismatch.hMismatch
                          ? true
                          : (f.key === "q1Target" || f.key === "q2Target" || f.key === "q3Target" || f.key === "q4Target") && mismatch.qMismatch
                            ? true
                            : false
                      return (
                      <TableCell key={f.key} className={cn("text-center", f.key === "annualTarget" ? "sticky z-20 min-w-[120px] bg-white" : "")} style={f.key === "annualTarget" ? { left: "304px" } : undefined}>
                        <Input
                          type="number"
                          className={cn(
                            "w-20 text-center font-mono text-sm",
                            mismatchedCell ? "border-amber-400 bg-amber-50" : "",
                          )}
                          value={Number.isFinite(f.value) ? f.value : 0}
                          disabled={lockInputs}
                          onChange={(e) => {
                            const raw = e.target.value
                            const num = raw === "" ? 0 : Number(raw)
                            const safe = Number.isFinite(num) ? num : 0
                            setRowField(idx, f.key, safe)
                          }}
                        />
                      </TableCell>
                    )})
                      : (
                        <>
                          <TableCell className="sticky z-20 min-w-[120px] bg-white text-center" style={{ left: "304px" }}>
                            <Input
                              type="number"
                              className="w-20 text-center font-mono text-sm"
                              value={Number.isFinite(row.annualTarget) ? row.annualTarget : 0}
                              disabled={lockInputs}
                              onChange={(e) => {
                                const raw = e.target.value
                                const num = raw === "" ? 0 : Number(raw)
                                const safe = Number.isFinite(num) ? num : 0
                                setRowField(idx, "annualTarget", safe)
                              }}
                            />
                          </TableCell>
                          {nonAnnualPeriods.map((value, pIdx) => (
                            <TableCell key={`${row.kpiItemId}-${pIdx}`} className={cn("text-center", pIdx === currentPeriodIndex ? "bg-orange-50/60" : "")}>
                              <Input
                                type="number"
                                className={cn(
                                  "w-20 text-center font-mono text-xs",
                                  nonAnnualMismatch ? "border-amber-400 bg-amber-50" : "",
                                )}
                                value={Number.isFinite(value) ? value : 0}
                                disabled={lockInputs}
                                onChange={(e) => {
                                  if (!nonAnnualView) return
                                  const raw = e.target.value
                                  const num = raw === "" ? 0 : Number(raw)
                                  const safe = Number.isFinite(num) ? num : 0
                                  setPeriodOverridesByView((prev) => {
                                    const base = prev[nonAnnualView][row.kpiItemId] ?? splitEvenly(row.annualTarget, getPeriodCount(nonAnnualView))
                                    const nextRow = [...base]
                                    nextRow[pIdx] = safe
                                    return {
                                      ...prev,
                                      [nonAnnualView]: {
                                        ...prev[nonAnnualView],
                                        [row.kpiItemId]: nextRow,
                                      },
                                    }
                                  })
                                }}
                              />
                            </TableCell>
                          ))}
                        </>
                      )}

                    {distributionView === "annual-quarterly" ? (
                      <TableCell className="text-center">
                        <Button type="button" size="sm" variant="ghost" onClick={() => autoDistributeRow(idx)} disabled={lockInputs}>
                          Sync
                        </Button>
                      </TableCell>
                    ) : (
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={lockInputs || !nonAnnualView}
                          onClick={() => {
                            if (!nonAnnualView) return
                            setPeriodOverridesByView((prev) => ({
                              ...prev,
                              [nonAnnualView]: {
                                ...prev[nonAnnualView],
                                [row.kpiItemId]: splitEvenly(row.annualTarget, getPeriodCount(nonAnnualView)),
                              },
                            }))
                          }}
                        >
                          Sync
                        </Button>
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("border-0", ragBadgeClasses(rag))}>
                        {rag === "green" ? "Green" : rag === "amber" ? "Amber" : "Red"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${row.kpiName}`}
                        disabled={lockInputs}
                        onClick={() => removeKpiRow(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {targets.length > 0 ? (
              <TableRow className="bg-slate-50/80">
                <TableCell className="sticky left-0 z-20 min-w-[170px] bg-slate-50 font-semibold">Total</TableCell>
                <TableCell className="sticky z-20 min-w-[64px] bg-slate-50 text-center" style={{ left: "170px" }}>-</TableCell>
                <TableCell className="sticky z-20 min-w-[70px] bg-slate-50 text-right font-mono text-xs" style={{ left: "234px" }}>
                  {targets.reduce((sum, row) => sum + row.weight, 0)}%
                </TableCell>
                {distributionView === "annual-quarterly" ? (
                  <>
                    <TableCell className="sticky z-20 min-w-[120px] bg-slate-50 text-center font-mono" style={{ left: "304px" }}>{targets.reduce((sum, row) => sum + row.annualTarget, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.h1Target, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.h2Target, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.q1Target, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.q2Target, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.q3Target, 0)}</TableCell>
                    <TableCell className="text-center font-mono">{targets.reduce((sum, row) => sum + row.q4Target, 0)}</TableCell>
                    <TableCell className="text-center">-</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="sticky z-20 min-w-[120px] bg-slate-50 text-center font-mono" style={{ left: "304px" }}>
                      {targets.reduce((sum, row) => sum + row.annualTarget, 0)}
                    </TableCell>
                    {Array.from({ length: periodHeaders.length }, (_, pIdx) =>
                      targets.reduce((sum, row) => {
                        const periods = getNonAnnualPeriods(row, distributionView)
                        return sum + (periods[pIdx] ?? 0)
                      }, 0),
                    ).map((value, idx) => (
                      <TableCell key={`total-${idx}`} className={cn("text-center font-mono text-xs", idx === currentPeriodIndex ? "bg-orange-50/60 text-orange-700" : "")}>
                        {value}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">-</TableCell>
                  </>
                )}
                <TableCell className="text-center">-</TableCell>
                <TableCell className="text-center">-</TableCell>
              </TableRow>
              ) : null}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-base">Target Distribution Flow</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-relaxed">
                Shows how the <span className="font-medium text-foreground">{ALLOCATION_FISCAL_YEAR}</span> envelope moves from the corporate pool
                to your team. <span className="font-medium text-foreground">Distribute down</span> pushes your current KPI table to direct reports
                using the cascade method. <span className="font-medium text-foreground">Full fill</span> loads this layer’s flow budget into the
                table by KPI weight, then syncs halves and quarters.
              </CardDescription>
            </div>
            <div
              className="shrink-0 rounded-md border border-slate-200 bg-slate-50/90 p-2"
              title="Illustrative cascade; connect to finance master data when integrating."
            >
              <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 via-white to-orange-50/35 p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide text-slate-600">Cascade path</span>
              <span>Left to right — arrows show what share of the layer above reaches the next level</span>
            </div>
            <div className="flex min-w-0 items-stretch gap-0 overflow-x-auto pb-1 pt-1">
              {flowSlots.map((slot, idx) => {
                const isSelected = idx === selectedFlowSlotIdx
                const badge = flowSlotStatusBadge(slot.status)
                const passToNext =
                  idx < flowSlots.length - 1 ? (flowSlots[idx + 1]!.amount / Math.max(slot.amount, 1)) * 100 : null
                return (
                  <Fragment key={`${slot.role}-${idx}`}>
                    <div
                      className={cn(
                        "flex min-w-[148px] max-w-[190px] flex-col rounded-lg border bg-white p-3 shadow-sm transition-shadow",
                        isSelected
                          ? "border-brand-blue ring-2 ring-brand-blue/25 shadow-md"
                          : "border-slate-200/90 hover:border-slate-300",
                      )}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{slot.label}</div>
                      <div className="mt-1 truncate text-sm font-semibold leading-tight text-slate-900" title={slot.unitName}>
                        {slot.unitName}
                      </div>
                      <div className="mt-2 font-mono text-lg font-bold tracking-tight text-slate-900">{formatFlowAmount(slot.amount)}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
                        <Badge variant="outline" className={cn("border-0 text-[10px] font-normal", badge.className)}>
                          {badge.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{slot.peopleInScope} in scope</span>
                      </div>
                    </div>
                    {idx < flowSlots.length - 1 ? (
                      <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 px-0.5">
                        <ArrowRight className="h-4 w-4 text-brand-blue/85" aria-hidden="true" />
                        <span className="text-center text-[10px] font-semibold tabular-nums text-brand-blue">
                          {passToNext != null ? `${passToNext.toFixed(1)}%` : ""}
                        </span>
                        <span className="text-center text-[9px] leading-tight text-muted-foreground">of above</span>
                      </div>
                    ) : null}
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
                This level vs flow budget
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sum of <span className="font-medium text-foreground">Annual Target</span> in the table above, compared to the illustrative flow
                budget for your role. Use variance before you cascade to reports.
              </p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Flow budget</dt>
                <dd className="text-right font-mono font-semibold">{currentFlowSlot ? formatFlowAmount(currentFlowSlot.amount) : "—"}</dd>
                <dt className="text-muted-foreground">Entered (table)</dt>
                <dd className="text-right font-mono font-semibold">{formatCurrency(enteredAnnualTotal)}</dd>
                <dt className="text-muted-foreground">Variance</dt>
                <dd
                  className={cn(
                    "text-right font-mono font-semibold",
                    varianceVsBudget > 0 ? "text-amber-700" : varianceVsBudget < 0 ? "text-slate-600" : "text-emerald-700",
                  )}
                >
                  {varianceVsBudget === 0 ? "—" : `${varianceVsBudget > 0 ? "+" : ""}${formatCurrency(varianceVsBudget)}`}
                </dd>
              </dl>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Table vs budget</span>
                  <span className="font-mono tabular-nums text-foreground">{budgetUtilizationPct}%</span>
                </div>
                <Progress value={budgetUtilizationPct} className="h-2" />
              </div>
              <div className="border-t border-slate-100 pt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Direct reports: </span>
                {directReportNodes.length === 0 ? (
                  <span>None (leaf node — nothing to cascade to)</span>
                ) : (
                  <span>
                    {directReportNodes.length} — {directReportNodes.map((n) => n.name).join(", ")}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Layers className="h-4 w-4 shrink-0 text-slate-600" aria-hidden="true" />
                Cascade method
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{distributionMethodHelp}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Method:</span>
                <Select value={distributionMethod} onValueChange={(value) => setDistributionMethod(value as DistributionMethod)}>
                  <SelectTrigger className="w-[260px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equal split</SelectItem>
                    <SelectItem value="headcount">Proportional by headcount</SelectItem>
                    <SelectItem value="custom">Custom ratio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {distributionMethod === "custom" ? (
                <div className="rounded-md border bg-white p-3 space-y-2">
                  {allNodes.filter((n) => n.parentId === node.id).map((child, idx) => (
                    <div key={child.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{child.name}</span>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          className="w-20"
                          value={customRatios[idx] ?? 0}
                          onChange={(e) => {
                            const value = Number(e.target.value)
                            setCustomRatios((prev) => {
                              const next = [...prev]
                              next[idx] = Number.isFinite(value) ? value : 0
                              return next
                            })
                          }}
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                  ))}
                  <div className={cn("text-xs", customRatios.reduce((sum, n) => sum + n, 0) === 100 ? "text-emerald-700" : "text-red-600")}>
                    Ratio total: {customRatios.reduce((sum, n) => sum + n, 0)}% (must be 100%)
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-center">
            <div className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                className="gap-1.5"
                onClick={distributeTargetsDown}
                disabled={lockInputs}
                title={lockInputs ? "Unlock targets to distribute" : undefined}
              >
                Distribute Targets Down ↓
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="gap-1.5"
                onClick={fullFillFromFlow}
                disabled={lockInputs || targets.length === 0}
                title="Set annual targets from this level’s flow budget by KPI weight, then split H1/H2 and quarters"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                Full fill
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                onClick={autoDistributeAll}
                disabled={lockInputs || targets.length === 0}
                title="Re-split existing annual targets into H1, H2, and quarters (same as Auto-distribute all above)"
              >
                <RefreshCw className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                Sync periods
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast({ title: "All allocations", description: "Showing allocations list (demo)." })}
              >
                View All Allocations →
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Layer roster (demo):</span>
                <span className="font-medium">
                  {layerPeopleSummary.allocated} of {layerPeopleSummary.total} people
                </span>
                {layerPeopleSummary.pending > 0 ? (
                  <Badge variant="outline" className={cn("border-0", "border-amber-200 bg-amber-50 text-amber-700")}>
                    {layerPeopleSummary.pending} pending
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-xl text-xs text-muted-foreground">
                Roster status is illustrative; wire to HR or allocation records for live counts.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 sm:max-w-xs">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {budgetUtilizationPct >= 100 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                ) : budgetUtilizationPct > 0 ? (
                  <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                )}
                <span>
                  Table fill <span className="font-mono font-semibold text-foreground">{budgetUtilizationPct}%</span> of flow budget
                </span>
              </div>
              <Progress value={budgetUtilizationPct} className="h-2 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <button type="button" className="flex w-full items-center justify-between" onClick={() => setHistoryOpen((prev) => !prev)}>
            <CardTitle className="text-base">Change History</CardTitle>
            <ChevronDown className={cn("h-4 w-4 transition-transform", historyOpen ? "rotate-180" : "")} />
          </button>
        </CardHeader>
        {historyOpen ? (
          <CardContent className="space-y-3">
            {(historyEntries.length === 0 ? [] : historyEntries).map((entry, idx) => {
              const dotClass =
                entry.action === "target-set"
                  ? "bg-orange-500"
                  : entry.action === "distributed"
                    ? "bg-emerald-500"
                    : entry.action === "locked"
                      ? "bg-amber-500"
                      : "bg-purple-500"
              return (
                <div key={`${entry.date}-${idx}`} className="flex items-start gap-3">
                  <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass)} />
                  <div className="text-sm">
                    <div className="text-muted-foreground">{toRelativeTime(entry.date)}</div>
                    <div>
                      <span className="font-medium">{entry.changedBy}</span> {entry.detail}
                    </div>
                  </div>
                </div>
              )
            })}
            {historyEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No recent changes for this node.</div>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      <Dialog
        open={addKpiDialogOpen}
        onOpenChange={(open) => {
          setAddKpiDialogOpen(open)
          if (!open) setAddKpiSearch("")
        }}
      >
        <DialogContent className="max-w-xl gap-0 overflow-hidden border-slate-200/80 p-0 shadow-xl sm:max-w-xl sm:rounded-xl">
          <div className="relative border-b border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-orange-50/40 px-6 pb-5 pt-6">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue/12 text-brand-blue shadow-inner ring-1 ring-brand-blue/10">
                <Layers className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 space-y-2 pr-8">
                <DialogTitle className="text-left text-xl font-semibold tracking-tight text-slate-900">
                  Add KPIs to this allocation
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-relaxed text-slate-600">
                  Choose KPIs from your selected template. Already-added KPIs are hidden. You can open this window again anytime.
                </DialogDescription>
                {selectedTemplate ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge className="border-0 bg-white/90 px-2.5 py-0.5 font-mono text-[11px] font-normal text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                      {selectedTemplate.templateCode}
                    </Badge>
                    <span className="text-sm font-medium text-slate-800">{selectedTemplate.templateName}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-100 bg-white px-6 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input
                value={addKpiSearch}
                onChange={(e) => setAddKpiSearch(e.target.value)}
                placeholder="Search by KPI name, code, or unit…"
                className="h-11 border-slate-200 bg-slate-50/90 pl-10 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:bg-white"
                disabled={addableKpiLines.length === 0}
              />
            </div>
            <p className="mt-2.5 text-xs text-slate-500">
              {addableKpiLines.length === 0 ? (
                <span>No KPIs left to add from this template.</span>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{filteredAddableKpis.length}</span>
                  {filteredAddableKpis.length === 1 ? " KPI" : " KPIs"}
                  {addKpiSearch.trim() ? " match your search" : " available"}
                  {addKpiSearch.trim() && filteredAddableKpis.length < addableKpiLines.length
                    ? ` (${addableKpiLines.length} total not yet added)`
                    : null}
                </>
              )}
            </p>
          </div>

          <div className="max-h-[min(52vh,400px)] overflow-y-auto bg-slate-50/50 px-3 py-3">
            {addableKpiLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Layers className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="max-w-sm text-sm text-slate-600">
                  {selectedTemplate?.kpiItems?.length
                    ? "Every KPI from this template is already in your targets table. Remove a row below if you want to swap in another KPI."
                    : "This template has no KPI items. Edit the template in KPI Templates to add KPIs first."}
                </p>
              </div>
            ) : filteredAddableKpis.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <p className="text-sm font-medium text-slate-700">No matches</p>
                <p className="max-w-xs text-xs text-slate-500">Try a different search, or clear the field to see all available KPIs.</p>
                <Button type="button" variant="ghost" size="sm" className="mt-1 text-brand-blue" onClick={() => setAddKpiSearch("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredAddableKpis.map((k) => (
                  <li key={k.kpiItemId}>
                    <div className="group flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm transition-all hover:border-brand-blue/35 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                          {k.kpiCode.replace(/[^A-Za-z0-9]/g, "").slice(0, 3) || "KPI"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-semibold leading-snug text-slate-900">{k.kpiName}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-500">{k.kpiCode}</span>
                            <span className="text-slate-300">·</span>
                            <Badge variant="secondary" className="h-5 border-0 bg-slate-100 px-2 text-[11px] font-medium text-slate-700">
                              Weight {k.weight}%
                            </Badge>
                            <Badge
                              variant="outline"
                              className="h-5 border-emerald-200/80 bg-emerald-50/80 px-2 text-[11px] font-medium capitalize text-emerald-800"
                            >
                              {k.unitType}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full shrink-0 gap-1.5 sm:w-auto sm:min-w-[5.5rem]"
                        disabled={lockInputs}
                        onClick={() => addKpiFromTemplate(k.kpiItemId)}
                      >
                        <Plus className="h-3.5 w-3.5 text-orange-500" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-slate-200/80 bg-slate-50/90 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-left text-xs text-slate-500">KPIs appear in the annual targets table as soon as you add them.</p>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setAddKpiDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          setCopyDialogOpen(open)
          if (open) {
            setCopySearch("")
            setCopyFromNodeId("")
          }
        }}
      >
        <DialogContent
          overlayClassName="bg-white/90 backdrop-blur-sm dark:bg-white/88"
          className="border-slate-200 bg-white text-slate-900 shadow-xl dark:bg-white dark:text-slate-900"
        >
          <DialogHeader>
            <DialogTitle>Copy from...</DialogTitle>
            <DialogDescription>
              Copy from a peer on the same level, or load a demo snapshot from the previous fiscal year.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Same hierarchy level</div>
              <Input value={copySearch} onChange={(e) => setCopySearch(e.target.value)} placeholder="Search person or team" />
              <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white dark:bg-white">
                {filteredPeers.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No peers at this level.</div>
                ) : (
                  filteredPeers.map((peer) => (
                    <button
                      key={peer.id}
                      type="button"
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50",
                        copyFromNodeId === peer.id ? "bg-orange-50 text-brand-blue" : "text-foreground",
                      )}
                      onClick={() => setCopyFromNodeId(peer.id)}
                    >
                      {peer.name}
                    </button>
                  ))
                )}
              </div>
            </div>
            <Separator />
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Historical</div>
              <Button
                type="button"
                variant="outline"
                className="h-auto w-full justify-start gap-2 py-3 text-left"
                disabled={lockInputs || targets.length === 0}
                title={
                  targets.length === 0
                    ? "Add KPI rows first"
                    : lockInputs
                      ? "Unlock targets to copy"
                      : `Apply demo values from ${PREVIOUS_FISCAL_YEAR}`
                }
                onClick={() => {
                  setCopyConfirmKind("lastYear")
                  setCopyDialogOpen(false)
                  setConfirmCopyOpen(true)
                }}
              >
                <CalendarClock className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                <span>
                  Copy from <span className="font-medium">{PREVIOUS_FISCAL_YEAR}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    Uses ~88% of current annual targets as a last-year snapshot (demo until archived data is connected).
                  </span>
                </span>
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setCopyConfirmKind("peer")
                setConfirmCopyOpen(true)
              }}
              disabled={!copyFromNodeId}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmCopyOpen} onOpenChange={setConfirmCopyOpen}>
        <DialogContent
          overlayClassName="bg-white/90 backdrop-blur-sm dark:bg-white/88"
          className="border-slate-200 bg-white text-slate-900 shadow-xl dark:bg-white dark:text-slate-900"
        >
          <DialogHeader>
            <DialogTitle>{copyConfirmKind === "lastYear" ? `Copy from ${PREVIOUS_FISCAL_YEAR}` : "Confirm copy"}</DialogTitle>
            <DialogDescription>
              {copyConfirmKind === "lastYear"
                ? `Replace ${node.name}’s targets with a ${PREVIOUS_FISCAL_YEAR} snapshot (demo). Current values will be overwritten.`
                : `Copy targets from ${allNodes.find((n) => n.id === copyFromNodeId)?.name ?? "selected member"} to ${node.name}? This will overwrite existing targets.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmCopyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!node) return
                if (copyConfirmKind === "lastYear") {
                  const copied = buildLastYearTargetsFromCurrent(targets).map((t) => ({ ...t }))
                  setTargets(copied)
                  form.setValue("rows", targetsToFormRows(copied), { shouldValidate: true })
                  onTargetsChange(node.id, copied)
                  onHistoryEvent(node.id, {
                    date: new Date().toISOString(),
                    changedBy: "Current User",
                    action: "target-set",
                    detail: `Copied targets from ${PREVIOUS_FISCAL_YEAR} snapshot`,
                  })
                  toast({
                    title: `${PREVIOUS_FISCAL_YEAR} snapshot applied`,
                    description: "Demo last-year values loaded. Connect finance archives for production data.",
                  })
                } else {
                  const fromTargets =
                    externalTargetsByNodeId[copyFromNodeId] ??
                    buildTargetsForNode(allNodes.find((n) => n.id === copyFromNodeId) ?? node)
                  const copied = fromTargets.map((t) => ({ ...t }))
                  setTargets(copied)
                  form.setValue("rows", targetsToFormRows(copied), { shouldValidate: true })
                  onTargetsChange(node.id, copied)
                  onCopyTargets(node.id, copyFromNodeId, copied)
                  onHistoryEvent(node.id, {
                    date: new Date().toISOString(),
                    changedBy: "Current User",
                    action: "target-set",
                    detail: `Copied targets from ${allNodes.find((n) => n.id === copyFromNodeId)?.name ?? "peer"}`,
                  })
                  toast({
                    title: "Targets copied",
                    description: `Values copied from ${allNodes.find((n) => n.id === copyFromNodeId)?.name ?? "peer"}.`,
                  })
                }
                setConfirmCopyOpen(false)
                setCopyDialogOpen(false)
              }}
            >
              {copyConfirmKind === "lastYear" ? `Apply ${PREVIOUS_FISCAL_YEAR}` : "Confirm copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
