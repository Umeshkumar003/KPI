import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Users } from "lucide-react"

import { HIERARCHY_SEED } from "@/pages/TemplateAllocation/HierarchyTree"
import { VISION_INITIAL_NODE_TARGETS } from "@/data/visionCentralDubai"
import type { HierarchyNode, KPITarget } from "@/types/kpi.types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"

type Mode = "individual" | "team"
type NodeRef = { id: string; name: string; role: HierarchyNode["role"] }
type TreeTeam = { id: string; name: string; members: NodeRef[] }
type Status = "green" | "amber" | "red"
type DistributionView = "annual-quarterly" | "monthly" | "weekly" | "daily"

type EditableTargetRow = {
  id: string
  ownerId: string
  ownerMode: Mode
  kpiName: string
  unitType: KPITarget["unitType"]
  weight: number
  annualTarget: number
  h1Target: number
  h2Target: number
  q1Target: number
  q2Target: number
  q3Target: number
  q4Target: number
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

function statusFromAnnual(value: number): Status {
  if (value > 1000) return "green"
  if (value > 100) return "amber"
  return "red"
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "green") return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Green</Badge>
  if (status === "amber") return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Amber</Badge>
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Red</Badge>
}

function unitLabel(unitType: KPITarget["unitType"]): string {
  // Keep tracking screen aligned to KPI Items terminology.
  if (unitType === "currency") return "Amount"
  if (unitType === "number") return "Number"
  if (unitType === "percentage") return "%"
  if (unitType === "teu") return "TEU"
  if (unitType === "score") return "Score"
  if (unitType === "days") return "days"
  if (unitType === "hours") return "hrs"
  if (unitType === "cbm") return "CBM"
  if (unitType === "tonnes") return "t"
  if (unitType === "ratio") return "ratio"
  return unitType
}

