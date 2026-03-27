import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { useNavigate, useSearchParams } from "react-router-dom"
import {
  Eye,
  GripVertical,
  Layers,
  Plus,
  Search,
  ArrowDown,
  ArrowUp,
  X,
} from "lucide-react"

import { toast } from "@/hooks/use-toast"
import { useTenantKpiTemplates, useTenantKpiItems } from "@/hooks/useTenantScope"
import { DEFAULT_TENANT_ID } from "@/lib/tenant"
import { useAppStore } from "@/store/appStore"
import { useKPIStore } from "@/store/kpiStore"
import type {
  KPIItem,
  BusinessScope,
  KPIStatus,
  KPITemplate,
  PeriodType,
  ShipmentMode,
  TemplateKPIItem,
  UnitType,
  UserRole,
} from "@/types/kpi.types"
import { cn } from "@/lib/utils"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type StatusPill = "draft" | "active"

const statusOptions = ["draft", "active"] as const satisfies readonly StatusPill[]
const periodTypeOptions = ["annual", "quarterly", "monthly", "weekly", "daily"] as const satisfies readonly PeriodType[]
const businessScopeOptions = ["freight", "corporate"] as const satisfies readonly BusinessScope[]

const shipmentModePills = [
  { value: "sea" as const, label: "Sea", color: { border: "border-orange-200", bg: "bg-orange-600", text: "text-white" } },
  { value: "air" as const, label: "Air", color: { border: "border-purple-200", bg: "bg-purple-600", text: "text-white" } },
  { value: "road" as const, label: "Road", color: { border: "border-amber-200", bg: "bg-amber-500", text: "text-black" } },
  { value: "rail" as const, label: "Rail", color: { border: "border-brand-teal/30", bg: "bg-brand-teal", text: "text-white" } },
  { value: "multimodal" as const, label: "Multi-modal", color: { border: "border-orange-200", bg: "bg-orange-500", text: "text-white" } },
] as const

type PillOption<T extends string> = {
  value: T
  label: string
  color: { border: string; bg: string; text: string }
}

const templateCategoryOptions = [
  "Sales Performance",
  "Operations",
  "Customer Service",
  "Finance",
  "Compliance",
] as const

const applicableRoleOptions = [
  { value: "leadership" as const, label: "Leadership" },
  { value: "branch-head" as const, label: "Branch Head" },
  { value: "sales-manager" as const, label: "Sales Manager" },
  { value: "sales-lead" as const, label: "Sales Lead" },
  { value: "sales-executive" as const, label: "Sales Executive" },
] as const

const unitTypeOptions = [
  "percentage",
  "number",
  "currency",
  "days",
  "hours",
  "teu",
  "cbm",
  "tonnes",
  "score",
  "ratio",
] as const satisfies readonly UnitType[]

const templateKpiItemSchema = z.object({
  kpiItemId: z.string().min(1),
  kpiCode: z.string().min(1),
  kpiName: z.string().min(1),
  unitType: z.enum(unitTypeOptions),
  weight: z.number().min(0).max(100),
  displayOrder: z.number().int().min(1),
})

const templateSchema = z
  .object({
    templateName: z.string().min(3, "Template name is required"),
    templateCode: z.string().min(3, "Template code is required"),
    category: z.enum(templateCategoryOptions),
    businessScope: z.enum(businessScopeOptions),
    applicableRoles: z.array(z.enum(applicableRoleOptions.map((o) => o.value) as [UserRole, ...UserRole[]])).min(1, "Select at least one role"),
    shipmentModes: z.array(z.enum(shipmentModePills.map((o) => o.value) as ShipmentMode[])),
    periodType: z.enum(periodTypeOptions),
    description: z.string().min(5, "Description is required"),
    statusId: z.enum(statusOptions),
    kpiItems: z.array(templateKpiItemSchema),
  })
  .superRefine((data, ctx) => {
    if (data.businessScope === "freight" && data.shipmentModes.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one mode",
        path: ["shipmentModes"],
      })
    }
    const weightTotal = data.kpiItems.reduce((sum, item) => sum + item.weight, 0)
    if (data.statusId === "active") {
      if (data.kpiItems.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least 1 KPI item to activate the template",
          path: ["kpiItems"],
        })
      }
      if (weightTotal !== 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total weight must equal 100%",
          path: ["kpiItems"],
        })
      }
    }
  })

