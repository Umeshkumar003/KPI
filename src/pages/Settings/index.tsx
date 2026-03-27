import { useMemo, useState } from "react"
import { addDays, format, formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Plus,
  Search,
  Trash2,
  X,
  ChevronUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { useTenantKpiItems } from "@/hooks/useTenantScope"
import { useAppStore } from "@/store/appStore"
import { useKPIStore } from "@/store/kpiStore"
import { HIERARCHY_SEED } from "@/pages/TemplateAllocation/HierarchyTree"
import type { HierarchyNode, KPIItem } from "@/types/kpi.types"

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const
const CURRENCIES = ["USD", "AED", "INR", "GBP", "EUR", "SAR", "QAR", "KWD", "OMR", "BHD"] as const
const INDUSTRIES = ["Logistics", "Manufacturing", "Retail", "Financial", "Sales", "Operations", "HR", "Customer", "Quality"] as const
const TIMEZONES = ["UTC", "Asia/Dubai", "Asia/Kolkata", "Europe/London", "Europe/Berlin", "Asia/Qatar", "Asia/Kuwait", "Asia/Bahrain"]

type NotificationConfig = { id: string; label: string; email: boolean; inApp: boolean }

type ResponsibleMember = { id: string; name: string }
type ResponsibleTeam = { id: string; name: string; members: ResponsibleMember[] }

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

const STANDARD_LIBRARY: Record<string, Array<Pick<KPIItem, "definitionName" | "itemName" | "kpiCode" | "category" | "unitType">>> = {
  Logistics: [
    { definitionName: "Transit Lead Time", itemName: "Transit Time", kpiCode: "TRN-TIME", category: "operational", unitType: "days" },
    { definitionName: "Documentation Accuracy", itemName: "Doc Accuracy %", kpiCode: "DOC-ACC", category: "compliance", unitType: "percentage" },
  ],
  Manufacturing: [{ definitionName: "On-Time Dispatch", itemName: "OT Dispatch %", kpiCode: "OTD-DSP", category: "delivery", unitType: "percentage" }],
  Retail: [{ definitionName: "Order Fill Rate", itemName: "Fill Rate %", kpiCode: "ORD-FIL", category: "customer", unitType: "percentage" }],
  Financial: [{ definitionName: "Gross Margin", itemName: "Gross Margin %", kpiCode: "GRS-MRG", category: "financial", unitType: "percentage" }],
  Sales: [{ definitionName: "Quota Attainment", itemName: "Quota Attainment %", kpiCode: "QTA-ATT", category: "financial", unitType: "percentage" }],
  Operations: [{ definitionName: "Cycle Time", itemName: "Cycle Time", kpiCode: "CYC-TIME", category: "operational", unitType: "hours" }],
  HR: [{ definitionName: "Employee Attrition", itemName: "Attrition %", kpiCode: "EMP-ATR", category: "sustainability", unitType: "percentage" }],
  Customer: [{ definitionName: "NPS Performance", itemName: "NPS Score", kpiCode: "NPS-SCR", category: "customer", unitType: "score" }],
  Quality: [{ definitionName: "Defect Leakage", itemName: "Defect Leakage %", kpiCode: "DFT-LEK", category: "compliance", unitType: "percentage" }],
}

export default function SettingsPage() {
  const kpiItems = useTenantKpiItems()
  const addKPIItem = useKPIStore((s) => s.addKPIItem)
  const hierarchyLevels = useAppStore((s) => s.hierarchyLevels)
  const setHierarchyLevels = useAppStore((s) => s.setHierarchyLevels)
  const responsibleOwnersByTeamId = useAppStore((s) => s.responsibleOwnersByTeamId)
  const setResponsibleOwnersByTeamId = useAppStore((s) => s.setResponsibleOwnersByTeamId)
  const activityLog = useAppStore((s) => s.activityLog)
  const notifications = useAppStore((s) => s.notifications)

  const [organisationName, setOrganisationName] = useState("VoltusWave")
  const [industry, setIndustry] = useState<string>("Logistics")
  const [currency, setCurrency] = useState<string>("USD")
  const [fyStartMonth, setFyStartMonth] = useState<string>("January")
  const [timezone, setTimezone] = useState<string>("Asia/Dubai")
  const [logoPreview, setLogoPreview] = useState<string>("")

  const [query, setQuery] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<string>("Logistics")
  const [checkedLibraryItems, setCheckedLibraryItems] = useState<string[]>([])
  const [userDialogOpen, setUserDialogOpen] = useState(false)

  const [notifConfig, setNotifConfig] = useState<NotificationConfig[]>([
    { id: "threshold", label: "KPI threshold breached", email: true, inApp: true },
    { id: "target-deadline", label: "Target not allocated by deadline", email: true, inApp: false },
    { id: "period-end", label: "Period end approaching (7 days)", email: false, inApp: true },
    { id: "missing-actuals", label: "Actuals not entered for current period", email: true, inApp: true },
    { id: "target-decision", label: "Target approved/rejected", email: false, inApp: true },
  ])
  const [frequency, setFrequency] = useState("immediate")
  const [activityAction, setActivityAction] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  const [draftResponsibleOwnersByTeamId, setDraftResponsibleOwnersByTeamId] = useState<Record<string, string[]>>(responsibleOwnersByTeamId)
  const [responsibleTableSearch, setResponsibleTableSearch] = useState("")
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [activeTeamId, setActiveTeamId] = useState<string>("")
  const [availableSearch, setAvailableSearch] = useState("")
  const [assignedSearch, setAssignedSearch] = useState("")
  const [pendingAssignedIds, setPendingAssignedIds] = useState<Set<string>>(new Set())

  const responsibleTeams = useMemo<ResponsibleTeam[]>(() => {
    const all = flattenNodes(HIERARCHY_SEED)
    return all
      .filter((n) => n.role === "sales-lead")
      .map((lead) => ({
        id: lead.id,
        name: lead.name,
        members: all
          .filter((n) => n.parentId === lead.id && n.role === "sales-executive")
          .map((n) => ({ id: n.id, name: n.name })),
      }))
  }, [])

  const filteredResponsibleTeams = useMemo(() => {
    const q = responsibleTableSearch.trim().toLowerCase()
    if (!q) return responsibleTeams
    return responsibleTeams.filter((team) => team.name.toLowerCase().includes(q))
  }, [responsibleTableSearch, responsibleTeams])

  const allResponsibleMembers = useMemo(
    () => responsibleTeams.flatMap((team) => team.members),
    [responsibleTeams],
  )

  const activeTeam = useMemo(
    () => responsibleTeams.find((team) => team.id === activeTeamId) ?? null,
    [activeTeamId, responsibleTeams],
  )

  const availableMembers = useMemo(() => {
    const q = availableSearch.trim().toLowerCase()
    return allResponsibleMembers
      .filter((member) => !pendingAssignedIds.has(member.id))
      .filter((member) => (q ? member.name.toLowerCase().includes(q) : true))
  }, [allResponsibleMembers, availableSearch, pendingAssignedIds])

  const assignedMembers = useMemo(() => {
    const q = assignedSearch.trim().toLowerCase()
    return allResponsibleMembers
      .filter((member) => pendingAssignedIds.has(member.id))
      .filter((member) => (q ? member.name.toLowerCase().includes(q) : true))
  }, [allResponsibleMembers, assignedSearch, pendingAssignedIds])

  const filteredKpis = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return kpiItems
    return kpiItems.filter((item) => `${item.kpiCode} ${item.itemName} ${item.definitionName}`.toLowerCase().includes(q))
  }, [kpiItems, query])

  const monthCards = useMemo(() => {
    const startIdx = MONTHS.indexOf(fyStartMonth as (typeof MONTHS)[number])
    return MONTHS.map((month, idx) => {
      const fiscalIndex = (idx - startIdx + 12) % 12
      const quarter = `Q${Math.floor(fiscalIndex / 3) + 1}`
      const half = fiscalIndex < 6 ? "H1" : "H2"
      const active = new Date().toLocaleString("en-US", { month: "long" }) === month
      return { month, quarter, half, active }
    })
  }, [fyStartMonth])

  const addLevel = () => {
    setHierarchyLevels([...hierarchyLevels, { id: crypto.randomUUID(), name: "", orgType: "Department", color: "#1558A8" }])
  }

  const updateLevel = (id: string, patch: Partial<(typeof hierarchyLevels)[number]>) => {
    setHierarchyLevels(hierarchyLevels.map((level) => (level.id === id ? { ...level, ...patch } : level)))
  }

  const moveLevel = (index: number, direction: -1 | 1) => {
    const next = [...hierarchyLevels]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setHierarchyLevels(next)
  }

  const importLibrary = () => {
    const selected = STANDARD_LIBRARY[selectedIndustry]?.filter((item) => checkedLibraryItems.includes(item.kpiCode)) ?? []
    selected.forEach((item) =>
      addKPIItem({
        id: crypto.randomUUID(),
        definitionName: item.definitionName,
        kpiCode: item.kpiCode,
        itemName: item.itemName,
        category: item.category,
        description: `${item.itemName} imported from ${selectedIndustry} standard library.`,
        shipmentModes: ["sea"],
        tradeDirections: ["import", "export"],
        jobType: "Operations",
        regionScope: "Global",
        unitType: item.unitType,
        calculationType: "manual",
        periodType: "monthly",
        aggregation: "Average",
        trendDirection: "higher-better",
        dataSource: "Manual",
        thresholds: { green: { min: 90, max: 100 }, amber: { min: 70, max: 89.99 }, red: { min: 0, max: 69.99 } },
        allowCarryForward: true,
        showInBuildScreen: true,
        enableAlerts: true,
        weightedScoring: true,
        visibleRoles: ["ops-exec"],
        weight: 10,
        statusId: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    )
    toast({ title: "Library imported", description: `${selected.length} KPI items imported from ${selectedIndustry}.` })
    setImportOpen(false)
    setCheckedLibraryItems([])
  }

  const filteredActivity = activityLog.filter((log) => {
    const actionMatch = activityAction === "all" || log.action === activityAction
    const since = addDays(new Date(), -Number(dateRange))
    return actionMatch && new Date(log.timestamp) >= since
  })

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-brand-blue">Settings</h2>
      <Tabs defaultValue="organisation" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-2 h-auto">
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
          <TabsTrigger value="library">KPI Library</TabsTrigger>
          <TabsTrigger value="calendar">Fiscal Calendar</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="responsible-owners">Responsible Owners</TabsTrigger>
          <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="organisation">
          <Card>
            <CardHeader><CardTitle>Organisation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Organisation Name</Label><Input value={organisationName} onChange={(e) => setOrganisationName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Industry</Label><Select value={industry} onValueChange={setIndustry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INDUSTRIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Base Currency</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Fiscal Year Start Month</Label><Select value={fyStartMonth} onValueChange={setFyStartMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Timezone</Label><Select value={timezone} onValueChange={setTimezone}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIMEZONES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <Input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => setLogoPreview(String(reader.result))
                  reader.readAsDataURL(file)
                }} />
                {logoPreview ? <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-md object-cover border" /> : null}
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => toast({ title: "Organisation settings saved" })}>Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Hierarchy Builder</CardTitle><Button variant="outline" onClick={addLevel}><Plus className="h-4 w-4 mr-2" />Add Level</Button></CardHeader>
            <CardContent className="space-y-3">
              {hierarchyLevels.map((level, index) => (
                <div key={level.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px_auto] gap-2 items-center rounded-md border p-3">
                  <Input value={level.name} placeholder="Level name" onChange={(e) => updateLevel(level.id, { name: e.target.value })} />
                  <Select value={level.orgType} onValueChange={(value) => updateLevel(level.id, { orgType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Executive", "Regional", "Branch", "Department", "Team", "Individual"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                  <div className="flex items-center gap-2">
                    <input type="color" value={level.color} onChange={(e) => updateLevel(level.id, { color: e.target.value })} className="h-8 w-8 rounded-full border" />
                    <Badge variant="outline">{level.orgType}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveLevel(index, -1)}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => moveLevel(index, 1)}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setHierarchyLevels(hierarchyLevels.filter((item) => item.id !== level.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
              <Button onClick={() => toast({ title: "Hierarchy saved", description: "Hierarchy structure updated." })}>Save Hierarchy Structure</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>KPI Library</CardTitle><Button onClick={() => setImportOpen(true)}>Import Standard Library</Button></CardHeader>
            <CardContent>
              <div className="relative mb-3"><Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search KPI library..." /></div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>KPI Code</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{filteredKpis.map((item) => <TableRow key={item.id}><TableCell>{item.kpiCode}</TableCell><TableCell>{item.itemName}</TableCell><TableCell className="capitalize">{item.category}</TableCell><TableCell><Badge variant="outline">{item.statusId}</Badge></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Import Standard KPI Library</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(STANDARD_LIBRARY).map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {(STANDARD_LIBRARY[selectedIndustry] ?? []).map((item) => (
                    <label key={item.kpiCode} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <Checkbox checked={checkedLibraryItems.includes(item.kpiCode)} onCheckedChange={(checked) => setCheckedLibraryItems((prev) => checked ? [...prev, item.kpiCode] : prev.filter((code) => code !== item.kpiCode))} />
                      <span>{item.itemName}</span>
                    </label>
                  ))}
                </div>
                <Button onClick={importLibrary}>Import Selected</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader><CardTitle>Fiscal Calendar</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="max-w-sm"><Select value={fyStartMonth} onValueChange={setFyStartMonth}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {monthCards.map((item) => (
                  <div key={item.month} className={`rounded-md border p-3 ${item.active ? "border-brand-blue bg-orange-50 dark:bg-orange-950/20" : ""}`}>
                    <div className="font-medium">{item.month}</div>
                    <div className="text-xs text-muted-foreground mt-1">{item.quarter}</div>
                    <div className="text-xs text-muted-foreground">{item.half}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {notifConfig.map((item) => (
                <div key={item.id} className="flex items-center justify-between border rounded-md p-3">
                  <span>{item.label}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">Email<Switch checked={item.email} onCheckedChange={(checked) => setNotifConfig((prev) => prev.map((n) => n.id === item.id ? { ...n, email: checked } : n))} /></label>
                    <label className="flex items-center gap-2 text-sm">In-app<Switch checked={item.inApp} onCheckedChange={(checked) => setNotifConfig((prev) => prev.map((n) => n.id === item.id ? { ...n, inApp: checked } : n))} /></label>
                  </div>
                </div>
              ))}
              <div className="max-w-[240px]"><Label>Frequency</Label><Select value={frequency} onValueChange={setFrequency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="immediate">Immediate</SelectItem><SelectItem value="daily">Daily Digest</SelectItem><SelectItem value="weekly">Weekly Summary</SelectItem></SelectContent></Select></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsible-owners">
          <Card>
            <CardHeader>
              <CardTitle>Responsible Owners Mapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Map one team to one or more responsible persons. This mapping drives visibility in Responsible Person Targets.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[280px] flex-1">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={responsibleTableSearch}
                    onChange={(e) => setResponsibleTableSearch(e.target.value)}
                    placeholder="Search team..."
                  />
                </div>
              </div>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.No.</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Total Members</TableHead>
                      <TableHead>Allocated Count</TableHead>
                      <TableHead>Assigned Persons</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponsibleTeams.map((team, index) => {
                      const assignedIds = draftResponsibleOwnersByTeamId[team.id] ?? []
                      const assignedNames = allResponsibleMembers
                        .filter((m) => assignedIds.includes(m.id))
                        .map((m) => m.name)
                      return (
                        <TableRow key={team.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell>{team.members.length}</TableCell>
                          <TableCell>{assignedIds.length}</TableCell>
                          <TableCell className="max-w-[340px]">
                            {assignedNames.length === 0 ? (
                              <span className="text-muted-foreground text-sm">No assigned persons</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {assignedNames.slice(0, 4).map((name) => (
                                  <Badge key={`${team.id}-${name}`} variant="outline">{name}</Badge>
                                ))}
                                {assignedNames.length > 4 ? <Badge variant="outline">+{assignedNames.length - 4}</Badge> : null}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setActiveTeamId(team.id)
                                setPendingAssignedIds(new Set(assignedIds))
                                setAvailableSearch("")
                                setAssignedSearch("")
                                setAssignDialogOpen(true)
                              }}
                            >
                              Assign Users
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredResponsibleTeams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No teams found.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="max-w-[1000px]">
              <DialogHeader>
                <DialogTitle>Assign Users</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_1fr] gap-4">
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-semibold">Available Users ({availableMembers.length})</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search" value={availableSearch} onChange={(e) => setAvailableSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[420px] overflow-auto space-y-1 border rounded-md p-2">
                    {availableMembers.map((member) => (
                      <div key={`avail-${member.id}`} className="flex items-center justify-between rounded-md border px-2 py-2 text-sm">
                        <span>{member.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingAssignedIds((prev) => new Set([...prev, member.id]))}
                        >
                          +
                        </Button>
                      </div>
                    ))}
                    {availableMembers.length === 0 ? <p className="text-xs text-muted-foreground p-2">No available users.</p> : null}
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center text-muted-foreground">↔</div>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-semibold">Assigned Users ({assignedMembers.length})</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search" value={assignedSearch} onChange={(e) => setAssignedSearch(e.target.value)} />
                  </div>
                  <div className="max-h-[420px] overflow-auto space-y-1 border rounded-md p-2">
                    {assignedMembers.map((member) => (
                      <div key={`assigned-${member.id}`} className="flex items-center justify-between rounded-md border px-2 py-2 text-sm">
                        <span>{member.name}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPendingAssignedIds((prev) => {
                              const next = new Set(prev)
                              next.delete(member.id)
                              return next
                            })
                          }
                        >
                          -
                        </Button>
                      </div>
                    ))}
                    {assignedMembers.length === 0 ? <p className="text-xs text-muted-foreground p-2">No assigned users.</p> : null}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Close</Button>
                <Button
                  onClick={() => {
                    if (!activeTeamId) return
                    const nextMapping = {
                      ...draftResponsibleOwnersByTeamId,
                      [activeTeamId]: [...pendingAssignedIds],
                    }
                    setDraftResponsibleOwnersByTeamId(nextMapping)
                    setResponsibleOwnersByTeamId(nextMapping)
                    setAssignDialogOpen(false)
                    toast({ title: "Assigned list updated", description: `${activeTeam?.name ?? "Team"} mapping updated.` })
                  }}
                >
                  Assign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Users &amp; Roles</CardTitle><Button onClick={() => setUserDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Add User</Button></CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Hierarchy Level</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[
                      ["Ahmed Al-Farsi", "ahmed@voltuswave.com", "Executive", "Active"],
                      ["Priya Nair", "priya@voltuswave.com", "Executive", "Active"],
                      ["Sara Al-Mutawa", "sara@voltuswave.com", "Team Lead", "Pending"],
                    ].map((row) => (
                      <TableRow key={row[1]}>
                        <TableCell className="sticky left-0 bg-background">{row[0]}</TableCell><TableCell>{row[1]}</TableCell><TableCell>{row[2]}</TableCell><TableCell>{row[3]}</TableCell><TableCell><Button variant="outline" size="sm">Edit</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>View KPIs</TableHead><TableHead>Edit KPIs</TableHead><TableHead>Set Targets</TableHead><TableHead>Enter Actuals</TableHead><TableHead>View Reports</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[
                      ["Leadership", true, true, true, false, true],
                      ["Manager", true, true, true, true, true],
                      ["Executive", true, false, false, true, true],
                    ].map((row) => (
                      <TableRow key={String(row[0])}>
                        <TableCell>{row[0]}</TableCell>
                        {row.slice(1).map((val, idx) => <TableCell key={idx}>{val ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-red-500" />}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}><DialogContent><DialogHeader><DialogTitle>Add User</DialogTitle></DialogHeader><div className="space-y-3"><Input placeholder="Name" /><Input placeholder="Email" type="email" /><Select><SelectTrigger><SelectValue placeholder="Hierarchy level" /></SelectTrigger><SelectContent>{hierarchyLevels.map((level) => <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>)}</SelectContent></Select><Button onClick={() => setUserDialogOpen(false)}>Save User</Button></div></DialogContent></Dialog>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <Select value={activityAction} onValueChange={setActivityAction}><SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger><SelectContent>{["all", "create", "update", "delete", "allocate", "distribute", "lock", "export"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {filteredActivity.length === 0 ? <p className="text-sm text-muted-foreground">No activity found for selected filters.</p> : filteredActivity.map((log) => (
                  <div key={log.id} className="rounded-md border p-3 flex items-start gap-3">
                    <span className="mt-0.5">{log.action === "create" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : log.action === "delete" ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Clock3 className="h-4 w-4 text-orange-600" />}</span>
                    <div className="text-sm">
                      <div>You {log.action}d {log.entity} {log.entityName}</div>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Notification Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <div key={n.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.description} · {format(new Date(n.timestamp), "dd MMM yyyy, hh:mm a")}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
