import { Navigate, createBrowserRouter } from "react-router-dom"
import { lazy } from "react"
import { AppShell } from "@/components/layout/AppShell"

const KPIItemsPage = lazy(() => import("@/pages/KPIItems"))
const KPIItemForm = lazy(() => import("@/pages/KPIItems/KPIItemForm"))
const KPITemplatesPage = lazy(() => import("@/pages/KPITemplates"))
const TemplateForm = lazy(() => import("@/pages/KPITemplates/TemplateForm"))
const TemplateAllocationPage = lazy(() => import("@/pages/TemplateAllocation"))
const PeriodTrackerPage = lazy(() => import("@/pages/PeriodTracker"))
const ActualsVsTargetPage = lazy(() => import("@/pages/ActualsVsTarget"))
const SettingsPage = lazy(() => import("@/pages/Settings"))

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/kpi-items" replace /> },
      { path: "kpi-items", element: <KPIItemsPage /> },
      { path: "kpi-items/new", element: <KPIItemForm /> },
      { path: "kpi-templates", element: <KPITemplatesPage /> },
      { path: "kpi-templates/new", element: <TemplateForm /> },
      { path: "template-allocation", element: <TemplateAllocationPage /> },
      { path: "period-tracker", element: <PeriodTrackerPage /> },
      { path: "actuals-vs-target", element: <ActualsVsTargetPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
])
