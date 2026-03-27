export type KPICategory =
  | "delivery"
  | "operational"
  | "customer"
  | "financial"
  | "compliance"
  | "sustainability"
  | "capacity"

export type ShipmentMode = "sea" | "air" | "road" | "rail" | "multimodal" | "courier"
export type TradeDirection =
  | "import"
  | "export"
  | "cross-trade"
  | "import-clearance"
  | "export-clearance"
export type UnitType =
  | "percentage"
  | "number"
  | "currency"
  | "days"
  | "hours"
  | "teu"
  | "cbm"
  | "tonnes"
  | "score"
  | "ratio"
export type CalculationType =
  | "auto"
  | "manual"
  | "percentage"
  | "formula"
  | "cumulative-ytd"
  | "rolling-avg"
  | "weighted-avg"
export type PeriodType = "monthly" | "quarterly" | "annual" | "weekly" | "daily"
export type TrendDirection = "higher-better" | "lower-better" | "target-range"
export type KPIStatus = "draft" | "active" | "archived"
export type BusinessScope = "freight" | "corporate"
export type UserRole =
  | "pricing-exec"
  | "pricing-mgr"
  | "ops-exec"
  | "ops-mgr"
  | "senior-mgmt"
  | "branch-head"
  | "leadership"
  | "sales-manager"
  | "sales-lead"
  | "sales-executive"
export type HierarchyLevel =
  | "leadership"
  | "branch-head"
  | "sales-manager"
  | "sales-lead"
  | "sales-executive"
export type RAGStatus = "green" | "amber" | "red"

export interface KPIItem {
  /** Owning organization (multi-tenant isolation). */
  tenantId: string
  id: string
  definitionName: string
  kpiCode: string
  itemName: string
  category: KPICategory
  description: string
  businessScope?: BusinessScope
  shipmentModes: ShipmentMode[]
  tradeDirections: TradeDirection[]
  jobType: string
  regionScope: string
  unitType: UnitType
  calculationType: CalculationType
  periodType: PeriodType
  aggregation: string
  trendDirection: TrendDirection
  dataSource: string
  formula?: string
  thresholds: {
    green: { min: number; max: number }
    amber: { min: number; max: number }
    red: { min: number; max: number }
  }
  allowCarryForward: boolean
  carryForwardMissingValue?: number
  showInBuildScreen: boolean
  enableAlerts: boolean
  weightedScoring: boolean
  visibleRoles: UserRole[]
  weight: number
  statusId: KPIStatus
  createdAt: string
  updatedAt: string
}

export interface TemplateKPIItem {
  kpiItemId: string
  kpiCode: string
  kpiName: string
  unitType: UnitType
  weight: number
  displayOrder: number
}

export interface KPITemplate {
  tenantId: string
  id: string
  templateName: string
  templateCode: string
  category: string
  businessScope?: BusinessScope
  applicableRoles: UserRole[]
  shipmentModes: ShipmentMode[]
  periodType: PeriodType
  description: string
  statusId: KPIStatus
  kpiItems: TemplateKPIItem[]
  createdAt: string
  version?: number
  lastUpdatedAt?: string
  lastUpdatedBy?: string
  changelog?: Array<{
    version: number
    date: string
    changedBy: string
    changes: string
  }>
}

export interface KPITarget {
  kpiItemId: string
  kpiCode: string
  kpiName: string
  unitType: UnitType
  weight: number
  annualTarget: number
  h1Target: number
  h2Target: number
  q1Target: number
  q2Target: number
  q3Target: number
  q4Target: number
}

export interface TemplateAllocation {
  tenantId: string
  id: string
  templateId: string
  allocatedTo: string
  allocatedToType: "individual" | "team"
  hierarchyLevel: HierarchyLevel
  fiscalYear: string
  periodType: PeriodType
  targets: KPITarget[]
  statusId: "draft" | "confirmed" | "locked"
  createdAt: string
}

export interface ActualEntry {
  tenantId: string
  id: string
  allocationId: string
  employeeId: string
  employeeName: string
  role: UserRole
  kpiItemId: string
  kpiName: string
  unitType: UnitType
  target: number
  actual: number
  attainmentPct: number
  priorPeriodPct: number
  ragStatus: RAGStatus
  trend: number[]
  period: string
  fiscalYear: string
}

export interface HierarchyNode {
  id: string
  name: string
  role: HierarchyLevel
  region: string
  parentId: string | null
  children: HierarchyNode[]
  allocationStatus: "allocated" | "partial" | "none"
}
