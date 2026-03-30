import { create } from "zustand"
import {
  VISION_ACTUALS_SEED,
  VISION_ALLOCATIONS_SEED,
  VISION_KPI_ITEMS_SEED,
  VISION_TEMPLATE_SEED,
} from "@/data/visionCentralDubai"
import { assignTenant, DEFAULT_TENANT_ID } from "@/lib/tenant"
import { autoDistribute } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import type { ActualEntry, HierarchyNode, KPIItem, KPITemplate, TemplateAllocation, UserRole } from "@/types/kpi.types"

type KPIState = {
  kpiItems: KPIItem[]
  kpiTemplates: KPITemplate[]
  allocations: TemplateAllocation[]
  actuals: ActualEntry[]
  selectedNode: HierarchyNode | null
  addKPIItem: (item: Omit<KPIItem, "tenantId"> & { tenantId?: string; carryForwardMissingValue?: number }) => void
  updateKPIItem: (id: string, patch: Partial<KPIItem>) => void
  deleteKPIItem: (id: string) => void
  addTemplate: (template: Omit<KPITemplate, "tenantId"> & { tenantId?: string }) => void
  updateTemplate: (id: string, patch: Partial<KPITemplate>) => void
  deleteTemplate: (id: string) => void
  addAllocation: (allocation: Omit<TemplateAllocation, "tenantId"> & { tenantId?: string }) => void
  /** Insert or replace by id, else by allocatedTo + type + hierarchyLevel + fiscalYear (same tenant). */
  upsertAllocation: (allocation: Omit<TemplateAllocation, "tenantId"> & { tenantId?: string }) => void
  setSelectedNode: (node: HierarchyNode | null) => void
}