type FormData = z.infer<typeof templateSchema>

function normalizeTemplateCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

function generateTemplateCodeFromName(name: string) {
  const words = name.match(/[A-Za-z0-9]+/g) ?? []
  const initials = words
    .map((w) => w.trim().charAt(0))
    .filter((c) => c.length > 0)
    .map((c) => c.toUpperCase())
  const base = initials.length > 0 ? initials.join("-") : "TMPL"
  return `${base}-TMPL`
}

function roleLabel(role: UserRole) {
  return applicableRoleOptions.find((o) => o.value === role)?.label ?? String(role)
}

function progressIndicatorClassByTotal(total: number) {
  if (total === 100) return "bg-brand-teal"
  if (total < 100) return "bg-brand-amber"
  return "bg-brand-red"
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function MultiPillSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T[]
  options: PillOption<T>[]
  onChange: (next: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (selected) onChange(value.filter((v) => v !== opt.value))
              else onChange([...value, opt.value])
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selected
                ? `${opt.color.bg} ${opt.color.text} border-transparent`
                : `${opt.color.border} bg-white text-slate-700 hover:bg-slate-50`,
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const AVAILABLE_KPI_ITEMS_FALLBACK_BASE: Omit<KPIItem, "tenantId">[] = [
  {
    id: "seed-otd-sea",
    definitionName: "On-Time Delivery Performance",
    kpiCode: "OTD-SEA",
    itemName: "On-Time Delivery %",
    category: "delivery",
    description: "Percentage of on-time deliveries for Sea shipments",
    shipmentModes: ["sea"],
    tradeDirections: ["import", "export"],
    jobType: "Operations",
    regionScope: "Global",
    unitType: "percentage",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "higher-better",
    dataSource: "TMS",
    thresholds: { green: { min: 95, max: 100 }, amber: { min: 90, max: 94.99 }, red: { min: 0, max: 89.99 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-rev-tot",
    definitionName: "Total Revenue",
    kpiCode: "REV-TOT",
    itemName: "Total Revenue",
    category: "financial",
    description: "Total revenue across all trade directions",
    shipmentModes: ["sea", "air", "road", "rail", "multimodal", "courier"],
    tradeDirections: ["import", "export"],
    jobType: "Finance",
    regionScope: "Global",
    unitType: "currency",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Sum",
    trendDirection: "higher-better",
    dataSource: "ERP",
    thresholds: { green: { min: 0, max: 100 }, amber: { min: 0, max: 0 }, red: { min: 0, max: 0 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["pricing-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-qte-cnv",
    definitionName: "Quote Conversion Rate",
    kpiCode: "QTE-CNV",
    itemName: "Quote Conversion Rate",
    category: "customer",
    description: "Conversion rate from quotes to confirmed bookings",
    shipmentModes: ["multimodal"],
    tradeDirections: ["import", "export"],
    jobType: "Sales",
    regionScope: "Global",
    unitType: "percentage",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "higher-better",
    dataSource: "CRM",
    thresholds: { green: { min: 20, max: 100 }, amber: { min: 15, max: 19.99 }, red: { min: 0, max: 14.99 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["branch-head"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-shp-vol",
    definitionName: "Shipment Volume",
    kpiCode: "SHP-VOL",
    itemName: "Shipment Volume",
    category: "operational",
    description: "Total shipment volume",
    shipmentModes: ["sea", "rail", "road", "air"],
    tradeDirections: ["import", "export"],
    jobType: "Operations",
    regionScope: "Global",
    unitType: "teu",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Sum",
    trendDirection: "higher-better",
    dataSource: "TMS",
    thresholds: { green: { min: 0, max: 100 }, amber: { min: 0, max: 0 }, red: { min: 0, max: 0 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["ops-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-cst-sat",
    definitionName: "Customer Satisfaction",
    kpiCode: "CST-SAT",
    itemName: "Customer Satisfaction",
    category: "customer",
    description: "Average customer satisfaction score",
    shipmentModes: ["courier", "multimodal"],
    tradeDirections: ["import", "export"],
    jobType: "Customer Service",
    regionScope: "Global",
    unitType: "score",
    calculationType: "manual",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "higher-better",
    dataSource: "CRM",
    thresholds: { green: { min: 8, max: 10 }, amber: { min: 6, max: 7.99 }, red: { min: 0, max: 5.99 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-trn-tim",
    definitionName: "Transit Time Average",
    kpiCode: "TRN-TIM",
    itemName: "Transit Time Average",
    category: "operational",
    description: "Average transit time",
    shipmentModes: ["sea", "air", "road", "rail"],
    tradeDirections: ["import", "export"],
    jobType: "Operations",
    regionScope: "Global",
    unitType: "days",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "lower-better",
    dataSource: "TMS",
    thresholds: { green: { min: 0, max: 2 }, amber: { min: 2.01, max: 4 }, red: { min: 4.01, max: 30 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-inv-acc",
    definitionName: "Invoice Accuracy",
    kpiCode: "INV-ACC",
    itemName: "Invoice Accuracy",
    category: "financial",
    description: "Invoice accuracy percentage",
    shipmentModes: ["sea", "air", "road", "rail", "multimodal"],
    tradeDirections: ["import", "export"],
    jobType: "Finance",
    regionScope: "Global",
    unitType: "percentage",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "higher-better",
    dataSource: "ERP",
    thresholds: { green: { min: 98, max: 100 }, amber: { min: 95, max: 97.99 }, red: { min: 0, max: 94.99 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["pricing-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-crg-clm",
    definitionName: "Cargo Claims Rate",
    kpiCode: "CRG-CLM",
    itemName: "Cargo Claims Rate",
    category: "compliance",
    description: "Cargo claims rate percentage",
    shipmentModes: ["sea", "air", "road", "rail", "multimodal"],
    tradeDirections: ["import", "export"],
    jobType: "Compliance",
    regionScope: "Global",
    unitType: "percentage",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "lower-better",
    dataSource: "Compliance",
    thresholds: { green: { min: 0, max: 2 }, amber: { min: 2.01, max: 5 }, red: { min: 5.01, max: 30 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-rev-sea",
    definitionName: "Sea Revenue Target",
    kpiCode: "REV-SEA",
    itemName: "Sea Revenue Target",
    category: "financial",
    description: "Target revenue for Sea shipments",
    shipmentModes: ["sea"],
    tradeDirections: ["import", "export"],
    jobType: "Finance",
    regionScope: "Global",
    unitType: "currency",
    calculationType: "auto",
    periodType: "annual",
    aggregation: "Sum",
    trendDirection: "higher-better",
    dataSource: "ERP",
    thresholds: { green: { min: 0, max: 100 }, amber: { min: 0, max: 0 }, red: { min: 0, max: 0 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["pricing-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "seed-fcl-vol",
    definitionName: "FCL Volume",
    kpiCode: "FCL-VOL",
    itemName: "FCL Volume",
    category: "operational",
    description: "FCL shipment volume",
    shipmentModes: ["sea"],
    tradeDirections: ["import", "export"],
    jobType: "Operations",
    regionScope: "Global",
    unitType: "teu",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Sum",
    trendDirection: "higher-better",
    dataSource: "TMS",
    thresholds: { green: { min: 0, max: 100 }, amber: { min: 0, max: 0 }, red: { min: 0, max: 0 } },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const AVAILABLE_KPI_ITEMS_FALLBACK: KPIItem[] = AVAILABLE_KPI_ITEMS_FALLBACK_BASE.map((x) => ({
  ...x,
  tenantId: DEFAULT_TENANT_ID,
}))

export default function TemplateForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get("edit")
  const currentTenantId = useAppStore((s) => s.currentTenantId)

  // Use separate selectors to keep references stable and avoid render loops.
  const storeKpiItems = useTenantKpiItems()
  const kpiTemplates = useTenantKpiTemplates()
  const addTemplate = useKPIStore((s) => s.addTemplate)
  const updateTemplate = useKPIStore((s) => s.updateTemplate)

  const [codeLocked, setCodeLocked] = useState(true)

  const form = useForm<FormData>({
    resolver: zodResolver(templateSchema),
    mode: "onChange",
    defaultValues: {
      templateName: "",
      templateCode: "",
      category: "Operations",
      businessScope: "freight",
      applicableRoles: ["leadership"],
      shipmentModes: ["sea"],
      periodType: "annual",
      description: "",
      statusId: "draft",
      kpiItems: [],
    },
  })

  const { setValue, control, handleSubmit, reset } = form

  useEffect(() => {
    if (!editId) return
    const t = kpiTemplates.find((x) => x.id === editId)
    if (!t) return

    reset({
      templateName: t.templateName,
      templateCode: t.templateCode,
      category: t.category as FormData["category"],
      businessScope: t.businessScope ?? "freight",
      applicableRoles: t.applicableRoles ?? ["leadership"],
      shipmentModes: t.shipmentModes,
      periodType: t.periodType,
      description: t.description,
      statusId: (t.statusId === "active" ? "active" : "draft") as StatusPill,
      kpiItems: t.kpiItems.map((it) => ({
        kpiItemId: it.kpiItemId,
        kpiCode: it.kpiCode,
        kpiName: it.kpiName,
        unitType: it.unitType,
        weight: it.weight,
        displayOrder: it.displayOrder,
      })),
    })
    setCodeLocked(true)
  }, [editId, kpiTemplates, reset])

  const watchedKpiItems = useWatch({ control, name: "kpiItems" })
  const shipmentModes = useWatch({ control, name: "shipmentModes" })
  const templateCode = useWatch({ control, name: "templateCode" })
  const statusId = useWatch({ control, name: "statusId" })
  const templateName = useWatch({ control, name: "templateName" })
  const businessScope = useWatch({ control, name: "businessScope" })
  const applicableRoles = useWatch({ control, name: "applicableRoles" })
  const periodType = useWatch({ control, name: "periodType" })

  const templateWeightTotal = useMemo(() => watchedKpiItems.reduce((sum, item) => sum + item.weight, 0), [watchedKpiItems])

  const effectiveKpiItems = useMemo(() => {
    const byCode = new Map<string, KPIItem>()
    for (const item of storeKpiItems) byCode.set(item.kpiCode, item)
    if (currentTenantId === DEFAULT_TENANT_ID) {
      for (const seed of AVAILABLE_KPI_ITEMS_FALLBACK) {
        if (!byCode.has(seed.kpiCode)) byCode.set(seed.kpiCode, seed)
      }
    }
    return Array.from(byCode.values())
  }, [storeKpiItems, currentTenantId])

  const [searchQuery, setSearchQuery] = useState("")

  const availableAdded = useMemo(() => {
    return new Set(watchedKpiItems.map((it) => it.kpiItemId))
  }, [watchedKpiItems])

  const availableFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const byScope = effectiveKpiItems.filter((i) => (i.businessScope ?? "freight") === businessScope)
    if (q.length === 0) return byScope
    return byScope.filter((i) => i.kpiCode.toLowerCase().includes(q) || i.itemName.toLowerCase().includes(q) || i.definitionName.toLowerCase().includes(q))
  }, [businessScope, effectiveKpiItems, searchQuery])

  const shipmentModeOptions = useMemo(() => {
    return shipmentModePills.map((o) => ({ value: o.value, label: o.label, color: o.color })) as unknown as PillOption<ShipmentMode>[]
  }, [])

  const periodBadgeClass = "border-slate-200 bg-slate-50 text-slate-700"
  const roleBadgeClass = "border-brand-blue/30 bg-orange-50 text-brand-blue"

  const codeNormalizedPreview = useMemo(() => (templateCode ? normalizeTemplateCode(templateCode) : "-"), [templateCode])

  const addKpiToTemplate = (item: KPIItem) => {
    const already = watchedKpiItems.some((i) => i.kpiItemId === item.id)
    if (already) return

    const nextDisplayOrder = watchedKpiItems.length + 1
    const next: TemplateKPIItem[] = [
      ...watchedKpiItems,
      {
        kpiItemId: item.id,
        kpiCode: item.kpiCode,
        kpiName: item.itemName,
        unitType: item.unitType,
        weight: 0,
        displayOrder: nextDisplayOrder,
      },
    ]

    setValue("kpiItems", next, { shouldValidate: true })
  }

  const removeKpiFromTemplate = (kpiItemId: string) => {
    const next = watchedKpiItems
      .filter((i) => i.kpiItemId !== kpiItemId)
      .map((it, idx) => ({ ...it, displayOrder: idx + 1 }))
    setValue("kpiItems", next, { shouldValidate: true })
  }

  const updateKpiItemWeight = (kpiItemId: string, weight: number) => {
    const next = watchedKpiItems.map((it) => (it.kpiItemId === kpiItemId ? { ...it, weight } : it))
    setValue("kpiItems", next, { shouldValidate: true })
  }

  const autoDistribute = () => {
    const count = watchedKpiItems.length
    if (count === 0) return

    const base = Math.floor(100 / count)
    const remainder = 100 - base * count

    const next = watchedKpiItems.map((it, idx) => ({
      ...it,
      weight: idx === 0 ? base + remainder : base,
    }))

    setValue("kpiItems", next, { shouldValidate: true })
  }

  const [weightMode, setWeightMode] = useState<"equal" | "priority" | "custom">("equal")
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [priorityItems, setPriorityItems] = useState<TemplateKPIItem[]>([])
  const [draggedPriorityId, setDraggedPriorityId] = useState<string | null>(null)
  const [customPreset, setCustomPreset] = useState<Record<string, number>>({})

  useEffect(() => {
    setPriorityItems(watchedKpiItems.slice().sort((a, b) => a.displayOrder - b.displayOrder))
    setCustomPreset(Object.fromEntries(watchedKpiItems.map((it) => [it.kpiItemId, it.weight])))
  }, [watchedKpiItems])

  useEffect(() => {
    if (businessScope === "corporate") {
      if (shipmentModes.length > 0) {
        setValue("shipmentModes", [], { shouldValidate: true })
      }
      return
    }
    if (shipmentModes.length === 0) {
      setValue("shipmentModes", ["sea"], { shouldValidate: true })
    }
  }, [businessScope, setValue, shipmentModes])

  const applyPriorityWeights = () => {
    const fixed = [30, 25, 20, 15, 10]
    const remainingCount = Math.max(0, priorityItems.length - fixed.length)
    const remainingWeight = 100 - fixed.reduce((sum, n) => sum + n, 0)
    const perRemaining = remainingCount > 0 ? Math.floor(remainingWeight / remainingCount) : 0
    const remainder = remainingCount > 0 ? remainingWeight - perRemaining * remainingCount : 0
    const next = priorityItems.map((it, index) => {
      if (index < fixed.length) return { ...it, weight: fixed[index] ?? 0, displayOrder: index + 1 }
      const extra = index === fixed.length ? remainder : 0
      return { ...it, weight: perRemaining + extra, displayOrder: index + 1 }
    })
    setValue("kpiItems", next, { shouldValidate: true })
    setPriorityOpen(false)
  }

  const customPresetTotal = useMemo(
    () => watchedKpiItems.reduce((sum, it) => sum + (customPreset[it.kpiItemId] ?? 0), 0),
    [customPreset, watchedKpiItems],
  )

  const applyCustomPreset = () => {
    const next = watchedKpiItems.map((it, idx) => ({
      ...it,
      weight: customPreset[it.kpiItemId] ?? 0,
      displayOrder: idx + 1,
    }))
    setValue("kpiItems", next, { shouldValidate: true })
    setCustomOpen(false)
  }

  const submitTemplate = (mode: StatusPill) => {
    setValue("statusId", mode, { shouldValidate: true })
    void handleSubmit((values) => {
      const nowIso = new Date().toISOString()

      const existing = editId ? kpiTemplates.find((x) => x.id === editId) : undefined

      const payload: KPITemplate = {
        id: editId ?? crypto.randomUUID(),
        tenantId: existing?.tenantId ?? currentTenantId,
        templateName: values.templateName,
        templateCode: normalizeTemplateCode(values.templateCode),
        category: values.category,
        businessScope: values.businessScope,
        applicableRoles: values.applicableRoles,
        shipmentModes: values.businessScope === "corporate" ? [] : values.shipmentModes,
        periodType: values.periodType,
        description: values.description,
        statusId: mode as KPIStatus,
        kpiItems: values.kpiItems.map((it) => ({ ...it })),
        createdAt: editId ? (existing?.createdAt ?? nowIso) : nowIso,
      }
      const previousVersion = existing?.version ?? 1
      const wasActive = existing?.statusId === "active"
      const nextVersion = mode === "active" ? (wasActive ? previousVersion + 1 : previousVersion) : previousVersion
      payload.version = nextVersion
      payload.lastUpdatedAt = nowIso
      payload.lastUpdatedBy = "Current User"
      payload.changelog = [
        ...(existing?.changelog ?? []),
        {
          version: nextVersion,
          date: nowIso,
          changedBy: "Current User",
          changes: mode === "active" ? "Saved in active mode." : "Saved in draft mode.",
        },
      ]

      if (editId) {
        updateTemplate(editId, payload)
      } else {
        addTemplate(payload)
      }

      toast({
        title: editId ? "Template updated" : "Template saved",
        description: mode === "draft" ? "Saved as Draft successfully." : "Template activated successfully.",
      })

      navigate("/kpi-templates")
    })()
  }

  return (
    <Form {...form}>
      <div className="grid grid-cols-5 gap-6 print:block">
      {/* Left panel */}
      <div className="col-span-3 space-y-6 print:hidden">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-brand-blue">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Template Definition</CardTitle>
                <CardDescription>Describe the template and metadata</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="contents">
                  <FormField
                    control={control}
                    name="templateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Sales Excellence Quarterly TMPL"
                            onChange={(event) => {
                              const next = event.target.value
                              field.onChange(next)
                              const nextCode = generateTemplateCodeFromName(next)
                              setValue("templateCode", normalizeTemplateCode(nextCode), { shouldValidate: true })
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="templateCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Code</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            readOnly={codeLocked}
                            onFocus={() => {
                              // Avoid repeated state updates if focus re-triggers while already unlocked.
                              setCodeLocked((prev) => (prev ? false : prev))
                            }}
                            className="font-mono"
                          />
                        </FormControl>
                        <p className="mt-2 text-xs font-mono text-muted-foreground">
                          Normalized: {codeNormalizedPreview}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templateCategoryOptions.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name="businessScope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Scope</FormLabel>
                        <Select value={field.value} onValueChange={(val) => field.onChange(val as BusinessScope)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business scope" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="freight">Freight Forwarding</SelectItem>
                            <SelectItem value="corporate">Corporate (Non-Freight)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

              </div>
              {businessScope === "freight" ? (
                <FormField
                  control={control}
                  name="shipmentModes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Shipment Modes</FormLabel>
                      <MultiPillSelect
                        value={field.value}
                        options={shipmentModeOptions}
                        onChange={(next) => setValue("shipmentModes", next as ShipmentMode[], { shouldValidate: true })}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Corporate template selected. Shipment modes are not required.
                </div>
              )}


              <div className="col-span-1">
                <Label>Status</Label>
                <div className="mt-2 flex overflow-hidden rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-10 flex-1 rounded-none border-r border-slate-200",
                      statusId === "draft"
                        ? "bg-brand-blue text-white hover:bg-brand-blue/90"
                        : "bg-white text-slate-700",
                    )}
                    onClick={() => setValue("statusId", "draft", { shouldValidate: true })}
                  >
                    Draft
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn("h-10 flex-1 rounded-none", statusId === "active" ? "bg-brand-blue text-white hover:bg-brand-blue/90" : "bg-white text-slate-700")}
                    onClick={() => setValue("statusId", "active", { shouldValidate: true })}
                  >
                    Active
                  </Button>
                </div>
              </div>

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Template description..." className="min-h-24" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-teal/10 text-brand-teal">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Add KPI Items to Template</CardTitle>
                <CardDescription>Select KPI items and assign weights</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search KPI items..."
                className="pl-9"
              />
            </div>

            <div className="rounded-lg border">
              <div className="max-h-56 overflow-y-auto">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI Code</TableHead>
                        <TableHead>KPI Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-[120px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableFiltered.map((item) => {
                        const added = availableAdded.has(item.id)
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span className="font-mono text-xs text-brand-blue">{item.kpiCode}</span>
                            </TableCell>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.unitType.toUpperCase()}</TableCell>
                            <TableCell className="capitalize">{item.category}</TableCell>
                            <TableCell>
                              {added ? (
                                <Badge
                                  variant="secondary"
                                  className="border border-emerald-200 bg-emerald-50 text-emerald-700"
                                >
                                  Added ✓
                                </Badge>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => addKpiToTemplate(item)}>
                                  + Add
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {availableFiltered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                            No matching KPI items.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-900">
                Template Items ({watchedKpiItems.length})
              </div>

              {watchedKpiItems.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Add KPI items from above
                </div>
              ) : (
                <div className="space-y-2">
                  {watchedKpiItems
                    .slice()
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((it) => (
                      <div key={it.kpiItemId} className="flex items-center gap-3 rounded-lg border p-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <Badge variant="outline" className="font-mono text-xs border-brand-blue/30 text-brand-blue">
                          {it.kpiCode}
                        </Badge>
                        <span className="flex-1 font-medium">{it.kpiName}</span>
                        <Badge className="text-xs" variant="secondary">
                          {it.unitType}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Weight</span>
                          <Input
                            className="w-16 text-center"
                            type="number"
                            min={0}
                            max={100}
                            value={it.weight}
                            onChange={(e) => updateKpiItemWeight(it.kpiItemId, Number(e.target.value))}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeKpiFromTemplate(it.kpiItemId)} aria-label="Remove">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                  <div className="space-y-2 rounded-lg border bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Total Weight</span>
                      <span
                        className={cn(
                          "font-mono text-sm font-semibold",
                          templateWeightTotal === 100
                            ? "text-brand-teal"
                            : templateWeightTotal < 100
                              ? "text-brand-amber"
                              : "text-brand-red",
                        )}
                      >
                        {templateWeightTotal}%
                      </span>
                    </div>
                    <Progress
                      value={clamp(templateWeightTotal, 0, 100)}
                      indicatorClassName={progressIndicatorClassByTotal(templateWeightTotal)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="px-0"
                        onClick={() => {
                          if (weightMode === "equal") autoDistribute()
                          if (weightMode === "priority") setPriorityOpen(true)
                          if (weightMode === "custom") setCustomOpen(true)
                        }}
                      >
                        Auto-balance
                      </Button>
                      <Select value={weightMode} onValueChange={(val) => setWeightMode(val as "equal" | "priority" | "custom")}>
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equal">Equal distribution</SelectItem>
                          <SelectItem value="priority">By priority</SelectItem>
                          <SelectItem value="custom">Custom preset</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="col-span-2 print:col-span-5">
        <div className="sticky top-6 space-y-6">
          <Card className="print:shadow-none print:border print:w-full">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-brand-blue">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Template Preview</CardTitle>
                  <CardDescription>Live KPI preview and weight coverage</CardDescription>
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  Export Preview
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="text-xl font-semibold text-slate-900">
                {templateName?.trim().length > 0 ? templateName : "Untitled Template"}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {applicableRoles.map((role) => (
                  <Badge key={role} className={cn("border-0", roleBadgeClass)} variant="outline">
                    {roleLabel(role)}
                  </Badge>
                ))}
                <Badge className={cn(periodBadgeClass)} variant="outline">
                  {String(periodType).charAt(0).toUpperCase() + String(periodType).slice(1)}
                </Badge>
                <Badge className="border-brand-blue/30 bg-orange-50 text-brand-blue" variant="outline">
                  {statusId}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground print:text-black">
                Code: {codeNormalizedPreview} | Generated: {new Date().toLocaleString()}
              </div>

              <Separator />

              <div className="space-y-3">
                {watchedKpiItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Add KPI items to see the preview.
                  </div>
                ) : (
                  watchedKpiItems
                    .slice()
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((it) => (
                      <div key={`preview-${it.kpiItemId}`} className="space-y-2">
                        <div className="flex items-center justify-between border-b py-2 last:border-b-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate text-sm font-medium">{it.kpiName}</span>
                            <Badge className="text-xs" variant="secondary">
                              {it.unitType}
                            </Badge>
                          </div>
                          <div className="font-mono text-sm">{it.weight}%</div>
                        </div>
                        <Progress value={clamp(it.weight, 0, 100)} className="h-4" indicatorClassName={progressIndicatorClassByTotal(it.weight)} />
                      </div>
                    ))
                )}
              </div>

              <div className="hidden print:block">
                <Separator className="my-3" />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Thresholds</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchedKpiItems.map((it) => {
                      const source = effectiveKpiItems.find((kpi) => kpi.id === it.kpiItemId)
                      const thresholds = source?.thresholds
                      return (
                        <TableRow key={`print-row-${it.kpiItemId}`}>
                          <TableCell>{it.kpiCode}</TableCell>
                          <TableCell>{it.kpiName}</TableCell>
                          <TableCell>{it.unitType}</TableCell>
                          <TableCell>{it.weight}%</TableCell>
                          <TableCell>
                            {thresholds
                              ? `G ${thresholds.green.min}-${thresholds.green.max}, A ${thresholds.amber.min}-${thresholds.amber.max}, R ${thresholds.red.min}-${thresholds.red.max}`
                              : "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 text-right text-xs">Generated by PerformanceIQ</div>
              </div>

              <Separator />

              <div className="flex items-center justify-center">
                <WeightDonut total={templateWeightTotal} />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Modes:</span>
                  <div className="flex flex-wrap gap-2">
                    {shipmentModes.map((m) => {
                      const opt = shipmentModePills.find((x) => x.value === m)
                      if (!opt) return null
                      return (
                        <Badge
                          key={m}
                          className="border-0 bg-white text-slate-700"
                          variant="outline"
                        >
                          {opt.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Role:</span>
                  <div className="flex flex-wrap gap-2">
                    {applicableRoles.map((role) => (
                      <Badge key={`preview-role-${role}`} className={cn("border-0", roleBadgeClass)} variant="outline">
                        {roleLabel(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => submitTemplate("draft")}
                >
                  Save as Draft
                </Button>
                <span
                  title="Total weight must equal 100%"
                  className="block"
                >
                  <Button
                    type="button"
                    variant="default"
                    className="w-full"
                    disabled={templateWeightTotal !== 100}
                    onClick={() => submitTemplate("active")}
                  >
                    Activate Template
                  </Button>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
      <Dialog open={priorityOpen} onOpenChange={setPriorityOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Weight by priority</DialogTitle>
            <DialogDescription>
              Reorder KPI items by priority. Top items get higher weight first (30/25/20/15/10), then remaining items are split.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Tip: drag rows or use arrow buttons to change order. This list is scrollable for long templates.
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              {priorityItems.map((item, index) => (
                <div
                  key={`priority-${item.kpiItemId}`}
                  className="flex items-center gap-2 rounded border bg-white p-2"
                  draggable
                  onDragStart={() => setDraggedPriorityId(item.kpiItemId)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedPriorityId || draggedPriorityId === item.kpiItemId) return
                    setPriorityItems((prev) => {
                      const from = prev.findIndex((x) => x.kpiItemId === draggedPriorityId)
                      const to = prev.findIndex((x) => x.kpiItemId === item.kpiItemId)
                      if (from < 0 || to < 0) return prev
                      const next = [...prev]
                      const [moved] = next.splice(from, 1)
                      next.splice(to, 0, moved)
                      return next
                    })
                    setDraggedPriorityId(null)
                  }}
                >
                  <span className="w-6 text-center text-xs font-semibold">{index + 1}</span>
                  <span className="flex-1 truncate text-sm">{item.kpiName}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (index === 0) return
                      setPriorityItems((prev) => {
                        const next = [...prev]
                        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                        return next
                      })
                    }}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (index === priorityItems.length - 1) return
                      setPriorityItems((prev) => {
                        const next = [...prev]
                        ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
                        return next
                      })
                    }}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => setPriorityOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={applyPriorityWeights}>
              Apply priority weights
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Custom weight preset</DialogTitle>
            <DialogDescription>Enter custom weights. Total must be exactly 100%.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              {watchedKpiItems.map((item) => (
                <div key={`custom-${item.kpiItemId}`} className="flex items-center gap-2 rounded border bg-white p-2">
                  <span className="flex-1 truncate text-sm">{item.kpiName}</span>
                  <Input
                    type="number"
                    className="w-24"
                    value={customPreset[item.kpiItemId] ?? 0}
                    onChange={(e) =>
                      setCustomPreset((prev) => ({
                        ...prev,
                        [item.kpiItemId]: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="text-xs">%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-t pt-3">
            <div className={cn("text-sm", customPresetTotal === 100 ? "text-brand-teal" : "text-brand-red")}>Total: {customPresetTotal}%</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={customPresetTotal !== 100} onClick={applyCustomPreset}>
                Apply custom preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  )
}

function WeightDonut({ total }: { total: number }) {
  const r = 48
  const circumference = 2 * Math.PI * r
  const arcValue = clamp(total, 0, 100)
  const dashOffset = (1 - arcValue / 100) * circumference

  const color = total === 100 ? "#0C6B50" : total < 100 ? "#F0C060" : "#E88080"

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="relative">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#E2DFD8" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="64" textAnchor="middle" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fontSize="18" fill="#0F172A" fontWeight={700}>
        {total}%
      </text>
      <text x="60" y="84" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="#6B7280">
        weight
      </text>
    </svg>
  )
}