function unitBadgeClass(unitType: KPITarget["unitType"]): string {
  if (unitType === "currency") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (unitType === "number") return "border-slate-200 bg-slate-50 text-slate-700"
  if (unitType === "percentage") return "border-purple-200 bg-purple-50 text-purple-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

export default function ResponsibleTargetsPage() {
  const allNodes = useMemo(() => flattenNodes(HIERARCHY_SEED), [])
  const nodeById = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes])

  const teams = useMemo<TreeTeam[]>(() => {
    const leads = allNodes.filter((n) => n.role === "sales-lead")
    return leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      members: allNodes.filter((n) => n.parentId === lead.id && n.role === "sales-executive").map((n) => ({ id: n.id, name: n.name, role: n.role })),
    }))
  }, [allNodes])

  const allExecutives = useMemo(
    () => teams.flatMap((team) => team.members),
    [teams],
  )

  const [fy, setFy] = useState("fy-2025-26")
  const [distributionView, setDistributionView] = useState<DistributionView>("annual-quarterly")
  const [search, setSearch] = useState("")
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set(teams.map((t) => t.id)))
  const [selectedNode, setSelectedNode] = useState<{ mode: Mode; id: string; name: string }>({ mode: "individual", id: "se-akshai", name: "Akshai" })

  // Logged-in user simulation (replace with auth user in backend integration)
  const [currentUserId, setCurrentUserId] = useState<string>("se-akshai")
  const responsibleByTeamId = useAppStore((s) => s.responsibleOwnersByTeamId)

  const [targetRows] = useState<EditableTargetRow[]>(() => {
    const rows: EditableTargetRow[] = []
    Object.entries(VISION_INITIAL_NODE_TARGETS).forEach(([ownerId, targets]) => {
      const node = nodeById.get(ownerId)
      const ownerMode: Mode = node?.role === "sales-lead" ? "team" : "individual"
      if (ownerMode === "individual" && node?.role !== "sales-executive") return
      targets.forEach((t, idx) => {
        rows.push({
          id: `${ownerId}-${idx}`,
          ownerId,
          ownerMode,
          kpiName: t.kpiName,
          unitType: t.unitType,
          weight: t.weight,
          annualTarget: t.annualTarget,
          h1Target: t.h1Target,
          h2Target: t.h2Target,
          q1Target: t.q1Target,
          q2Target: t.q2Target,
          q3Target: t.q3Target,
          q4Target: t.q4Target,
        })
      })
    })
    return rows
  })

  const currentUserNode = useMemo(
    () => allExecutives.find((e) => e.id === currentUserId) ?? null,
    [allExecutives, currentUserId],
  )
  const currentUserTeamId = useMemo(
    () => teams.find((t) => t.members.some((m) => m.id === currentUserId))?.id ?? "",
    [currentUserId, teams],
  )

  const allocatedTeamIdsForUser = useMemo(
    () => Object.entries(responsibleByTeamId).filter(([, people]) => people.includes(currentUserId)).map(([teamId]) => teamId),
    [currentUserId, responsibleByTeamId],
  )
  const hasAllocatedTeams = allocatedTeamIdsForUser.length > 0

  const visibleTeamIds = useMemo(() => {
    const ids = new Set<string>()
    if (hasAllocatedTeams) {
      if (currentUserTeamId) ids.add(currentUserTeamId) // own team visible once user has allocations
      allocatedTeamIdsForUser.forEach((id) => ids.add(id)) // assigned teams visible
    }
    return ids
  }, [allocatedTeamIdsForUser, currentUserTeamId, hasAllocatedTeams])

  const visibleTeams = useMemo(() => {
    // strict validation rule:
    // if user has no allocated teams, show only the logged person (no teammates/team targets)
    if (!hasAllocatedTeams) {
      const ownTeam = teams.find((team) => team.id === currentUserTeamId)
      const ownMember = ownTeam?.members.find((m) => m.id === currentUserId)
      if (!ownTeam || !ownMember) return []
      const q = search.trim().toLowerCase()
      if (q && !`${ownTeam.name} ${ownMember.name}`.toLowerCase().includes(q)) return []
      return [{ ...ownTeam, members: [ownMember] }]
    }

    const q = search.trim().toLowerCase()
    const base = teams.filter((team) => visibleTeamIds.has(team.id))
    if (!q) return base
    return base
      .map((team) => ({ ...team, members: team.members.filter((m) => m.name.toLowerCase().includes(q)) }))
      .filter((team) => team.name.toLowerCase().includes(q) || team.members.length > 0)
  }, [currentUserId, currentUserTeamId, hasAllocatedTeams, search, teams, visibleTeamIds])

  const selectedRows = useMemo(
    () => targetRows.filter((r) => r.ownerMode === selectedNode.mode && r.ownerId === selectedNode.id),
    [selectedNode.id, selectedNode.mode, targetRows],
  )
  const tableMinWidth = useMemo(() => {
    if (distributionView === "annual-quarterly") return 1200
    if (distributionView === "monthly") return 1800
    if (distributionView === "weekly") return 5200
    return 14000
  }, [distributionView])
  const periodScrollContainerRef = useRef<HTMLDivElement | null>(null)

  const periodHeaders = useMemo(() => {
    if (distributionView === "monthly") return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const doy = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    if (distributionView === "weekly") return Math.max(0, Math.min(51, Math.floor((doy - 1) / 7)))
    return Math.max(0, Math.min(364, doy - 1))
  }, [distributionView])

  useEffect(() => {
    // enforce "self only" view when no team is allocated
    if (!hasAllocatedTeams && currentUserNode) {
      setSelectedNode({ mode: "individual", id: currentUserNode.id, name: currentUserNode.name })
      return
    }

    const isNodeVisible =
      (selectedNode.mode === "team" && visibleTeamIds.has(selectedNode.id)) ||
      (selectedNode.mode === "individual" && visibleTeams.some((t) => t.members.some((m) => m.id === selectedNode.id)))
    if (isNodeVisible) return
    if (currentUserNode) {
      setSelectedNode({ mode: "individual", id: currentUserNode.id, name: currentUserNode.name })
      return
    }
    const firstTeam = visibleTeams[0]
    if (firstTeam) setSelectedNode({ mode: "team", id: firstTeam.id, name: firstTeam.name })
  }, [currentUserNode, hasAllocatedTeams, selectedNode.id, selectedNode.mode, visibleTeamIds, visibleTeams])

  useEffect(() => {
    if (distributionView === "annual-quarterly") return
    if (currentPeriodIndex < 0) return
    const container = periodScrollContainerRef.current
    if (!container) return
    const el = container.querySelector<HTMLElement>(`[data-period-index="${currentPeriodIndex}"]`)
    if (!el) return
    requestAnimationFrame(() => {
      // Scroll only the KPI table container horizontally (avoid page-level scroll jumps).
      const elLeft = el.offsetLeft
      const elWidth = el.offsetWidth
      const targetLeft = Math.max(0, elLeft - container.clientWidth / 2 + elWidth / 2)
      container.scrollTo({ left: targetLeft, behavior: "smooth" })
    })
  }, [currentPeriodIndex, distributionView, periodHeaders.length, selectedRows.length])

  const toggleExpand = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  return (
    <div className="h-[calc(100vh-92px)] flex flex-col overflow-hidden">
      <div className="bg-white border rounded-md p-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-brand-blue">Responsible Person Targets</h2>
        <div className="w-[180px]">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="fy-2025-26">FY 2025-26</SelectItem></SelectContent>
          </Select>
        </div>
        <Tabs value={distributionView} onValueChange={(v) => setDistributionView(v as DistributionView)}>
          <TabsList className="h-8">
            <TabsTrigger value="annual-quarterly" className="px-2 text-xs">Annual & Quarterly</TabsTrigger>
            <TabsTrigger value="monthly" className="px-2 text-xs">Monthly</TabsTrigger>
            <TabsTrigger value="weekly" className="px-2 text-xs">Weekly</TabsTrigger>
            <TabsTrigger value="daily" className="px-2 text-xs">Daily</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-[220px] ml-auto">
          <Select value={currentUserId} onValueChange={setCurrentUserId}>
            <SelectTrigger><SelectValue placeholder="Logged person" /></SelectTrigger>
            <SelectContent>
              {allExecutives.map((person) => (
                <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 bg-white border rounded-md p-3 text-sm flex flex-wrap gap-2 items-center">
        <span className="text-muted-foreground">Logged person:</span>
        <Badge variant="outline">{currentUserNode?.name ?? "Unknown"}</Badge>
        <span className="text-muted-foreground">Own team:</span>
        <Badge variant="outline">{teams.find((t) => t.id === currentUserTeamId)?.name ?? "N/A"}</Badge>
        <span className="text-muted-foreground">Allocated teams:</span>
        {allocatedTeamIdsForUser.length > 0 ? (
          allocatedTeamIdsForUser.map((teamId) => <Badge key={teamId}>{teams.find((t) => t.id === teamId)?.name ?? teamId}</Badge>)
        ) : (
          <Badge variant="outline">None</Badge>
        )}
        {!hasAllocatedTeams ? (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Self-only access: you can view only your own target.
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex min-h-0 flex-1 gap-3">
        <Card className="w-[300px] shrink-0 min-h-0 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accessible Teams & Members</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search visible people or teams" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto space-y-2">
            {visibleTeams.map((team) => (
              <div key={team.id} className="rounded-md border">
                <button
                  type="button"
                  className={cn(
                    "w-full px-2 py-2 flex items-center gap-2 text-sm",
                    selectedNode.mode === "team" && selectedNode.id === team.id ? "bg-orange-50 text-brand-blue" : "",
                    !hasAllocatedTeams ? "opacity-60 cursor-not-allowed" : "",
                  )}
                  onClick={() => {
                    if (!hasAllocatedTeams) return
                    setSelectedNode({ mode: "team", id: team.id, name: team.name })
                    toggleExpand(team.id)
                  }}
                >
                  <span>{expandedTeams.has(team.id) ? "▾" : "▸"}</span>
                  <Users className="h-4 w-4" />
                  <span className="font-medium">{team.name}</span>
                  <Badge variant="outline" className="ml-auto">{team.members.length}</Badge>
                </button>
                {expandedTeams.has(team.id) ? (
                  <div className="border-t px-2 py-2 space-y-1">
                    {team.members.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        className={cn("w-full rounded-md px-2 py-1.5 text-left text-sm flex items-center justify-between", selectedNode.mode === "individual" && selectedNode.id === emp.id ? "bg-orange-50 text-brand-blue" : "hover:bg-slate-50")}
                        onClick={() => setSelectedNode({ mode: "individual", id: emp.id, name: emp.name })}
                      >
                        <span>{emp.name}</span>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">Sales Exec</Badge>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {visibleTeams.length === 0 ? <p className="text-sm text-muted-foreground">No teams are assigned to this logged person yet.</p> : null}
          </CardContent>
        </Card>

        <div className="min-h-0 min-w-0 flex-1 flex flex-col gap-3">
          <Card>
            <CardContent className="pt-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Selected Target Owner</p>
                <p className="text-base font-semibold">{selectedNode.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{selectedNode.mode} target view</p>
              </div>
              <Badge variant="outline">Tracking View (Read-only)</Badge>
            </CardContent>
          </Card>

          <Card className="min-h-0 flex-1 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">KPI Item Detailed List (Template Allocation Reference)</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 overflow-auto">
              <div ref={periodScrollContainerRef} className="relative w-full overflow-x-auto overscroll-x-contain">
              <Table className="min-w-max" style={{ minWidth: tableMinWidth }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-30 min-w-[220px] bg-white">KPI Item</TableHead>
                    <TableHead className="sticky z-30 min-w-[70px] bg-white text-center" style={{ left: "220px" }}>Unit</TableHead>
                    <TableHead className="sticky z-30 min-w-[80px] bg-white text-right" style={{ left: "290px" }}>Weight</TableHead>
                    <TableHead className="sticky z-30 min-w-[120px] bg-white text-center" style={{ left: "370px" }}>Annual</TableHead>
                    {distributionView === "annual-quarterly" ? (
                      <>
                        <TableHead className="text-center">H1</TableHead>
                        <TableHead className="text-center">H2</TableHead>
                        <TableHead className="text-center">Q1</TableHead>
                        <TableHead className="text-center">Q2</TableHead>
                        <TableHead className="text-center">Q3</TableHead>
                        <TableHead className="text-center">Q4</TableHead>
                      </>
                    ) : (
                      periodHeaders.map((header, idx) => (
                        <TableHead
                          key={`${header}-${idx}`}
                          data-period-index={idx}
                          className={cn("min-w-[92px] text-center font-mono text-[11px]", idx === currentPeriodIndex ? "bg-orange-50 text-orange-700" : "")}
                        >
                          {header}
                        </TableHead>
                      ))
                    )}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={distributionView === "annual-quarterly" ? 11 : 5 + periodHeaders.length} className="text-center py-8 text-muted-foreground">No KPI items configured for this owner.</TableCell>
                    </TableRow>
                  ) : (
                    selectedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="sticky left-0 z-20 min-w-[220px] bg-white font-medium">{row.kpiName}</TableCell>
                        <TableCell className="sticky z-20 min-w-[70px] bg-white text-center" style={{ left: "220px" }}>
                          <Badge variant="outline" className={cn("border", unitBadgeClass(row.unitType))}>
                            {unitLabel(row.unitType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="sticky z-20 min-w-[80px] bg-white text-right" style={{ left: "290px" }}>
                          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{row.weight}%</Badge>
                        </TableCell>
                        <TableCell className="sticky z-20 min-w-[120px] bg-white text-center font-mono" style={{ left: "370px" }}>{row.annualTarget}</TableCell>
                        {distributionView === "annual-quarterly" ? (
                          <>
                            <TableCell className="text-center font-mono">{row.h1Target}</TableCell>
                            <TableCell className="text-center font-mono">{row.h2Target}</TableCell>
                            <TableCell className="text-center font-mono">{row.q1Target}</TableCell>
                            <TableCell className="text-center font-mono">{row.q2Target}</TableCell>
                            <TableCell className="text-center font-mono">{row.q3Target}</TableCell>
                            <TableCell className="text-center font-mono">{row.q4Target}</TableCell>
                          </>
                        ) : (
                          (() => {
                            const count = distributionView === "monthly" ? 12 : distributionView === "weekly" ? 52 : 365
                            const base = Math.floor(row.annualTarget / count)
                            const rem = row.annualTarget - base * count
                            return Array.from({ length: count }, (_, i) => base + (i < rem ? 1 : 0)).map((v, idx) => (
                              <TableCell key={`${row.id}-${idx}`} className={cn("min-w-[92px] text-center font-mono text-xs", idx === currentPeriodIndex ? "bg-orange-50/60 text-orange-700" : "")}>
                                {v}
                              </TableCell>
                            ))
                          })()
                        )}
                        <TableCell><StatusBadge status={statusFromAnnual(row.annualTarget)} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}
