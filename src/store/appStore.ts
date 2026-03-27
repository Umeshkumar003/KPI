import { create } from "zustand"
import { DEFAULT_TENANT_ID, TENANT_OPTIONS } from "@/lib/tenant"
import type { KPIItem } from "@/types/kpi.types"

export type AppTheme = "light" | "dark"
export type ActivityAction = "create" | "update" | "delete" | "allocate" | "distribute" | "lock" | "export"

export type ActivityLogEntry = {
  id: string
  action: ActivityAction
  entity: string
  entityId: string
  entityName: string
  userId: string
  timestamp: string
  metadata?: Record<string, string | number | boolean>
}

export type AppNotificationType = "alert" | "pending" | "success" | "info" | "approval"
export type AppNotificationCategory = "kpi-alerts" | "approvals" | "system"

export type AppNotification = {
  id: string
  type: AppNotificationType
  category: AppNotificationCategory
  title: string
  description: string
  timestamp: string
  unread: boolean
  route: string
}

export type HierarchyLevelConfig = {
  id: string
  name: string
  orgType: string
  color: string
}

export type ResponsibleOwnersMap = Record<string, string[]>

const TENANT_KEY = "kpi-current-tenant-id"

const readInitialTenantId = (): string => {
  const stored = localStorage.getItem(TENANT_KEY)
  if (stored && TENANT_OPTIONS.some((t) => t.id === stored)) return stored
  return DEFAULT_TENANT_ID
}

type AppState = {
  fiscalYear: string
  /** Active organization for multi-tenant data scoping (replace with JWT claim when backend exists). */
  currentTenantId: string
  theme: AppTheme
  recentPages: string[]
  notifications: AppNotification[]
  activityLog: ActivityLogEntry[]
  hierarchyLevels: HierarchyLevelConfig[]
  responsibleOwnersByTeamId: ResponsibleOwnersMap
  setFiscalYear: (fy: string) => void
  setCurrentTenantId: (tenantId: string) => void
  setTheme: (theme: AppTheme) => void
  toggleTheme: () => void
  addRecentPage: (path: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  pushActivity: (entry: Omit<ActivityLogEntry, "id" | "timestamp" | "userId">) => void
  setHierarchyLevels: (levels: HierarchyLevelConfig[]) => void
  setResponsibleOwnersByTeamId: (mapping: ResponsibleOwnersMap) => void
  importKPIItems: (items: KPIItem[]) => void
}

const THEME_KEY = "app-theme"

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "alert", category: "kpi-alerts", title: "Sara Al-Mutawa: Revenue KPI breached threshold", description: "Current attainment dropped below red threshold.", timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), unread: true, route: "/actuals-vs-target" },
  { id: "n2", type: "pending", category: "approvals", title: "Q2 targets for Export Team pending confirmation", description: "Approval action is required from Branch Head.", timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(), unread: true, route: "/template-allocation" },
  { id: "n3", type: "success", category: "system", title: "Sea Freight template activated successfully", description: "Template is now available for allocation.", timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(), unread: true, route: "/kpi-templates" },
  { id: "n4", type: "info", category: "system", title: "FY 2025-26 period ends in 14 days", description: "Please review pending submissions and approvals.", timestamp: new Date(Date.now() - 1000 * 60 * 130).toISOString(), unread: false, route: "/settings" },
  { id: "n5", type: "approval", category: "approvals", title: "Branch Head approved Ahmed's targets", description: "Targets are ready for period tracking.", timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), unread: true, route: "/template-allocation" },
  { id: "n6", type: "alert", category: "kpi-alerts", title: "Import Team OTD moved to amber", description: "On-Time Delivery fell to 91.7%.", timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(), unread: false, route: "/actuals-vs-target" },
  { id: "n7", type: "pending", category: "approvals", title: "Actuals pending for Q4 - Sea Freight", description: "2 KPI entries are missing for current period.", timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), unread: true, route: "/actuals-vs-target" },
  { id: "n8", type: "success", category: "system", title: "Dashboard export completed", description: "Excel export was generated and downloaded.", timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(), unread: false, route: "/actuals-vs-target" },
  { id: "n9", type: "info", category: "system", title: "Fiscal calendar updated", description: "Quarter mapping has been recalculated.", timestamp: new Date(Date.now() - 1000 * 60 * 420).toISOString(), unread: false, route: "/settings" },
  { id: "n10", type: "approval", category: "approvals", title: "Template allocation locked for Q2", description: "Distribution actions are now read-only.", timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(), unread: true, route: "/template-allocation" },
]

const DEFAULT_LEVELS: HierarchyLevelConfig[] = [
  { id: "hl-1", name: "Leadership", orgType: "Executive", color: "#1558A8" },
  { id: "hl-2", name: "Regional Head", orgType: "Regional", color: "#0C6B50" },
  { id: "hl-3", name: "Branch Head", orgType: "Branch", color: "#7A4C08" },
  { id: "hl-4", name: "Manager", orgType: "Department", color: "#962828" },
  { id: "hl-5", name: "Team Lead", orgType: "Team", color: "#7C3AED" },
  { id: "hl-6", name: "Executive", orgType: "Individual", color: "#475569" },
]

const DEFAULT_RESPONSIBLE_OWNERS_BY_TEAM_ID: ResponsibleOwnersMap = {
  "sl-import": ["se-akshai", "se-priya"],
  "sl-export": ["se-ravi"],
}

const readInitialTheme = (): AppTheme => {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === "dark" || stored === "light") return stored
  return "light"
}

export const useAppStore = create<AppState>((set) => ({
  fiscalYear: "FY 2025-26",
  currentTenantId: readInitialTenantId(),
  theme: readInitialTheme(),
  recentPages: ["/kpi-items", "/kpi-templates"],
  notifications: DEFAULT_NOTIFICATIONS,
  activityLog: [],
  hierarchyLevels: DEFAULT_LEVELS,
  responsibleOwnersByTeamId: DEFAULT_RESPONSIBLE_OWNERS_BY_TEAM_ID,
  setFiscalYear: (fy) => set(() => ({ fiscalYear: fy })),
  setCurrentTenantId: (tenantId) =>
    set(() => {
      localStorage.setItem(TENANT_KEY, tenantId)
      return { currentTenantId: tenantId }
    }),
  setTheme: (theme) =>
    set(() => {
      localStorage.setItem(THEME_KEY, theme)
      return { theme }
    }),
  toggleTheme: () =>
    set((state) => {
      const nextTheme: AppTheme = state.theme === "dark" ? "light" : "dark"
      localStorage.setItem(THEME_KEY, nextTheme)
      return { theme: nextTheme }
    }),
  addRecentPage: (path) =>
    set((state) => ({
      recentPages: [path, ...state.recentPages.filter((p) => p !== path)].slice(0, 6),
    })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, unread: false })),
    })),
  pushActivity: (entry) =>
    set((state) => ({
      activityLog: [
        {
          id: crypto.randomUUID(),
          userId: "current-user",
          timestamp: new Date().toISOString(),
          ...entry,
        },
        ...state.activityLog,
      ].slice(0, 50),
    })),
  setHierarchyLevels: (levels) => set(() => ({ hierarchyLevels: levels })),
  setResponsibleOwnersByTeamId: (mapping) => set(() => ({ responsibleOwnersByTeamId: mapping })),
  importKPIItems: () => undefined,
}))
