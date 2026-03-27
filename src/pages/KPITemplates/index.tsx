import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Copy, Trash2, Layers, LayoutGrid, List } from "lucide-react"

import { toast } from "@/hooks/use-toast"
import { useTenantKpiTemplates } from "@/hooks/useTenantScope"
import { useAppStore } from "@/store/appStore"
import { useKPIStore } from "@/store/kpiStore"
import { DEFAULT_TENANT_ID, EMPTY_DEMO_TENANT_ID } from "@/lib/tenant"
import type { KPITemplate, KPIStatus, PeriodType, ShipmentMode, UserRole } from "@/types/kpi.types"

import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const roleLabels: Record<UserRole, string> = {
  "pricing-exec": "Pricing Executive",
  "pricing-mgr": "Pricing Manager",
  "ops-exec": "Ops Executive",
  "ops-mgr": "Ops Manager",
  "senior-mgmt": "Senior Management",
  "branch-head": "Branch Head",
  leadership: "Leadership",
  "sales-manager": "Sales Manager",
  "sales-lead": "Sales Lead",
  "sales-executive": "Sales Executive",
}

const statusLabels: Record<KPIStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
}

function periodLabel(p: PeriodType) {
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function shipmentModePillClass(mode: ShipmentMode) {
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

function weightIndicatorClass(total: number) {
  if (total === 100) return "bg-brand-teal"
  if (total < 100) return "bg-brand-amber"
  return "bg-brand-red"
}

function weightBadgeClass(total: number) {
  if (total === 100) return "text-brand-teal"
  if (total < 100) return "text-brand-amber"
  return "text-brand-red"
}

export default function KPITemplatesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const templates = useTenantKpiTemplates()
  const currentTenantId = useAppStore((s) => s.currentTenantId)
  const setCurrentTenantId = useAppStore((s) => s.setCurrentTenantId)
  const addTemplate = useKPIStore((s) => s.addTemplate)
  const deleteTemplate = useKPIStore((s) => s.deleteTemplate)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [changelogTemplate, setChangelogTemplate] = useState<KPITemplate | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    // TODO: remove once API is connected
    const t = window.setTimeout(() => setLoading(false), 600)
    return () => window.clearTimeout(t)
  }, [])

  const onRequestDelete = (id: string) => {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!deleteId) return
    deleteTemplate(deleteId)
    toast({ title: "Template deleted", description: "The KPI template was removed." })
    setDeleteOpen(false)
    setDeleteId(null)
  }

  const duplicateTemplate = (template: KPITemplate) => {
    const nowIso = new Date().toISOString()
    const copy: KPITemplate = {
      ...template,
      id: crypto.randomUUID(),
      templateName: `Copy of ${template.templateName}`,
      templateCode: `${template.templateCode}-2`,
      statusId: "draft",
      createdAt: nowIso,
      kpiItems: template.kpiItems.map((it) => ({ ...it })),
      version: 1,
      lastUpdatedAt: nowIso,
      lastUpdatedBy: "Current User",
      changelog: [{ version: 1, date: nowIso, changedBy: "Current User", changes: "Template duplicated from existing template." }],
    }
    addTemplate(copy)
    toast({ title: "Template duplicated", description: "Template duplicated. You are now editing the copy." })
    navigate(`/kpi-templates/new?edit=${copy.id}`)
  }

  const categories = ["all", "sales", "operations", "financial", "hr", "customer", "compliance"] as const
  const selectedCategory = (searchParams.get("category") ?? "all").toLowerCase()
  const categoryCounts = useMemo(
    () =>
      categories.reduce<Record<string, number>>((acc, category) => {
        acc[category] =
          category === "all"
            ? templates.length
            : templates.filter((t) => t.category.toLowerCase().includes(category)).length
        return acc
      }, {}),
    [templates],
  )

  const cardData = useMemo(() => {
    if (selectedCategory === "all") return templates
    return templates.filter((t) => t.category.toLowerCase().includes(selectedCategory))
  }, [selectedCategory, templates])

  const comparedTemplates = templates.filter((t) => compareIds.includes(t.id))

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Skeleton className="h-8 w-56" />
              <Skeleton className="mt-2 h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="mt-2 h-4 w-40" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="h-4 w-60" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {!loading ? (
      <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-brand-blue">KPI Templates</h2>
          <p className="text-sm text-muted-foreground">Configure scorecards and KPI item sets</p>
        </div>
        <Button onClick={() => navigate("/kpi-templates/new")}>
          New Template
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            onClick={() => {
              const next = new URLSearchParams(searchParams)
              next.set("category", category)
              setSearchParams(next)
            }}
          >
            {category === "all" ? "All" : category.charAt(0).toUpperCase() + category.slice(1)} ({categoryCounts[category] ?? 0})
          </Button>
        ))}
        <div className="ml-auto inline-flex items-center rounded-md border bg-white p-0.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("h-8 px-2", viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-600")}
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            title="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn("h-8 px-2", viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-600")}
            onClick={() => setViewMode("list")}
            aria-label="List view"
            title="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {compareIds.length === 2 ? (
        <div className="flex justify-end">
          <Button onClick={() => setCompareOpen(true)}>Compare Selected</Button>
        </div>
      ) : null}

      {cardData.length === 0 ? (
        templates.length === 0 && currentTenantId === EMPTY_DEMO_TENANT_ID ? (
          <EmptyState
            icon={Layers}
            title="No templates in Empty org"
            description="Sample templates are under Demo Freight Co. Switch organization in the header or open the demo tenant here."
            action={{ label: "Open Demo Freight Co.", onClick: () => setCurrentTenantId(DEFAULT_TENANT_ID) }}
            secondaryAction={{ label: "New Template", onClick: () => navigate("/kpi-templates/new") }}
          />
        ) : templates.length > 0 ? (
          <EmptyState
            icon={Layers}
            title="No templates in this category"
            description="Try choosing All or another category."
            action={{
              label: "Show all categories",
              onClick: () => {
                const next = new URLSearchParams(searchParams)
                next.set("category", "all")
                setSearchParams(next)
              },
            }}
          />
        ) : (
          <EmptyState
            icon={Layers}
            title="No templates yet"
            description="Create your first KPI template."
            action={{ label: "New Template", onClick: () => navigate("/kpi-templates/new") }}
          />
        )
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cardData.map((t) => {
            const weightTotal = t.kpiItems.reduce((sum, it) => sum + it.weight, 0)
            const weightClamped = Math.max(0, Math.min(100, weightTotal))
            const modes = t.shipmentModes
            const maxModes = 3
            const shownModes = modes.slice(0, maxModes)
            const remainingModes = Math.max(0, modes.length - shownModes.length)

            const status = t.statusId
            const statusClass =
              status === "active"
                ? "border-brand-blue/30 bg-orange-50 text-brand-blue"
                : status === "draft"
                  ? "border-slate-200 bg-slate-50 text-slate-700"
                  : "border-slate-200 bg-slate-100 text-slate-500"

            return (
              <Card
                key={t.id}
                className="cursor-pointer transition-shadow duration-150 hover:shadow-md"
                onClick={() => navigate(`/kpi-templates/new?edit=${t.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">{t.templateName}</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-100 text-muted-foreground px-1.5 py-0.5 rounded">
                          {t.templateCode}
                        </span>
                      </CardDescription>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          title={`Last updated: ${t.lastUpdatedAt ? new Date(t.lastUpdatedAt).toLocaleString() : "N/A"} by ${t.lastUpdatedBy ?? "Unknown"}`}
                        >
                          v{t.version ?? 1}
                        </Badge>
                        <button
                          type="button"
                          className="text-xs text-brand-blue underline underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            setChangelogTemplate(t)
                          }}
                        >
                          View changelog
                        </button>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("border-0", statusClass)}>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mr-2 inline-block h-1.5 w-1.5 rounded-full bg-current",
                          status === "draft" ? "animate-pulse" : "opacity-70",
                        )}
                      />
                      {statusLabels[status]}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {(t.applicableRoles ?? []).map((role) => (
                      <Badge key={`${t.id}-${role}`} variant="outline" className="border-brand-blue/30 bg-orange-50 text-brand-blue">
                        {roleLabels[role] ?? String(role)}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                      {periodLabel(t.periodType)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {shownModes.map((m) => (
                      <Badge key={m} variant="outline" className={cn(shipmentModePillClass(m), "border-0")}>
                        {m}
                      </Badge>
                    ))}
                    {remainingModes > 0 ? (
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                        +{remainingModes} more
                      </Badge>
                    ) : null}
                  </div>

                  <div className="text-sm text-muted-foreground">{t.kpiItems.length} KPI Items</div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-sm font-medium", weightBadgeClass(weightTotal))}>
                        Weight completion
                      </span>
                      <span className={cn("font-mono text-sm font-semibold", weightBadgeClass(weightTotal))}>
                        {weightTotal}%
                      </span>
                    </div>
                    <Progress
                      value={weightClamped}
                      indicatorClassName={weightIndicatorClass(weightTotal)}
                    />
                  </div>

                  <Separator />
                </CardContent>

                <CardFooter className="flex flex-col gap-2">
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); duplicateTemplate(t) }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Delete"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); onRequestDelete(t.id) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={compareIds.includes(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={(checked) => {
                          setCompareIds((prev) => {
                            if (checked) {
                              if (prev.includes(t.id)) return prev
                              if (prev.length >= 2) return prev
                              return [...prev, t.id]
                            }
                            return prev.filter((id) => id !== t.id)
                          })
                        }}
                      />
                      Compare
                    </label>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); navigate("/template-allocation") }}>
                    Allocate →
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>KPI Items</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardData.map((t) => {
                    const weightTotal = t.kpiItems.reduce((sum, it) => sum + it.weight, 0)
                    const statusClass =
                      t.statusId === "active"
                        ? "border-brand-blue/30 bg-orange-50 text-brand-blue"
                        : t.statusId === "draft"
                          ? "border-slate-200 bg-slate-50 text-slate-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                    return (
                      <TableRow
                        key={`list-${t.id}`}
                        className="cursor-pointer"
                        onClick={() => navigate(`/kpi-templates/new?edit=${t.id}`)}
                      >
                        <TableCell className="font-medium">{t.templateName}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-slate-100 text-muted-foreground px-1.5 py-0.5 rounded">
                            {t.templateCode}
                          </span>
                        </TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell>{periodLabel(t.periodType)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-0", statusClass)}>
                            {statusLabels[t.statusId]}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.kpiItems.length}</TableCell>
                        <TableCell className={cn("font-mono", weightBadgeClass(weightTotal))}>{weightTotal}%</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Duplicate"
                              onClick={(e) => { e.stopPropagation(); duplicateTemplate(t) }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label="Delete"
                              className="border-red-200 text-red-700 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); onRequestDelete(t.id) }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      ) : null}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this KPI template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be removed from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!changelogTemplate} onOpenChange={(open) => !open && setChangelogTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template changelog</DialogTitle>
            <DialogDescription>{changelogTemplate?.templateName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(changelogTemplate?.changelog ?? []).map((entry) => (
              <div key={`${entry.version}-${entry.date}`} className="rounded border p-2 text-sm">
                <div className="font-medium">
                  v{entry.version} - {new Date(entry.date).toLocaleString()}
                </div>
                <div className="text-muted-foreground">By {entry.changedBy}</div>
                <div>{entry.changes}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template comparison</DialogTitle>
            <DialogDescription>Compare two templates side by side.</DialogDescription>
          </DialogHeader>
          {comparedTemplates.length === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {comparedTemplates.map((tpl) => (
                  <Card key={`header-${tpl.id}`}>
                    <CardContent className="pt-4 text-sm">
                      <div className="font-semibold">{tpl.templateName}</div>
                      <div>Roles: {(tpl.applicableRoles ?? []).map((r) => roleLabels[r] ?? r).join(", ")}</div>
                      <div>Period: {periodLabel(tpl.periodType)}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{comparedTemplates[0].templateName}</TableHead>
                    <TableHead>KPI Name</TableHead>
                    <TableHead>{comparedTemplates[1].templateName}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(
                    new Set([...comparedTemplates[0].kpiItems.map((k) => k.kpiName), ...comparedTemplates[1].kpiItems.map((k) => k.kpiName)]),
                  ).map((name) => {
                    const left = comparedTemplates[0].kpiItems.find((k) => k.kpiName === name)
                    const right = comparedTemplates[1].kpiItems.find((k) => k.kpiName === name)
                    const weightDiff = (left?.weight ?? 0) !== (right?.weight ?? 0)
                    return (
                      <TableRow key={`cmp-${name}`}>
                        <TableCell className={cn(weightDiff ? "text-brand-red font-semibold" : "")}>{left ? `${left.weight}%` : "-"}</TableCell>
                        <TableCell>{name}</TableCell>
                        <TableCell className={cn(weightDiff ? "text-brand-red font-semibold" : "")}>{right ? `${right.weight}%` : "-"}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-2">
                <Button onClick={() => navigate(`/kpi-templates/new?edit=${comparedTemplates[0].id}`)}>Use Template A</Button>
                <Button variant="outline" onClick={() => navigate(`/kpi-templates/new?edit=${comparedTemplates[1].id}`)}>
                  Use Template B
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
