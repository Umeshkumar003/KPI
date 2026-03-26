import { useMemo } from "react"
import { useAppStore } from "@/store/appStore"
import { useKPIStore } from "@/store/kpiStore"

/** KPI items visible for the active tenant. */
export function useTenantKpiItems() {
  const tenantId = useAppStore((s) => s.currentTenantId)
  const kpiItems = useKPIStore((s) => s.kpiItems)
  return useMemo(() => kpiItems.filter((i) => i.tenantId === tenantId), [kpiItems, tenantId])
}

export function useTenantKpiTemplates() {
  const tenantId = useAppStore((s) => s.currentTenantId)
  const kpiTemplates = useKPIStore((s) => s.kpiTemplates)
  return useMemo(() => kpiTemplates.filter((t) => t.tenantId === tenantId), [kpiTemplates, tenantId])
}

export function useTenantAllocations() {
  const tenantId = useAppStore((s) => s.currentTenantId)
  const allocations = useKPIStore((s) => s.allocations)
  return useMemo(() => allocations.filter((a) => a.tenantId === tenantId), [allocations, tenantId])
}

export function useTenantActuals() {
  const tenantId = useAppStore((s) => s.currentTenantId)
  const actuals = useKPIStore((s) => s.actuals)
  return useMemo(() => actuals.filter((a) => a.tenantId === tenantId), [actuals, tenantId])
}

export function useCurrentTenantId() {
  return useAppStore((s) => s.currentTenantId)
}
