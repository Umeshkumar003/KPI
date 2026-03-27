import { useMemo } from "react"
import { useLocation, useParams } from "react-router-dom"
import { useTenantKpiItems } from "@/hooks/useTenantScope"

export type Crumb = { label: string; href?: string }

export function useBreadcrumbs() {
  const { pathname } = useLocation()
  const params = useParams()
  const kpiItems = useTenantKpiItems()

  return useMemo(() => {
    if (pathname === "/kpi-items") return [{ label: "Performance" }, { label: "KPI Items" }] as Crumb[]
    if (pathname === "/kpi-items/new") return [{ label: "Performance" }, { label: "KPI Items", href: "/kpi-items" }, { label: "New Item" }] as Crumb[]
    if (/^\/kpi-items\/.+\/edit$/.test(pathname)) {
      const id = params.id ?? pathname.split("/")[2]
      const item = kpiItems.find((k) => k.id === id)
      return [{ label: "Performance" }, { label: "KPI Items", href: "/kpi-items" }, { label: `${item?.kpiCode ?? "KPI Item"} - Edit` }] as Crumb[]
    }
    if (pathname === "/kpi-templates") return [{ label: "Performance" }, { label: "KPI Templates" }] as Crumb[]
    if (pathname === "/kpi-templates/new") return [{ label: "Performance" }, { label: "KPI Templates", href: "/kpi-templates" }, { label: "New Template" }] as Crumb[]
    if (pathname === "/template-allocation") return [{ label: "Performance" }, { label: "Template Allocation" }] as Crumb[]
    if (pathname === "/actuals-vs-target") return [{ label: "Performance" }, { label: "Dashboard" }] as Crumb[]
    if (pathname === "/responsible-targets") return [{ label: "Performance" }, { label: "Responsible Targets" }] as Crumb[]
    if (pathname === "/settings") return [{ label: "Settings" }] as Crumb[]
    return [{ label: "Performance" }] as Crumb[]
  }, [kpiItems, params.id, pathname])
}
