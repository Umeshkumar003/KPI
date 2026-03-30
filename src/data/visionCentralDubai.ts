/**
 * Vision Central 2025 — Dubai (VISION CENTRAL 2025 - Dubai.xlsx)
 * Aggregations: Dubai central → branch; sum of 8 managers/executives → Sea Freight;
 * Dileep+Krishna+Sajeer+Akshai → Import Team; Guru+Vishnu+Vishnu Muraly+Eric → Export Team.
 */
import type {
  ActualEntry,
  HierarchyLevel,
  HierarchyNode,
  KPIItem,
  KPITarget,
  KPITemplate,
  KPICategory,
  RAGStatus,
  TemplateAllocation,
  UnitType,
  UserRole,
} from "@/types/kpi.types"
import { autoDistribute } from "@/lib/utils"
import visionJson from "./vision-central-dubai-2025.json"

type VisionCell = { t: number | null; a: number | null }
export type VisionBlock = Record<string, VisionCell>

type VisionFile = {
  dubaiCentral: VisionBlock
  managersBlock1: Record<"Dileep" | "Guru" | "Krishna" | "Vishnu", VisionBlock>
  managersBlock2: Record<"Sajeer" | "Akshai" | "Vishnu Muraly" | "Eric", VisionBlock>
}

const data = visionJson as VisionFile

const FREIGHT_ROLES: UserRole[] = [
  "leadership",
  "branch-head",
  "sales-manager",
  "sales-lead",
  "sales-executive",
]

export const VISION_PRODUCT_ORDER = [
  "NEW CUSTOMER",
  "TOTAL JOBS",
  "TOTAL SALES",
  "SALES COLLECTION",
  "GP",
  "ENQUIRY",
  "IMPORT SEA JOBS",
  "EXPORT SEA JOBS",
  "IMPORT SEA CTNR",
  "EXPORT SEA CTNR",
  "AIR IMPORT JOBS",
  "AIR EXPORT JOBS",
  "AIR IMPORT TONS",
  "AIR EXPORT TONS",
  "OVERLAND",
  "WAREHOUSING JOBS",
  "PROJECT/ BREAKBULK",
  "SALES BLITZ",
  "100 DIAL",
  "OUTDOOR EVENT",
] as const

function categoryForProduct(name: string): KPICategory {
  if (name.includes("SALES") || name === "GP" || name === "SALES COLLECTION") return "financial"
  if (name.includes("CUSTOMER") || name.includes("ENQUIRY")) return "customer"
  if (name.includes("JOBS") || name.includes("CTNR") || name.includes("OVERLAND") || name.includes("WAREHOUSING")) return "operational"
  if (name.includes("TONS")) return "capacity"
  return "operational"
}

function unitForProduct(name: string): UnitType {
  if (name.includes("SALES") || name === "GP" || name === "SALES COLLECTION") return "currency"
  if (name.includes("TONS")) return "tonnes"
  return "number"
}

export function kpiIdForVisionProduct(name: string): string {
  return `kpi-vc-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`
}

export function kpiCodeForVisionProduct(name: string): string {
  const slug = name
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18)
    .toUpperCase()
  return `VC-${slug || "KPI"}`
}

