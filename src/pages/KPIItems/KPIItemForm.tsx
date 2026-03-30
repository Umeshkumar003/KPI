import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { BarChart3, FileText, CheckCircle2, Search, RotateCcw } from "lucide-react"

import { toast } from "@/hooks/use-toast"
import { useKPIStore } from "@/store/kpiStore"
import type {
  KPICategory,
  UnitType,
  CalculationType,
  PeriodType,
  UserRole,
  KPIStatus,
} from "@/types/kpi.types"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  filterKpiImportLibrary,
  KPI_IMPORT_LIBRARY_GROUPS,
  type KPIImportEntry,
} from "@/data/kpiImportLibrary"

/** Stored on every new KPI item; category is no longer collected on this form. */
const DEFAULT_KPI_CATEGORY: KPICategory = "operational"

const unitTypeValues = ["currency", "number"] as const satisfies readonly UnitType[]
const unitTypeOptions = [
  { value: "currency", label: "Amount" },
  { value: "number", label: "Number" },
] as const satisfies readonly { value: (typeof unitTypeValues)[number]; label: string }[]

const calculationTypeOptions = ["auto", "manual", "percentage"] as const satisfies readonly CalculationType[]
const periodTypeOptions = ["monthly", "quarterly", "annual", "weekly", "daily"] as const satisfies readonly PeriodType[]

const statusOptions = ["draft", "active", "archived"] as const satisfies readonly KPIStatus[]

const roleOptions = [
  "pricing-exec",
  "pricing-mgr",
  "ops-exec",
  "ops-mgr",
  "senior-mgmt",
  "branch-head",
] as const satisfies readonly UserRole[]
const thresholdSchema = z.object({
  min: z.number(),
  max: z.number(),
})

const kpiItemSchema = z
  .object({
    definitionName: z.string().min(3, "Definition name is required"),
    kpiCode: z.string().min(3, "KPI code is required"),
    itemName: z.string().optional(),
    description: z.string().min(5, "Description is required"),

    unitType: z.enum(unitTypeValues),
    calculationType: z.enum(calculationTypeOptions),
    periodType: z.enum(periodTypeOptions),
    aggregation: z.string().min(2, "Aggregation is required"),
    trendDirection: z.enum(["higher-better", "lower-better", "target-range"]),
    dataSource: z.string().min(2, "Data source is required"),

    thresholds: z.object({
      green: thresholdSchema,
      amber: thresholdSchema,
      red: thresholdSchema,
    }),

    allowCarryForward: z.boolean(),
    carryForwardMissingValue: z.number().optional(),
    showInBuildScreen: z.boolean(),
    enableAlerts: z.boolean(),
    weightedScoring: z.boolean(),
    visibleRoles: z.array(z.enum(roleOptions)).min(1, "Select at least one role"),

    statusId: z.enum(statusOptions),
    weight: z.number().min(0).max(100),
  })
  .superRefine((data, ctx) => {
    if (data.thresholds.green.min >= data.thresholds.green.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Green min must be less than green max",
        path: ["thresholds", "green", "max"],
      })
    }
    if (data.thresholds.amber.min >= data.thresholds.amber.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amber min must be less than amber max",
        path: ["thresholds", "amber", "max"],
      })
    }
    if (data.thresholds.red.min >= data.thresholds.red.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Red min must be less than red max",
        path: ["thresholds", "red", "max"],
      })
    }
  })

type FormData = z.infer<typeof kpiItemSchema>

/** Legacy KPI item drafts may include removed scope fields; drop them before reset. */
function stripDraftLegacyFields(raw: Record<string, unknown>): Partial<FormData> {
  const { businessScope: _b, shipmentModes: _s, tradeDirections: _t, jobType: _j, regionScope: _r, category: _c, ...rest } = raw
  return rest as Partial<FormData>
}

function normalizeKpiCode(raw: string) {
  const upper = raw.toUpperCase()
  const hyphenJoined = upper.replace(/[^A-Z0-9]+/g, "-")
  return hyphenJoined.replace(/^-+/, "").replace(/-+$/, "")
}