const SEED_KPI_ITEMS: KPIItem[] = assignTenant<KPIItem>([
  ...VISION_KPI_ITEMS_SEED,
  {
    id: "kpi-otd-sea",
    businessScope: "freight",
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
    thresholds: {
      green: { min: 95, max: 100 },
      amber: { min: 90, max: 94.99 },
      red: { min: 0, max: 89.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "kpi-rev-tot",
    businessScope: "freight",
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
    thresholds: {
      green: { min: 100, max: 120 },
      amber: { min: 95, max: 99.99 },
      red: { min: 0, max: 94.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["pricing-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "kpi-qte-cnv",
    businessScope: "freight",
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
    thresholds: {
      green: { min: 20, max: 100 },
      amber: { min: 15, max: 19.99 },
      red: { min: 0, max: 14.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["branch-head"],
    weight: 10,
    statusId: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "kpi-shp-vol",
    businessScope: "freight",
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
    thresholds: {
      green: { min: 120, max: 100000 },
      amber: { min: 100, max: 119.99 },
      red: { min: 0, max: 99.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: false,
    weightedScoring: true,
    visibleRoles: ["ops-mgr"],
    weight: 10,
    statusId: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "kpi-cst-sat",
    businessScope: "freight",
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
    thresholds: {
      green: { min: 8, max: 10 },
      amber: { min: 6, max: 7.99 },
      red: { min: 0, max: 5.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: ["ops-exec"],
    weight: 10,
    statusId: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
], DEFAULT_TENANT_ID)

const FREIGHT_TEMPLATE_ROLES: UserRole[] = [
  "leadership",
  "branch-head",
  "sales-manager",
  "sales-lead",
  "sales-executive",
]

const SEED_TEMPLATES: KPITemplate[] = assignTenant<KPITemplate>([
  VISION_TEMPLATE_SEED,
  {
    id: "tmpl-sea-sales-annual",
    businessScope: "freight",
    templateName: "Sea Sales Annual",
    templateCode: "SEA-SALES-ANNUAL",
    category: "Sales",
    applicableRoles: FREIGHT_TEMPLATE_ROLES,
    shipmentModes: ["sea"],
    tradeDirections: ["import", "export"],
    jobType: "All",
    periodType: "annual",
    description: "Annual scorecard for Sales Executive (Sea)",
    statusId: "active",
    kpiItems: [
      { kpiItemId: "kpi-otd-sea", kpiCode: "OTD-SEA", kpiName: "On-Time Delivery %", unitType: "percentage", weight: 15, displayOrder: 1 },
      { kpiItemId: "kpi-rev-tot", kpiCode: "REV-TOT", kpiName: "Total Revenue", unitType: "currency", weight: 35, displayOrder: 2 },
      { kpiItemId: "kpi-qte-cnv", kpiCode: "QTE-CNV", kpiName: "Quote Conversion Rate", unitType: "percentage", weight: 20, displayOrder: 3 },
      { kpiItemId: "kpi-shp-vol", kpiCode: "SHP-VOL", kpiName: "Shipment Volume", unitType: "teu", weight: 15, displayOrder: 4 },
      { kpiItemId: "kpi-cst-sat", kpiCode: "CST-SAT", kpiName: "Customer Satisfaction", unitType: "score", weight: 15, displayOrder: 5 },
    ],
    createdAt: "2026-03-01T00:00:00.000Z",
    version: 1,
    lastUpdatedAt: "2026-03-01T00:00:00.000Z",
    lastUpdatedBy: "System",
    changelog: [{ version: 1, date: "2026-03-01T00:00:00.000Z", changedBy: "System", changes: "Initial activation." }],
  },
  {
    id: "tmpl-ops-quarterly",
    businessScope: "freight",
    templateName: "Ops Quarterly",
    templateCode: "OPS-QUARTERLY",
    category: "Operations",
    applicableRoles: FREIGHT_TEMPLATE_ROLES,
    shipmentModes: ["sea", "air", "road"],
    tradeDirections: ["import", "export"],
    jobType: "All",
    periodType: "quarterly",
    description: "Quarterly scorecard for Ops Executive",
    statusId: "active",
    kpiItems: [
      { kpiItemId: "kpi-otd-sea", kpiCode: "OTD-SEA", kpiName: "On-Time Delivery %", unitType: "percentage", weight: 40, displayOrder: 1 },
      { kpiItemId: "kpi-shp-vol", kpiCode: "SHP-VOL", kpiName: "Shipment Volume", unitType: "teu", weight: 30, displayOrder: 2 },
      { kpiItemId: "kpi-rev-tot", kpiCode: "REV-TOT", kpiName: "Total Revenue", unitType: "currency", weight: 10, displayOrder: 3 },
      { kpiItemId: "kpi-qte-cnv", kpiCode: "QTE-CNV", kpiName: "Quote Conversion Rate", unitType: "percentage", weight: 10, displayOrder: 4 },
      { kpiItemId: "kpi-cst-sat", kpiCode: "CST-SAT", kpiName: "Customer Satisfaction", unitType: "score", weight: 10, displayOrder: 5 },
    ],
    createdAt: "2026-03-01T00:00:00.000Z",
    version: 1,
    lastUpdatedAt: "2026-03-01T00:00:00.000Z",
    lastUpdatedBy: "System",
    changelog: [{ version: 1, date: "2026-03-01T00:00:00.000Z", changedBy: "System", changes: "Initial activation." }],
  },
], DEFAULT_TENANT_ID)

const SEED_ALLOCATIONS: TemplateAllocation[] = assignTenant<TemplateAllocation>([
  ...VISION_ALLOCATIONS_SEED,
  {
    id: "alloc-avt",
    templateId: "tmpl-sea-sales-annual",
    allocatedTo: "Ahmed Al-Farsi",
    allocatedToType: "individual",
    hierarchyLevel: "sales-executive",
    fiscalYear: "FY 2025-26",
    periodType: "annual",
    statusId: "confirmed",
    createdAt: "2026-03-01T00:00:00.000Z",
    targets: [
      (() => {
        const annualTarget = 95
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-otd-sea",
          kpiCode: "OTD-SEA",
          kpiName: "On-Time Delivery %",
          unitType: "percentage",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 180000
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-rev-tot",
          kpiCode: "REV-TOT",
          kpiName: "Total Revenue",
          unitType: "currency",
          weight: 35,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 40
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-qte-cnv",
          kpiCode: "QTE-CNV",
          kpiName: "Quote Conversion Rate",
          unitType: "percentage",
          weight: 20,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 120
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-shp-vol",
          kpiCode: "SHP-VOL",
          kpiName: "Shipment Volume",
          unitType: "teu",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 8.5
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-cst-sat",
          kpiCode: "CST-SAT",
          kpiName: "Customer Satisfaction",
          unitType: "score",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
    ],
  },
  {
    id: "alloc-priya",
    templateId: "tmpl-sea-sales-annual",
    allocatedTo: "Priya Nair",
    allocatedToType: "individual",
    hierarchyLevel: "sales-executive",
    fiscalYear: "FY 2025-26",
    periodType: "annual",
    statusId: "confirmed",
    createdAt: "2026-03-02T00:00:00.000Z",
    targets: [
      (() => {
        const annualTarget = 96
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-otd-sea",
          kpiCode: "OTD-SEA",
          kpiName: "On-Time Delivery %",
          unitType: "percentage",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 195000
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-rev-tot",
          kpiCode: "REV-TOT",
          kpiName: "Total Revenue",
          unitType: "currency",
          weight: 35,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 42
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-qte-cnv",
          kpiCode: "QTE-CNV",
          kpiName: "Quote Conversion Rate",
          unitType: "percentage",
          weight: 20,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 130
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-shp-vol",
          kpiCode: "SHP-VOL",
          kpiName: "Shipment Volume",
          unitType: "teu",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 8.8
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-cst-sat",
          kpiCode: "CST-SAT",
          kpiName: "Customer Satisfaction",
          unitType: "score",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
    ],
  },
  {
    id: "alloc-dubai-branch",
    templateId: "tmpl-sea-sales-annual",
    allocatedTo: "Dubai, UAE",
    allocatedToType: "team",
    hierarchyLevel: "branch-head",
    fiscalYear: "FY 2025-26",
    periodType: "annual",
    statusId: "draft",
    createdAt: "2026-03-03T00:00:00.000Z",
    targets: [
      (() => {
        const annualTarget = 94
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-otd-sea",
          kpiCode: "OTD-SEA",
          kpiName: "On-Time Delivery %",
          unitType: "percentage",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 4_200_000
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-rev-tot",
          kpiCode: "REV-TOT",
          kpiName: "Total Revenue",
          unitType: "currency",
          weight: 35,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 38
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-qte-cnv",
          kpiCode: "QTE-CNV",
          kpiName: "Quote Conversion Rate",
          unitType: "percentage",
          weight: 20,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 4800
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-shp-vol",
          kpiCode: "SHP-VOL",
          kpiName: "Shipment Volume",
          unitType: "teu",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
      (() => {
        const annualTarget = 8.2
        const split = autoDistribute(annualTarget)
        return {
          kpiItemId: "kpi-cst-sat",
          kpiCode: "CST-SAT",
          kpiName: "Customer Satisfaction",
          unitType: "score",
          weight: 15,
          annualTarget,
          h1Target: split.h1,
          h2Target: split.h2,
          q1Target: split.q1,
          q2Target: split.q2,
          q3Target: split.q3,
          q4Target: split.q4,
        }
      })(),
    ],
  },
], DEFAULT_TENANT_ID)

const SEED_ACTUALS: ActualEntry[] = assignTenant<ActualEntry>(VISION_ACTUALS_SEED, DEFAULT_TENANT_ID)

export const useKPIStore = create<KPIState>((set) => ({
  kpiItems: SEED_KPI_ITEMS,
  kpiTemplates: SEED_TEMPLATES,
  allocations: SEED_ALLOCATIONS,
  actuals: SEED_ACTUALS,
  selectedNode: null,
  addKPIItem: (item) => {
    const tenantId = item.tenantId ?? useAppStore.getState().currentTenantId
    const next: KPIItem = { ...item, tenantId }
    useAppStore.getState().pushActivity({
      action: "create",
      entity: "kpi-item",
      entityId: next.id,
      entityName: next.kpiCode,
    })
    set((state) => ({ kpiItems: [next, ...state.kpiItems] }))
  },
  updateKPIItem: (id, patch) =>
    set((state) => {
      const tid = useAppStore.getState().currentTenantId
      const original = state.kpiItems.find((item) => item.id === id && item.tenantId === tid)
      if (original) {
        useAppStore.getState().pushActivity({
          action: "update",
          entity: "kpi-item",
          entityId: id,
          entityName: original.kpiCode,
        })
      }
      return {
        kpiItems: state.kpiItems.map((item) => (item.id === id && item.tenantId === tid ? { ...item, ...patch } : item)),
      }
    }),
  deleteKPIItem: (id) =>
    set((state) => {
      const tid = useAppStore.getState().currentTenantId
      const original = state.kpiItems.find((item) => item.id === id && item.tenantId === tid)
      if (original) {
        useAppStore.getState().pushActivity({
          action: "delete",
          entity: "kpi-item",
          entityId: id,
          entityName: original.kpiCode,
        })
      }
      return {
        kpiItems: state.kpiItems.filter((item) => !(item.id === id && item.tenantId === tid)),
      }
    }),
  addTemplate: (template) =>
    set((state) => {
      const tenantId = template.tenantId ?? useAppStore.getState().currentTenantId
      const next: KPITemplate = { ...template, tenantId }
      useAppStore.getState().pushActivity({
        action: "create",
        entity: "kpi-template",
        entityId: next.id,
        entityName: next.templateCode,
      })
      return {
        kpiTemplates: [next, ...state.kpiTemplates],
      }
    }),
  updateTemplate: (id, patch) =>
    set((state) => {
      const tid = useAppStore.getState().currentTenantId
      return {
        kpiTemplates: state.kpiTemplates.map((item) => (item.id === id && item.tenantId === tid ? { ...item, ...patch } : item)),
      }
    }),
  deleteTemplate: (id) =>
    set((state) => {
      const tid = useAppStore.getState().currentTenantId
      const original = state.kpiTemplates.find((item) => item.id === id && item.tenantId === tid)
      if (original) {
        useAppStore.getState().pushActivity({
          action: "delete",
          entity: "kpi-template",
          entityId: id,
          entityName: original.templateCode,
        })
      }
      return {
        kpiTemplates: state.kpiTemplates.filter((item) => !(item.id === id && item.tenantId === tid)),
      }
    }),
  addAllocation: (allocation) =>
    set((state) => {
      const tenantId = allocation.tenantId ?? useAppStore.getState().currentTenantId
      const next: TemplateAllocation = { ...allocation, tenantId }
      useAppStore.getState().pushActivity({
        action: "allocate",
        entity: "template-allocation",
        entityId: next.id,
        entityName: next.allocatedTo,
      })
      return {
        allocations: [next, ...state.allocations],
      }
    }),
  upsertAllocation: (allocation) =>
    set((state) => {
      const tenantId = allocation.tenantId ?? useAppStore.getState().currentTenantId
      const next: TemplateAllocation = { ...allocation, tenantId }
      const sameKey = (a: TemplateAllocation) =>
        a.tenantId === tenantId &&
        a.allocatedTo === next.allocatedTo &&
        a.allocatedToType === next.allocatedToType &&
        a.hierarchyLevel === next.hierarchyLevel &&
        a.fiscalYear === next.fiscalYear
      const byIdIdx = next.id ? state.allocations.findIndex((a) => a.id === next.id && a.tenantId === tenantId) : -1
      const byKeyIdx = state.allocations.findIndex(sameKey)
      const idx = byIdIdx >= 0 ? byIdIdx : byKeyIdx
      if (idx >= 0) {
        const prev = state.allocations[idx]!
        const merged: TemplateAllocation = {
          ...next,
          id: prev.id,
          createdAt: prev.createdAt,
        }
        useAppStore.getState().pushActivity({
          action: "update",
          entity: "template-allocation",
          entityId: merged.id,
          entityName: merged.allocatedTo,
        })
        return {
          allocations: state.allocations.map((a, i) => (i === idx ? merged : a)),
        }
      }
      const id = next.id || crypto.randomUUID()
      const created: TemplateAllocation = { ...next, id, createdAt: next.createdAt || new Date().toISOString() }
      useAppStore.getState().pushActivity({
        action: "allocate",
        entity: "template-allocation",
        entityId: created.id,
        entityName: created.allocatedTo,
      })
      return {
        allocations: [created, ...state.allocations],
      }
    }),
  setSelectedNode: (node) => set(() => ({ selectedNode: node })),
}))
