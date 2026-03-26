import { useEffect, useMemo, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useKPIStore } from "@/store/kpiStore"
import AllocationForm from "./AllocationForm"
import HierarchyTree, { HIERARCHY_SEED } from "./HierarchyTree"
import { ResizableHierarchySplit } from "./ResizableHierarchySplit"
import { Skeleton } from "@/components/ui/skeleton"
import { VISION_INITIAL_NODE_TARGETS } from "@/data/visionCentralDubai"
import type { HierarchyLevel, HierarchyNode, KPITarget } from "@/types/kpi.types"
import { autoDistribute, cn } from "@/lib/utils"

type TargetTab = "annual" | "h1" | "h2" | "q1" | "q2" | "q3" | "q4"
type AllocationHistoryAction = "target-set" | "distributed" | "locked" | "template-changed"

export type AllocationHistoryEntry = {
  date: string
  changedBy: string
  action: AllocationHistoryAction
  detail: string
}

function deepCloneNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  return nodes.map((node) => ({ ...node, children: deepCloneNodes(node.children) }))
}

function flattenNodes(nodes: HierarchyNode[]): HierarchyNode[] {
  const out: HierarchyNode[] = []
  const walk = (list: HierarchyNode[]) => {
    for (const node of list) {
      out.push(node)
      walk(node.children)
    }
  }
  walk(nodes)
  return out
}

function updateNodeStatus(nodes: HierarchyNode[], nodeId: string, status: HierarchyNode["allocationStatus"]): HierarchyNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return { ...node, allocationStatus: status, children: updateNodeStatus(node.children, nodeId, status) }
    return { ...node, children: updateNodeStatus(node.children, nodeId, status) }
  })
}

function roleLabel(role: HierarchyLevel): string {
  if (role === "leadership") return "Leadership"
  if (role === "branch-head") return "Branch Head"
  if (role === "sales-manager") return "Managers"
  if (role === "sales-lead") return "Leads"
  return "Executives"
}

function targetStatusFromTargets(targets: KPITarget[]): HierarchyNode["allocationStatus"] {
  if (targets.length === 0) return "none"
  const annual = targets.map((t) => t.annualTarget)
  const hasAny = annual.some((v) => v > 0)
  const hasAll = annual.every((v) => v > 0)
  if (hasAll) return "allocated"
  if (hasAny) return "partial"
  return "none"
}