function generateKpiCodeFromDefinition(definitionName: string) {
  const stopWords = new Set(["a", "the", "of", "in", "for", "by", "to"])
  const words = (definitionName.match(/[A-Za-z0-9]+/g) ?? []).filter((w) => !stopWords.has(w.toLowerCase()))
  const letters = words
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w : w.charAt(0)))
    .filter((c) => c.length > 0)
    .map((c) => c.toUpperCase())
  return letters.join("")
}

function categoryPrefix(category: KPICategory): string {
  switch (category) {
    case "financial":
      return "FIN"
    case "customer":
      return "CST"
    case "operational":
      return "OPS"
    case "delivery":
      return "SAL"
    case "compliance":
      return "CMP"
    case "sustainability":
      return "SUS"
    case "capacity":
      return "QTY"
  }
}

function smartGeneratedCode(definitionName: string, category: KPICategory): string {
  const short = generateKpiCodeFromDefinition(definitionName)
  const prefix = categoryPrefix(category)
  if (!short) return `${prefix}-`
  return `${prefix}-${short}`
}

function StepCircle({ state, index }: { state: "completed" | "active" | "pending"; index: number }) {
  if (state === "completed") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
        <CheckCircle2 className="h-5 w-5" />
      </div>
    )
  }
  if (state === "active") {
    return <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white font-semibold">{index + 1}</div>
  }
  return <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 font-semibold">{index + 1}</div>
}