function numT(cell: VisionCell | undefined): number {
  const v = cell?.t
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

function numA(cell: VisionCell | undefined): number {
  const v = cell?.a
  return typeof v === "number" && Number.isFinite(v) ? v : 0
}

/** Sum achieved (ACHIEVED column) across manager blocks — mirrors target rollups. */
export function aggregateVisionAchieved(blocks: VisionBlock[]): VisionBlock {
  const keys = new Set<string>()
  for (const b of blocks) {
    Object.keys(b).forEach((k) => keys.add(k))
  }
  const out: VisionBlock = {}
  for (const k of keys) {
    let sum = 0
    for (const b of blocks) {
      sum += numA(b[k])
    }
    out[k] = { t: null, a: sum }
  }
  return out
}

export function aggregateVisionBlocks(blocks: VisionBlock[]): VisionBlock {
  const keys = new Set<string>()
  for (const b of blocks) {
    Object.keys(b).forEach((k) => keys.add(k))
  }
  const out: VisionBlock = {}
  for (const k of keys) {
    let sum = 0
    for (const b of blocks) {
      sum += numT(b[k])
    }
    out[k] = { t: sum, a: null }
  }
  return out
}

function weightsFromBlock(block: VisionBlock): Record<string, number> {
  let sum = 0
  const raw: Record<string, number> = {}
  for (const name of VISION_PRODUCT_ORDER) {
    const v = Math.abs(numT(block[name]))
    raw[name] = v
    sum += v
  }
  const w: Record<string, number> = {}
  if (sum <= 0) {
    const n = VISION_PRODUCT_ORDER.length
    for (const name of VISION_PRODUCT_ORDER) w[name] = Math.round(100 / n)
    return w
  }
  let allocated = 0
  for (let i = 0; i < VISION_PRODUCT_ORDER.length; i++) {
    const name = VISION_PRODUCT_ORDER[i]!
    if (i === VISION_PRODUCT_ORDER.length - 1) {
      w[name] = Math.max(1, 100 - allocated)
    } else {
      const wi = Math.max(1, Math.round((raw[name]! / sum) * 100))
      w[name] = wi
      allocated += wi
    }
  }
  return w
}

export function buildVisionTargets(block: VisionBlock): KPITarget[] {
  const wmap = weightsFromBlock(block)
  let order = 0
  const rows: KPITarget[] = []
  for (const name of VISION_PRODUCT_ORDER) {
    if (!(name in block)) continue
    const annualTarget = numT(block[name])
    const split = autoDistribute(annualTarget)
    order += 1
    rows.push({
      kpiItemId: kpiIdForVisionProduct(name),
      kpiCode: kpiCodeForVisionProduct(name),
      kpiName: name,
      unitType: unitForProduct(name),
      weight: wmap[name] ?? 1,
      annualTarget,
      h1Target: split.h1,
      h2Target: split.h2,
      q1Target: split.q1,
      q2Target: split.q2,
      q3Target: split.q3,
      q4Target: split.q4,
    })
  }
  return rows
}

const b1 = data.managersBlock1
const b2 = data.managersBlock2
const dubai = data.dubaiCentral

const seaFreightBlock = aggregateVisionBlocks([b1.Dileep, b1.Guru, b1.Krishna, b1.Vishnu, b2.Sajeer, b2.Akshai, b2["Vishnu Muraly"], b2.Eric])
const importTeamBlock = aggregateVisionBlocks([b1.Dileep, b1.Krishna, b2.Sajeer, b2.Akshai])
const exportTeamBlock = aggregateVisionBlocks([b1.Guru, b1.Vishnu, b2["Vishnu Muraly"], b2.Eric])

const seaAchieved = aggregateVisionAchieved([b1.Dileep, b1.Guru, b1.Krishna, b1.Vishnu, b2.Sajeer, b2.Akshai, b2["Vishnu Muraly"], b2.Eric])
const importAchieved = aggregateVisionAchieved([b1.Dileep, b1.Krishna, b2.Sajeer, b2.Akshai])
const exportAchieved = aggregateVisionAchieved([b1.Guru, b1.Vishnu, b2["Vishnu Muraly"], b2.Eric])

/** Initial allocation table per hierarchy node id (FY 2025-26 Dubai Vision). */
export const VISION_INITIAL_NODE_TARGETS: Record<string, KPITarget[]> = {
  leadership: buildVisionTargets(dubai),
  "branch-dubai": buildVisionTargets(dubai),
  "sm-sea": buildVisionTargets(seaFreightBlock),
  "sl-import": buildVisionTargets(importTeamBlock),
  "sl-export": buildVisionTargets(exportTeamBlock),
  "se-ahmed": buildVisionTargets(b1.Dileep),
  "se-priya": buildVisionTargets(b1.Krishna),
  "se-ravi": buildVisionTargets(b1.Guru),
  "se-sara": buildVisionTargets(b1.Vishnu),
  "se-sajeer": buildVisionTargets(b2.Sajeer),
  "se-akshai": buildVisionTargets(b2.Akshai),
  "se-vishnu-muraly": buildVisionTargets(b2["Vishnu Muraly"]),
  "se-eric": buildVisionTargets(b2.Eric),
}

export function totalSalesFromBlock(block: VisionBlock): number {
  return numT(block["TOTAL SALES"])
}

/** Flow cascade amounts (TOTAL SALES currency) aligned to hierarchy. */
export function getVisionFlowAmounts(node: HierarchyNode | null): {
  slots: Array<{ role: HierarchyLevel; label: string; unitName: string; amount: number }>
} {
  if (!node) return { slots: [] }
  const dc = totalSalesFromBlock(dubai)
  const sea = totalSalesFromBlock(seaFreightBlock)
  const imp = totalSalesFromBlock(importTeamBlock)
  const exp = totalSalesFromBlock(exportTeamBlock)
  const execAmount = (): number => {
    if (node.id === "se-ahmed") return totalSalesFromBlock(b1.Dileep)
    if (node.id === "se-priya") return totalSalesFromBlock(b1.Krishna)
    if (node.id === "se-ravi") return totalSalesFromBlock(b1.Guru)
    if (node.id === "se-sara") return totalSalesFromBlock(b1.Vishnu)
    if (node.id === "se-sajeer") return totalSalesFromBlock(b2.Sajeer)
    if (node.id === "se-akshai") return totalSalesFromBlock(b2.Akshai)
    if (node.id === "se-vishnu-muraly") return totalSalesFromBlock(b2["Vishnu Muraly"])
    if (node.id === "se-eric") return totalSalesFromBlock(b2.Eric)
    if (node.id === "sl-import") return imp
    if (node.id === "sl-export") return exp
    if (node.id === "sm-sea") return sea
    if (node.id === "branch-dubai") return dc
    if (node.id === "leadership") return dc
    return totalSalesFromBlock(b1.Dileep)
  }
  const leadAmount = (): number => {
    if (node.role === "sales-lead") {
      return node.id === "sl-export" ? exp : imp
    }
    if (node.role === "sales-executive") {
      if (node.parentId === "sl-export") return exp
      if (node.parentId === "sl-import") return imp
    }
    return imp
  }
  const leadUnitName = (): string => {
    if (node.role === "sales-lead") return node.name
    if (node.parentId === "sl-export") return "Export Team"
    if (node.parentId === "sl-import") return "Import Team"
    return "Team"
  }
  return {
    slots: [
      { role: "leadership", label: "Leadership", unitName: "Corporate HQ", amount: dc },
      { role: "branch-head", label: "Branch Head", unitName: "Dubai, UAE", amount: dc },
      { role: "sales-manager", label: "Sales Mgr", unitName: "Sea Freight Dept", amount: sea },
      { role: "sales-lead", label: "Lead", unitName: leadUnitName(), amount: leadAmount() },
      { role: "sales-executive", label: "Exec", unitName: node.name, amount: execAmount() },
    ],
  }
}

function visionKpiItemRow(name: string): Omit<KPIItem, "tenantId"> {
  const unitType = unitForProduct(name)
  const cat = categoryForProduct(name)
  const id = kpiIdForVisionProduct(name)
  const code = kpiCodeForVisionProduct(name)
  return {
    id,
    definitionName: `${name} (Vision Central Dubai)`,
    kpiCode: code,
    itemName: name,
    category: cat,
    description: `Imported from Vision Central 2025 — Dubai workbook.`,
    businessScope: "freight",
    shipmentModes: ["sea", "air", "road", "multimodal"],
    tradeDirections: ["import", "export", "cross-trade"],
    jobType: "Sales",
    regionScope: "UAE",
    unitType,
    calculationType: "manual",
    periodType: "annual",
    aggregation: "Sum",
    trendDirection: "higher-better",
    dataSource: "VISION CENTRAL 2025 - Dubai.xlsx",
    thresholds: {
      green: { min: 95, max: 100 },
      amber: { min: 80, max: 94.99 },
      red: { min: 0, max: 79.99 },
    },
    allowCarryForward: true,
    showInBuildScreen: true,
    enableAlerts: true,
    weightedScoring: true,
    visibleRoles: FREIGHT_ROLES,
    weight: 5,
    statusId: "active",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  }
}

export const VISION_KPI_ITEMS_SEED: Omit<KPIItem, "tenantId">[] = VISION_PRODUCT_ORDER.map((name) => visionKpiItemRow(name))

export const VISION_TEMPLATE_SEED: Omit<KPITemplate, "tenantId"> = {
  id: "tmpl-vision-central-dubai-2025",
  businessScope: "freight",
  templateName: "Vision Central 2025 — Dubai",
  templateCode: "VC-DXB-2025",
  category: "Sales",
  applicableRoles: FREIGHT_ROLES,
  shipmentModes: ["sea", "air", "road", "multimodal"],
  tradeDirections: ["import", "export", "cross-trade"],
  jobType: "All",
  periodType: "annual",
  description: "Targets from VISION CENTRAL 2025 - Dubai.xlsx (Dubai central + manager rollups).",
  statusId: "active",
  kpiItems: VISION_PRODUCT_ORDER.map((name, idx) => ({
    kpiItemId: kpiIdForVisionProduct(name),
    kpiCode: kpiCodeForVisionProduct(name),
    kpiName: name,
    unitType: unitForProduct(name),
    weight: weightsFromBlock(dubai)[name] ?? 5,
    displayOrder: idx + 1,
  })),
  createdAt: "2025-01-01T00:00:00.000Z",
  version: 1,
  lastUpdatedAt: "2025-01-01T00:00:00.000Z",
  lastUpdatedBy: "Vision Central import",
  changelog: [{ version: 1, date: "2025-01-01T00:00:00.000Z", changedBy: "System", changes: "Seeded from Dubai workbook." }],
}

function alloc(
  id: string,
  allocatedTo: string,
  role: HierarchyLevel,
  type: "individual" | "team",
  targets: KPITarget[],
  status: TemplateAllocation["statusId"],
): Omit<TemplateAllocation, "tenantId"> {
  return {
    id,
    templateId: "tmpl-vision-central-dubai-2025",
    allocatedTo,
    allocatedToType: type,
    hierarchyLevel: role,
    fiscalYear: "FY 2025-26",
    periodType: "annual",
    statusId: status,
    createdAt: "2025-01-01T00:00:00.000Z",
    targets: targets.map((t) => ({ ...t })),
  }
}

export const VISION_ALLOCATIONS_SEED: Omit<TemplateAllocation, "tenantId">[] = [
  alloc("alloc-vc-leadership", "Corporate HQ", "leadership", "team", VISION_INITIAL_NODE_TARGETS.leadership!, "confirmed"),
  alloc("alloc-vc-dubai", "Dubai, UAE", "branch-head", "team", VISION_INITIAL_NODE_TARGETS["branch-dubai"]!, "confirmed"),
  alloc("alloc-vc-sea", "Sea Freight Dept", "sales-manager", "team", VISION_INITIAL_NODE_TARGETS["sm-sea"]!, "draft"),
  alloc("alloc-vc-import", "Import Team", "sales-lead", "team", VISION_INITIAL_NODE_TARGETS["sl-import"]!, "draft"),
  alloc("alloc-vc-export", "Export Team", "sales-lead", "team", VISION_INITIAL_NODE_TARGETS["sl-export"]!, "confirmed"),
  alloc("alloc-vc-dileep", "Dileep", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-ahmed"]!, "confirmed"),
  alloc("alloc-vc-krishna", "Krishna", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-priya"]!, "confirmed"),
  alloc("alloc-vc-guru", "Guru", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-ravi"]!, "draft"),
  alloc("alloc-vc-vishnu", "Vishnu", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-sara"]!, "draft"),
  alloc("alloc-vc-sajeer", "Sajeer", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-sajeer"]!, "draft"),
  alloc("alloc-vc-akshai", "Akshai", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-akshai"]!, "draft"),
  alloc("alloc-vc-vishnu-muraly", "Vishnu Muraly", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-vishnu-muraly"]!, "draft"),
  alloc("alloc-vc-eric", "Eric", "sales-executive", "individual", VISION_INITIAL_NODE_TARGETS["se-eric"]!, "draft"),
]

function ragFromAttainmentPct(pct: number): RAGStatus {
  if (pct >= 100) return "green"
  if (pct >= 85) return "amber"
  return "red"
}

function trendFromAttainment(att: number): number[] {
  const steps = [0.82, 0.86, 0.89, 0.92, 0.96, 1]
  return steps.map((s) => Math.round(Math.min(999, att * s) * 10) / 10)
}

function buildVisionActualRows(
  allocationId: string,
  employeeId: string,
  employeeName: string,
  role: UserRole,
  targetBlock: VisionBlock,
  achievedBlock: VisionBlock,
  idPrefix: string,
): Omit<ActualEntry, "tenantId">[] {
  const rows: Omit<ActualEntry, "tenantId">[] = []
  let seq = 0
  for (const name of VISION_PRODUCT_ORDER) {
    const target = numT(targetBlock[name])
    const actual = numA(achievedBlock[name])
    if (target <= 0 && actual <= 0) continue
    const attainmentPct = target > 0 ? Math.min(999, (actual / target) * 100) : actual > 0 ? 100 : 0
    const rounded = Math.round(attainmentPct * 100) / 100
    seq += 1
    rows.push({
      id: `${idPrefix}-vc-${seq}`,
      allocationId,
      employeeId,
      employeeName,
      role,
      kpiItemId: kpiIdForVisionProduct(name),
      kpiName: name,
      unitType: unitForProduct(name),
      target,
      actual,
      attainmentPct: rounded,
      priorPeriodPct: 0,
      ragStatus: ragFromAttainmentPct(rounded),
      trend: trendFromAttainment(rounded),
      period: "YTD",
      fiscalYear: "FY 2025-26",
    })
  }
  return rows
}

/** Actual vs target rows from Excel TARGET + ACHIEVED columns (same source as template allocation). */
export const VISION_ACTUALS_SEED: Omit<ActualEntry, "tenantId">[] = [
  ...buildVisionActualRows("alloc-vc-leadership", "emp-vc-hq", "Corporate HQ", "leadership", dubai, dubai, "avc-hq"),
  ...buildVisionActualRows("alloc-vc-dubai", "emp-vc-dubai", "Dubai, UAE", "branch-head", dubai, dubai, "avc-dubai"),
  ...buildVisionActualRows("alloc-vc-sea", "emp-vc-sea", "Sea Freight Dept", "sales-manager", seaFreightBlock, seaAchieved, "avc-sea"),
  ...buildVisionActualRows("alloc-vc-import", "emp-vc-import", "Import Team", "sales-lead", importTeamBlock, importAchieved, "avc-import"),
  ...buildVisionActualRows("alloc-vc-export", "emp-vc-export", "Export Team", "sales-lead", exportTeamBlock, exportAchieved, "avc-export"),
  ...buildVisionActualRows("alloc-vc-dileep", "emp-vc-dileep", "Dileep", "sales-executive", b1.Dileep, b1.Dileep, "avc-dileep"),
  ...buildVisionActualRows("alloc-vc-krishna", "emp-vc-krishna", "Krishna", "sales-executive", b1.Krishna, b1.Krishna, "avc-krishna"),
  ...buildVisionActualRows("alloc-vc-guru", "emp-vc-guru", "Guru", "sales-executive", b1.Guru, b1.Guru, "avc-guru"),
  ...buildVisionActualRows("alloc-vc-vishnu", "emp-vc-vishnu", "Vishnu", "sales-executive", b1.Vishnu, b1.Vishnu, "avc-vishnu"),
  ...buildVisionActualRows("alloc-vc-sajeer", "emp-vc-sajeer", "Sajeer", "sales-executive", b2.Sajeer, b2.Sajeer, "avc-sajeer"),
  ...buildVisionActualRows("alloc-vc-akshai", "emp-vc-akshai", "Akshai", "sales-executive", b2.Akshai, b2.Akshai, "avc-akshai"),
  ...buildVisionActualRows("alloc-vc-vishnu-muraly", "emp-vc-vishnu-muraly", "Vishnu Muraly", "sales-executive", b2["Vishnu Muraly"], b2["Vishnu Muraly"], "avc-vishnu-muraly"),
  ...buildVisionActualRows("alloc-vc-eric", "emp-vc-eric", "Eric", "sales-executive", b2.Eric, b2.Eric, "avc-eric"),
]