export default function TemplateAllocationPage() {
  const selectedNode = useKPIStore((state) => state.selectedNode)
  const setSelectedNode = useKPIStore((state) => state.setSelectedNode)

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    // TODO: remove once API is connected
    const t = window.setTimeout(() => setLoading(false), 600)
    return () => window.clearTimeout(t)
  }, [])

  const [fyValue, setFyValue] = useState<string>("fy-2025-26")
  const [regionValue, setRegionValue] = useState<string>("all-regions")
  const [targetTab, setTargetTab] = useState<TargetTab>("annual")
  const [treeNodes, setTreeNodes] = useState<HierarchyNode[]>(() => deepCloneNodes(HIERARCHY_SEED))
  const [statusFilter, setStatusFilter] = useState<"all" | "allocated" | "partial" | "none">("all")
  const [levelFilter, setLevelFilter] = useState<"all" | HierarchyLevel>("all")
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const [nodeTargetsById, setNodeTargetsById] = useState<Record<string, KPITarget[]>>(() => ({
    ...VISION_INITIAL_NODE_TARGETS,
  }))
  const [nodeLockedById, setNodeLockedById] = useState<Record<string, boolean>>({})
  const [historyByNodeId, setHistoryByNodeId] = useState<Record<string, AllocationHistoryEntry[]>>({})
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkAnnualValues, setBulkAnnualValues] = useState<number[]>([0, 0, 0, 0, 0])

  const flatNodes = useMemo(() => flattenNodes(treeNodes), [treeNodes])
  const selectedBulkNodes = useMemo(() => flatNodes.filter((n) => selectedNodeIds.has(n.id)), [flatNodes, selectedNodeIds])

  const dashboard = useMemo(() => {
    const levels: HierarchyLevel[] = ["leadership", "branch-head", "sales-manager", "sales-lead", "sales-executive"]
    const byLevel = levels.map((level) => {
      const nodes = flatNodes.filter((n) => n.role === level)
      const allocated = nodes.filter((n) => n.allocationStatus === "allocated").length
      return { level, total: nodes.length, allocated }
    })
    const total = flatNodes.length
    const allocated = flatNodes.filter((n) => n.allocationStatus === "allocated").length
    const progress = total === 0 ? 0 : Math.round((allocated / total) * 100)
    return { byLevel, total, allocated, progress, unallocated: total - allocated }
  }, [flatNodes])

  const progressStroke = useMemo(() => {
    const radius = 28
    const circumference = 2 * Math.PI * radius
    const offset = circumference * (1 - dashboard.progress / 100)
    return { radius, circumference, offset }
  }, [dashboard.progress])

  const appendHistory = (nodeId: string, entry: AllocationHistoryEntry) => {
    setHistoryByNodeId((prev) => {
      const current = prev[nodeId] ?? []
      return { ...prev, [nodeId]: [entry, ...current].slice(0, 5) }
    })
  }

  const applyBulkTargets = () => {
    if (selectedBulkNodes.length < 2) return
    const nextTargetsById: Record<string, KPITarget[]> = {}
    selectedBulkNodes.forEach((node) => {
      nextTargetsById[node.id] = bulkAnnualValues.map((annual, idx) => {
        const split = autoDistribute(annual)
        const defaults = [
          { id: "kpi-otd-sea", code: "OTD-SEA", name: "On-Time Delivery %", unitType: "percentage" as const, weight: 15 },
          { id: "kpi-rev-tot", code: "REV-TOT", name: "Total Revenue", unitType: "currency" as const, weight: 35 },
          { id: "kpi-qte-cnv", code: "QTE-CNV", name: "Quote Conversion Rate", unitType: "percentage" as const, weight: 20 },
          { id: "kpi-shp-vol", code: "SHP-VOL", name: "Shipment Volume", unitType: "teu" as const, weight: 15 },
          { id: "kpi-cst-sat", code: "CST-SAT", name: "Customer Satisfaction", unitType: "score" as const, weight: 15 },
        ][idx]
        return {
          kpiItemId: defaults.id,
          kpiCode: defaults.code,
          kpiName: defaults.name,
          unitType: defaults.unitType,
          weight: defaults.weight,
          annualTarget: annual,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })
    })
    setNodeTargetsById((prev) => ({ ...prev, ...nextTargetsById }))
    let nextTree = treeNodes
    selectedBulkNodes.forEach((node) => {
      const status = targetStatusFromTargets(nextTargetsById[node.id] ?? [])
      nextTree = updateNodeStatus(nextTree, node.id, status)
      appendHistory(node.id, {
        date: new Date().toISOString(),
        changedBy: "Current User",
        action: "target-set",
        detail: "Bulk targets applied",
      })
    })
    setTreeNodes(nextTree)
    setBulkDialogOpen(false)
    toast({
      title: "Bulk targets applied",
      description: `Apply to ${selectedBulkNodes.length} ${roleLabel(selectedBulkNodes[0]!.role)}? Completed.`,
    })
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <div className="bg-white border-b px-6 py-3 flex gap-4 items-center flex-wrap">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-9 w-[190px]" />
          <div className="flex-1 min-w-[220px]">
            <Skeleton className="h-9 w-[420px]" />
          </div>
          <Skeleton className="h-9 w-[180px]" />
          <Skeleton className="h-10 w-44 rounded-md ml-auto" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <ResizableHierarchySplit
            className="min-h-0 flex-1"
            leftClassName="overflow-y-auto p-4"
            rightClassName="overflow-y-auto p-6"
            left={
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-6 w-full rounded-sm" />
                ))}
              </div>
            }
            right={
              <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="rounded-lg border bg-white p-4 space-y-3">
                  <Skeleton className="h-8 w-48 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <div className="overflow-x-auto pt-2">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2">
                        <Skeleton className="h-6 w-28 rounded-md" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                        <Skeleton className="h-6 w-16 rounded-md" />
                        <Skeleton className="h-6 w-16 rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-6 py-3 flex gap-4 items-center flex-wrap">
        <h2 className="text-2xl font-semibold tracking-tight text-brand-blue whitespace-nowrap">Template Allocation</h2>
        <div className="w-[180px]">
          <Select value={fyValue} onValueChange={setFyValue}>
            <SelectTrigger>
              <SelectValue placeholder="FY 2025-26" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy-2025-26">FY 2025-26</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs value={targetTab} onValueChange={(v) => setTargetTab(v as TargetTab)}>
          <TabsList className="h-8">
            <TabsTrigger value="annual" className="px-2 text-xs">
              Annual
            </TabsTrigger>
            <TabsTrigger value="h1" className="px-2 text-xs">
              H1
            </TabsTrigger>
            <TabsTrigger value="h2" className="px-2 text-xs">
              H2
            </TabsTrigger>
            <TabsTrigger value="q1" className="px-2 text-xs">
              Q1
            </TabsTrigger>
            <TabsTrigger value="q2" className="px-2 text-xs">
              Q2
            </TabsTrigger>
            <TabsTrigger value="q3" className="px-2 text-xs">
              Q3
            </TabsTrigger>
            <TabsTrigger value="q4" className="px-2 text-xs">
              Q4
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-[180px]">
          <Select value={regionValue} onValueChange={setRegionValue}>
            <SelectTrigger>
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-regions">All Regions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          className="ml-auto"
          onClick={() => {
            if (!selectedNode) {
              toast({
                title: "Select a hierarchy node",
                description: "Pick a person or team from the left hierarchy tree.",
              })
              return
            }

            toast({
              title: "New allocation started",
              description: `Draft opened for ${selectedNode.name} (demo).`,
            })
          }}
        >
          New Allocation
        </Button>
      </div>
      <div className="border-b bg-slate-50 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
            <circle cx="34" cy="34" r={progressStroke.radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
            <circle
              cx="34"
              cy="34"
              r={progressStroke.radius}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={progressStroke.circumference}
              strokeDashoffset={progressStroke.offset}
              transform="rotate(-90 34 34)"
            />
          </svg>
          <div>
            <div className="text-sm font-semibold">{dashboard.progress}% Allocated</div>
            <div className="text-xs text-muted-foreground">
              {dashboard.allocated}/{dashboard.total} fully allocated
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dashboard.byLevel.map((item) => (
            <button
              key={item.level}
              type="button"
              className={cn(
                "text-xs rounded-md border px-2 py-1 hover:bg-white",
                levelFilter === item.level ? "border-brand-blue text-brand-blue bg-white" : "border-slate-200",
              )}
              onClick={() => setLevelFilter((prev) => (prev === item.level ? "all" : item.level))}
            >
              {roleLabel(item.level)} {item.allocated === item.total ? "✓" : `${item.allocated}/${item.total}`}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="ml-auto"
          onClick={() => toast({ title: "Reminder sent", description: `Reminder sent to ${dashboard.unallocated} unallocated members` })}
        >
          Send Reminder
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <ResizableHierarchySplit
          className="min-h-0 flex-1"
          leftClassName="overflow-y-auto"
          rightClassName="overflow-y-auto p-6"
          left={
            <HierarchyTree
              nodes={treeNodes}
              selectedId={selectedNode?.id ?? null}
              onSelect={setSelectedNode}
              selectedNodeIds={selectedNodeIds}
              onSelectedNodeIdsChange={setSelectedNodeIds}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              levelFilter={levelFilter}
              onRequestBulkSetTargets={() => setBulkDialogOpen(true)}
            />
          }
          right={
            <AllocationForm
              node={selectedNode}
              allNodes={flatNodes}
              externalTargetsByNodeId={nodeTargetsById}
              externalLockedByNodeId={nodeLockedById}
              historyByNodeId={historyByNodeId}
              onTargetsChange={(nodeId, targets) => {
                setNodeTargetsById((prev) => ({ ...prev, [nodeId]: targets }))
                const status = targetStatusFromTargets(targets)
                setTreeNodes((prev) => updateNodeStatus(prev, nodeId, status))
              }}
              onLockChange={(nodeId, isLocked) => {
                setNodeLockedById((prev) => ({ ...prev, [nodeId]: isLocked }))
                appendHistory(nodeId, {
                  date: new Date().toISOString(),
                  changedBy: "Current User",
                  action: "locked",
                  detail: isLocked ? "Targets locked" : "Targets unlocked",
                })
              }}
              onHistoryEvent={(nodeId, event) => appendHistory(nodeId, event)}
              onCopyTargets={(toNodeId, fromNodeId, targets) => {
                setNodeTargetsById((prev) => ({ ...prev, [toNodeId]: targets, [fromNodeId]: prev[fromNodeId] ?? targets }))
                setTreeNodes((prev) => updateNodeStatus(prev, toNodeId, targetStatusFromTargets(targets)))
              }}
            />
          }
        />
      </div>
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Set Targets</DialogTitle>
            <DialogDescription>Set annual targets for all selected nodes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {["On-Time Delivery %", "Revenue Target", "Quote Conversion", "Shipment Volume", "Customer Satisfaction"].map((label, idx) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="text-sm">{label}</span>
                <Input
                  type="number"
                  className="w-36"
                  value={bulkAnnualValues[idx] ?? 0}
                  onChange={(e) => {
                    const num = Number(e.target.value)
                    setBulkAnnualValues((prev) => {
                      const next = [...prev]
                      next[idx] = Number.isFinite(num) ? num : 0
                      return next
                    })
                  }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyBulkTargets} disabled={selectedBulkNodes.length < 2}>
              Apply to {selectedBulkNodes.length} {selectedBulkNodes[0] ? roleLabel(selectedBulkNodes[0].role) : "members"}?
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