function KPIItemStepper({
  activeStep,
  onStepClick,
}: {
  activeStep: number
  onStepClick: (stepIdx: number) => void
}) {
  const steps = ["Definition", "Measurement"] as const

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {steps.map((label, idx) => {
          const state: "completed" | "active" | "pending" = idx < activeStep ? "completed" : idx === activeStep ? "active" : "pending"
          return (
            <div key={label} className="flex flex-1 items-center">
              <button type="button" className="flex flex-col items-center" onClick={() => onStepClick(idx)}>
                <StepCircle state={state} index={idx} />
                <div className={cn("mt-2 text-center text-xs font-medium", state === "active" ? "text-brand-blue" : "text-slate-500")}>
                  {label}
                </div>
              </button>
              {idx < steps.length - 1 ? (
                <div className={cn("mx-3 h-0.5 flex-1 bg-slate-200", idx < activeStep ? "bg-brand-teal/70" : "bg-slate-200")} />
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function KPIItemForm() {
  const navigate = useNavigate()
  const addKPIItem = useKPIStore((state) => state.addKPIItem)

  const defaultValues: FormData = {
    definitionName: "",
    kpiCode: "",
    itemName: undefined,
    description: "",

    unitType: "currency",
    calculationType: "auto",
    periodType: "monthly",
    aggregation: "Average",
    trendDirection: "higher-better",
    dataSource: "Manual",

    thresholds: {
      green: { min: 95, max: 100 },
      amber: { min: 90, max: 94.99 },
      red: { min: 0, max: 89.99 },
    },

    allowCarryForward: true,
    carryForwardMissingValue: undefined,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],

    statusId: "draft",
    weight: 20,
  }

  const form = useForm<FormData>({
    resolver: zodResolver(kpiItemSchema),
    defaultValues,
    mode: "onChange",
  })

  const { watch, setValue, handleSubmit, control } = form
  const allValues = watch()
  const watchedDefinition = watch("definitionName")

  const [activeStep, setActiveStep] = useState<number>(0)
  const [manualCodeMode, setManualCodeMode] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryQuery, setLibraryQuery] = useState("")
  const [draftBannerOpen, setDraftBannerOpen] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<FormData | null>(null)

  const sectionByStepRef = useRef<(HTMLElement | null)[]>([null, null])
  const DRAFT_KEY = "kpi-form-draft"

  useEffect(() => {
    const elements = sectionByStepRef.current.filter((el) => el !== null) as HTMLElement[]
    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0))
        const first = intersecting[0]
        if (!first) return
        const stepAttr = (first.target as HTMLElement).dataset.step
        const nextStep = stepAttr ? Number(stepAttr) : 0
        if (Number.isFinite(nextStep)) setActiveStep(nextStep)
      },
      {
        root: null,
        rootMargin: "-35% 0px -55% 0px",
        threshold: 0,
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (manualCodeMode) return
    const generated = smartGeneratedCode(watchedDefinition ?? "", DEFAULT_KPI_CATEGORY)
    setValue("kpiCode", normalizeKpiCode(generated), { shouldValidate: true })
  }, [manualCodeMode, setValue, watchedDefinition])

  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      setPendingDraft({ ...defaultValues, ...stripDraftLegacyFields(parsed) } as FormData)
      setDraftBannerOpen(true)
    } catch {
      localStorage.removeItem(DRAFT_KEY)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(allValues))
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [allValues])

  const scrollToStep = (stepIdx: number) => {
    const section = sectionByStepRef.current[stepIdx]
    section?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const filteredLibrary = useMemo(
    () => filterKpiImportLibrary(KPI_IMPORT_LIBRARY_GROUPS, libraryQuery),
    [libraryQuery],
  )

  const fillFromLibrary = (entry: KPIImportEntry) => {
    setValue("definitionName", entry.definitionName, { shouldValidate: true })
    setValue("itemName", entry.name, { shouldValidate: true })
    setValue("description", entry.description, { shouldValidate: true })
    setValue("unitType", entry.unitType, { shouldValidate: true })
    setValue("calculationType", entry.calculationType, { shouldValidate: true })
    setValue("periodType", entry.periodType, { shouldValidate: true })
    setValue("dataSource", entry.dataSource, { shouldValidate: true })
    setValue("visibleRoles", entry.visibleRoles, { shouldValidate: true })
    setValue("aggregation", entry.aggregation, { shouldValidate: true })
    setValue("trendDirection", entry.trendDirection, { shouldValidate: true })
    if (entry.suggestedKpiCode) {
      setManualCodeMode(true)
      setValue("kpiCode", normalizeKpiCode(entry.suggestedKpiCode), { shouldValidate: true })
    } else {
      setManualCodeMode(false)
    }
    setLibraryOpen(false)
  }

  const onSubmitCreate = (values: FormData, mode: "draft" | "build" | "active") => {
    const nowIso = new Date().toISOString()
    addKPIItem({
      id: crypto.randomUUID(),
      definitionName: values.definitionName,
      kpiCode: values.kpiCode,
      itemName: values.itemName?.trim() ? values.itemName : values.definitionName,
      category: DEFAULT_KPI_CATEGORY,
      description: values.description,
      businessScope: "freight",
      shipmentModes: ["sea", "air", "road", "rail", "multimodal", "courier"],
      tradeDirections: ["import", "export", "cross-trade", "import-clearance", "export-clearance"],
      jobType: "All",
      regionScope: "Global",
      unitType: values.unitType,
      calculationType: values.calculationType,
      periodType: values.periodType,
      aggregation: values.aggregation,
      trendDirection: values.trendDirection,
      dataSource: values.dataSource,
      thresholds: values.thresholds,
      allowCarryForward: values.allowCarryForward,
      ...(values.allowCarryForward && values.carryForwardMissingValue !== undefined
        ? { carryForwardMissingValue: values.carryForwardMissingValue }
        : {}),
      showInBuildScreen: values.showInBuildScreen,
      enableAlerts: values.enableAlerts,
      weightedScoring: values.weightedScoring,
      visibleRoles: values.visibleRoles,
      weight: values.weight,
      statusId: mode === "draft" ? "draft" : mode === "build" ? "active" : "active",
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    toast({
      title: "KPI Item saved",
      description: mode === "draft" ? "Saved as draft successfully." : "Saved successfully.",
    })
    localStorage.removeItem(DRAFT_KEY)
  }

  const submitAndNavigate = (mode: "draft" | "build" | "active") => {
    void handleSubmit((values) => {
      onSubmitCreate(values, mode)
      if (mode === "build") navigate("/template-allocation")
      else navigate("/kpi-items")
    })()
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-2 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-xl border bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <KPIItemStepper activeStep={activeStep} onStepClick={scrollToStep} />
        <Button type="button" variant="outline" onClick={() => setLibraryOpen(true)}>
          Import from Library
        </Button>
        </div>
      </div>

      {draftBannerOpen ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span>You have an unsaved draft. Resume?</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (pendingDraft) form.reset(pendingDraft)
                setDraftBannerOpen(false)
              }}
            >
              Resume
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                localStorage.removeItem(DRAFT_KEY)
                setDraftBannerOpen(false)
                setPendingDraft(null)
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      ) : null}

      <Form {...form}>
        <form className="space-y-7" onSubmit={handleSubmit((values) => {
          onSubmitCreate(values, "active")
          navigate("/kpi-items")
        })}>
          {/* SECTION 1 — KPI Identity */}
          <Card
            ref={(el) => {
              sectionByStepRef.current[0] = el
            }}
            data-step={0}
          >
            <CardHeader className="pb-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-brand-blue">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">KPI Identity</CardTitle>
                  <CardDescription>Define the core KPI metadata</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  control={control}
                  name="definitionName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Definition Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. On-Time Delivery Performance"
                          onChange={(event) => {
                            const next = event.target.value
                            field.onChange(next)
                            if (!manualCodeMode) {
                              const nextCode = smartGeneratedCode(next, DEFAULT_KPI_CATEGORY)
                              setValue("kpiCode", normalizeKpiCode(nextCode), { shouldValidate: true })
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="kpiCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KPI Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. OTD-PERF"
                          className="font-mono"
                          onFocus={() => setManualCodeMode(true)}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe KPI objective..." className="min-h-28" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 — Measurement */}
          <Card
            ref={(el) => {
              sectionByStepRef.current[1] = el
            }}
            data-step={1}
          >
            <CardHeader className="pb-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Measurement</CardTitle>
                  <CardDescription>Define how values are calculated and displayed</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField
                  control={control}
                  name="unitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Type</FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val as UnitType)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {unitTypeOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                  name="calculationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Type</FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val as CalculationType)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select calculation type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {calculationTypeOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.charAt(0).toUpperCase() + opt.slice(1)}
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
                  name="periodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Type</FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val as PeriodType)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select period type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {periodTypeOptions.map((opt) => (
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
                  name="dataSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Source</FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select data source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Manual", "TMS", "ERP", "CRM", "BI Engine"].map((opt) => (
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
                  name="allowCarryForward"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-orange-500 text-white">
                            <RotateCcw className="h-4 w-4" />
                          </div>
                          <div>
                            <FormLabel className="text-sm font-medium">Carry Forward Missing Value</FormLabel>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Reuse the last available value when current period actual is missing.
                          </p>
                        </div>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-label="Carry forward missing value"
                              className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-slate-300"
                            />
                            <span className={cn("text-xs font-semibold", field.value ? "text-orange-600" : "text-slate-500")}>
                              {field.value ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="statusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val as KPIStatus)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statusOptions.map((opt) => (
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
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={field.value}
                            className="w-full"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <span className="text-sm font-medium text-slate-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sticky Footer Action Bar */}
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Button type="button" variant="ghost" onClick={() => navigate("/kpi-items")}>
                  ← Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => form.reset(defaultValues)}
                >
                  Reset
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submitAndNavigate("draft")}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submitAndNavigate("build")}
                >
                  Go to Build Screen
                </Button>
                <Button type="submit">
                  Add KPI Item
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import KPI Definition from Library</DialogTitle>
            <DialogDescription>
              Pick a Vision Central Dubai product KPI or a core freight definition. Values match the seeded workbook and templates
              (units, period, data source, roles, and suggested KPI codes).
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search KPI definitions..."
            />
          </div>
          <div className="max-h-[60vh] overflow-auto space-y-6 pr-1">
            {filteredLibrary.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No definitions match your search.</p>
            ) : null}
            {filteredLibrary.map((group) => (
              <div key={group.id} className="space-y-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{group.title}</div>
                  {group.subtitle ? (
                    <div className="text-xs text-muted-foreground mt-0.5">{group.subtitle}</div>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.entries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className="rounded-lg border bg-white p-3 text-left transition-colors hover:bg-slate-50"
                      onClick={() => fillFromLibrary(entry)}
                    >
                      <div className="font-medium text-sm leading-snug">{entry.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</div>
                      {entry.suggestedKpiCode ? (
                        <div className="mt-1.5 font-mono text-[10px] text-brand-blue/90">{entry.suggestedKpiCode}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
