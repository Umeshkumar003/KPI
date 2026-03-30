import type { PeriodType } from "@/types/kpi.types"
import { kpiCodeForVisionProduct, VISION_PRODUCT_ORDER } from "@/data/visionCentralDubai"

/** Unit types supported by the simplified KPI item form. */
export type KPIFormUnitType = "currency" | "number"

/** Must match `calculationTypeOptions` / `roleOptions` / trend in `KPIItemForm`. */
type FormCalculationType = "auto" | "manual" | "percentage"
type FormUserRole = "pricing-exec" | "pricing-mgr" | "ops-exec" | "ops-mgr" | "senior-mgmt" | "branch-head"
type FormTrendDirection = "higher-better" | "lower-better" | "target-range"

export type KPIImportEntry = {
  id: string
  /** Short label shown in the list (usually matches seeded `itemName`). */
  name: string
  definitionName: string
  description: string
  unitType: KPIFormUnitType
  calculationType: FormCalculationType
  periodType: PeriodType
  dataSource: string
  visibleRoles: FormUserRole[]
  aggregation: string
  trendDirection: FormTrendDirection
  /** When set, fills KPI code and turns on manual code mode (e.g. Vision `VC-*` or seed codes). */
  suggestedKpiCode?: string
}

export type KPIImportGroup = {
  id: string
  title: string
  subtitle?: string
  entries: KPIImportEntry[]
}

function visionFormUnit(name: string): KPIFormUnitType {
  if (name.includes("SALES") || name === "GP" || name === "SALES COLLECTION") return "currency"
  return "number"
}

function visionEntries(): KPIImportEntry[] {
  return VISION_PRODUCT_ORDER.map((productName) => ({
    id: `vision-${productName}`,
    name: productName,
    definitionName: `${productName} (Vision Central Dubai)`,
    description: `Imported from Vision Central 2025 — Dubai workbook.`,
    unitType: visionFormUnit(productName),
    calculationType: "manual",
    periodType: "annual" as PeriodType,
    dataSource: "VISION CENTRAL 2025 - Dubai.xlsx",
    visibleRoles: ["branch-head", "ops-exec"],
    aggregation: "Sum",
    trendDirection: "higher-better",
    suggestedKpiCode: kpiCodeForVisionProduct(productName),
  }))
}

/** Same definitions as `SEED_KPI_ITEMS` non–Vision rows in `kpiStore.ts`, adapted to the current form. */
const coreFreightEntries: KPIImportEntry[] = [
  {
    id: "seed-otd-sea",
    name: "On-Time Delivery %",
    definitionName: "On-Time Delivery Performance",
    description: "Percentage of on-time deliveries for Sea shipments",
    unitType: "number",
    calculationType: "auto",
    periodType: "monthly",
    dataSource: "TMS",
    visibleRoles: ["ops-exec"],
    aggregation: "Average",
    trendDirection: "higher-better",
    suggestedKpiCode: "OTD-SEA",
  },
  {
    id: "seed-rev-tot",
    name: "Total Revenue",
    definitionName: "Total Revenue",
    description: "Total revenue across all trade directions",
    unitType: "currency",
    calculationType: "auto",
    periodType: "monthly",
    dataSource: "ERP",
    visibleRoles: ["pricing-mgr"],
    aggregation: "Sum",
    trendDirection: "higher-better",
    suggestedKpiCode: "REV-TOT",
  },
  {
    id: "seed-qte-cnv",
    name: "Quote Conversion Rate",
    definitionName: "Quote Conversion Rate",
    description: "Conversion rate from quotes to confirmed bookings",
    unitType: "number",
    calculationType: "auto",
    periodType: "monthly",
    dataSource: "CRM",
    visibleRoles: ["branch-head"],
    aggregation: "Average",
    trendDirection: "higher-better",
    suggestedKpiCode: "QTE-CNV",
  },
  {
    id: "seed-shp-vol",
    name: "Shipment Volume",
    definitionName: "Shipment Volume",
    description: "Total shipment volume",
    unitType: "number",
    calculationType: "auto",
    periodType: "monthly",
    dataSource: "TMS",
    visibleRoles: ["ops-mgr"],
    aggregation: "Sum",
    trendDirection: "higher-better",
    suggestedKpiCode: "SHP-VOL",
  },
  {
    id: "seed-cst-sat",
    name: "Customer Satisfaction",
    definitionName: "Customer Satisfaction",
    description: "Average customer satisfaction score",
    unitType: "number",
    calculationType: "manual",
    periodType: "monthly",
    dataSource: "CRM",
    visibleRoles: ["ops-exec"],
    aggregation: "Average",
    trendDirection: "higher-better",
    suggestedKpiCode: "CST-SAT",
  },
]

export const KPI_IMPORT_LIBRARY_GROUPS: KPIImportGroup[] = [
  {
    id: "vision-central-dubai",
    title: "Vision Central 2025 — Dubai",
    subtitle: "Same product rows as the Dubai workbook and Vision template",
    entries: visionEntries(),
  },
  {
    id: "core-freight",
    title: "Core freight KPIs",
    subtitle: "Definitions aligned with seeded template KPIs",
    entries: coreFreightEntries,
  },
]

export function filterKpiImportLibrary(groups: KPIImportGroup[], query: string): KPIImportGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.definitionName.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.entries.length > 0)
}
