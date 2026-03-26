import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Copy, FileText, Pencil, Search, Trash2 } from "lucide-react"

import { toast } from "@/hooks/use-toast"
import { useTenantKpiItems } from "@/hooks/useTenantScope"
import { useAppStore } from "@/store/appStore"
import { useKPIStore } from "@/store/kpiStore"
import { DEFAULT_TENANT_ID, EMPTY_DEMO_TENANT_ID } from "@/lib/tenant"
import type { KPIStatus, KPICategory, ShipmentMode } from "@/types/kpi.types"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const categoryOptions = [
  "delivery",
  "operational",
  "customer",
  "financial",
  "compliance",
  "sustainability",
  "capacity",
] as const satisfies readonly KPICategory[]

const statusOptions = ["draft", "active", "archived"] as const satisfies readonly KPIStatus[]

const shipmentModeOptions = ["sea", "air", "road", "rail", "multimodal", "courier"] as const satisfies readonly ShipmentMode[]

function modePillClass(mode: ShipmentMode) {
  switch (mode) {
    case "sea":
      return "border-orange-200 bg-orange-50 text-orange-700"
    case "air":
      return "border-purple-200 bg-purple-50 text-purple-700"
    case "road":
      return "border-amber-200 bg-amber-50 text-amber-700"
    case "rail":
      return "border-brand-teal/30 bg-brand-teal/10 text-brand-teal"
    case "multimodal":
      return "border-orange-200 bg-orange-50 text-orange-700"
    case "courier":
      return "border-green-200 bg-green-50 text-green-700"
  }
}

function statusBadgeClass(status: KPIStatus) {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700"
    case "active":
      return "border-brand-blue/30 bg-orange-50 text-brand-blue"
    case "archived":
      return "border-slate-200 bg-slate-100 text-slate-500"
  }
}

export default function KPIItemsPage() {
  const navigate = useNavigate()

  const kpiItems = useTenantKpiItems()
  const currentTenantId = useAppStore((s) => s.currentTenantId)
  const setCurrentTenantId = useAppStore((s) => s.setCurrentTenantId)
  const addKPIItem = useKPIStore((s) => s.addKPIItem)
  const deleteKPIItem = useKPIStore((s) => s.deleteKPIItem)

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | KPICategory>("all")
  const [status, setStatus] = useState<"all" | KPIStatus>("all")
  const [mode, setMode] = useState<"all" | ShipmentMode>("all")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    // TODO: remove once API is connected
    const t = window.setTimeout(() => setLoading(false), 600)
    return () => window.clearTimeout(t)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return kpiItems.filter((item) => {
      const matchesQuery = q.length === 0 || item.kpiCode.toLowerCase().includes(q) || item.itemName.toLowerCase().includes(q) || item.definitionName.toLowerCase().includes(q)
      const matchesCategory = category === "all" || item.category === category
      const matchesStatus = status === "all" || item.statusId === status
      const matchesMode = mode === "all" || item.shipmentModes.includes(mode)
      return matchesQuery && matchesCategory && matchesStatus && matchesMode
    })
  }, [category, kpiItems, mode, query, status])

  const requestDelete = (id: string) => {
    setDeleteTargetId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteTargetId) return
    deleteKPIItem(deleteTargetId)
    toast({ title: "KPI item deleted", description: "The KPI item was removed successfully." })
    setDeleteDialogOpen(false)
    setDeleteTargetId(null)
  }

  const duplicateItem = (itemId: string) => {
    const item = kpiItems.find((i) => i.id === itemId)
    if (!item) return

    const nowIso = new Date().toISOString()
    const dup: typeof item = {
      ...item,
      id: crypto.randomUUID(),
      kpiCode: `${item.kpiCode}-COPY`,
      itemName: `${item.itemName} Copy`,
      statusId: "draft",
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    addKPIItem(dup)
    toast({ title: "KPI duplicated", description: "A new draft copy was created." })
  }

  return (
    loading ? (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-20" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-3 w-20" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-3 w-16" />
                    </TableHead>
                    <TableHead>
                      <Skeleton className="h-3 w-14" />
                    </TableHead>
                    <TableHead className="w-[180px]">
                      <Skeleton className="h-3 w-24" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-9 w-9 rounded-md" />
                          <Skeleton className="h-9 w-9 rounded-md" />
                          <Skeleton className="h-9 w-9 rounded-md" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    ) : (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-blue">KPI Items</h2>
          <p className="text-sm text-muted-foreground">Manage performance indicators</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/kpi-items/new")}>
            New KPI Item
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="search">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder="Search by code, name, or definition"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <Select value={category} onValueChange={(val) => setCategory(val as typeof category)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(val) => setStatus(val as typeof status)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mode</label>
              <Select value={mode} onValueChange={(val) => setMode(val as typeof mode)}>
                <SelectTrigger>
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {shipmentModeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        kpiItems.length === 0 && currentTenantId === EMPTY_DEMO_TENANT_ID ? (
          <EmptyState
            icon={FileText}
            title="No KPI items in Empty org"
            description="Sample freight KPIs are stored under Demo Freight Co. Switch organization in the header, or open the demo tenant here."
            action={{ label: "Open Demo Freight Co.", onClick: () => setCurrentTenantId(DEFAULT_TENANT_ID) }}
            secondaryAction={{ label: "New KPI Item", onClick: () => navigate("/kpi-items/new") }}
          />
        ) : kpiItems.length > 0 ? (
          <EmptyState
            icon={FileText}
            title="No matching KPI items"
            description="Nothing matches your search or filters. Try clearing filters."
            action={{
              label: "Clear filters",
              onClick: () => {
                setQuery("")
                setCategory("all")
                setStatus("all")
                setMode("all")
              },
            }}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No KPI items yet"
            description="Create your first KPI item to start building templates."
            action={{ label: "Create your first KPI item", onClick: () => navigate("/kpi-items/new") }}
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI Code</TableHead>
                    <TableHead>KPI Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Modes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                            <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{item.kpiCode}</span>
                      </TableCell>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="capitalize">{item.category}</TableCell>
                      <TableCell className="capitalize">{item.unitType}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {item.shipmentModes.map((m) => (
                            <span
                              key={m}
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
                                modePillClass(m),
                              )}
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize",
                            statusBadgeClass(item.statusId),
                          )}
                        >
                          <span
                            className={cn("mr-1 h-1.5 w-1.5 rounded-full bg-current", item.statusId === "draft" ? "animate-pulse" : "opacity-70")}
                            aria-hidden="true"
                          />
                          {item.statusId}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit"
                            onClick={() => navigate("/kpi-items/new")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Duplicate"
                            onClick={() => duplicateItem(item.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => requestDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI item?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The KPI item will be removed from the KPI Items list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    )
  )
}
