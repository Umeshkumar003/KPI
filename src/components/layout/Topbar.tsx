import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  FileCheck,
  FileText,
  History,
  Info,
  Layers,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb as ShadcnBreadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTenantActuals, useTenantKpiItems, useTenantKpiTemplates } from "@/hooks/useTenantScope"
import { cn } from "@/lib/utils"
import { TENANT_OPTIONS } from "@/lib/tenant"
import { useAppStore } from "@/store/appStore"
import type { ActualEntry, KPIItem, KPITemplate } from "@/types/kpi.types"

export type TopbarBreadcrumb = { label: string; href?: string }

export function Topbar({
  title,
  breadcrumbs: breadcrumbsProp,
}: {
  title: string
  breadcrumbs: TopbarBreadcrumb[]
}) {
  const navigate = useNavigate()
  const breadcrumbs = breadcrumbsProp ?? []

  const kpiItems = useTenantKpiItems()
  const templates = useTenantKpiTemplates()
  const actuals = useTenantActuals()
  const currentTenantId = useAppStore((s) => s.currentTenantId)
  const setCurrentTenantId = useAppStore((s) => s.setCurrentTenantId)
  const notifications = useAppStore((s) => s.notifications ?? [])
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead)
  const markNotificationRead = useAppStore((s) => s.markNotificationRead)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const fiscalYear = useAppStore((s) => s.fiscalYear)
  const setFiscalYear = useAppStore((s) => s.setFiscalYear)
  const recentPages = useAppStore((s) => s.recentPages ?? [])

  const fyOptions = useMemo(
    () => [
      { value: "fy-2025-26", label: "FY 2025-26" },
      { value: "fy-2024-25", label: "FY 2024-25" },
      { value: "fy-2023-24", label: "FY 2023-24" },
    ],
    [],
  )

  const [fyValue, setFyValue] = useState<string>("fy-2025-26")

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications])
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "kpi-alerts" | "approvals" | "system">("all")

  // Global search dialog (Cmd/Ctrl + K)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const employees = useMemo(() => {
    const map = new Map<string, ActualEntry>()
    for (const a of actuals) {
      const key = a.employeeId ?? a.employeeName
      if (!map.has(key)) map.set(key, a)
    }
    return [...map.values()]
  }, [actuals])

  type SearchGroup = {
    key: "recent" | "actions" | "items" | "templates" | "employees"
    label: string
    icon: ReactNode
    hint?: string
    items: Array<
      | { kind: "recent"; label: string; route: string; hint: string }
      | { kind: "action"; label: string; action: "new-kpi" | "new-template" | "export-dashboard" | "toggle-theme" | "switch-fy"; hint: string }
      | { kind: "items"; kpi: KPIItem }
      | { kind: "templates"; template: KPITemplate }
      | { kind: "employees"; employee: ActualEntry }
    >
  }

  const searchGroups = useMemo<SearchGroup[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return [
        {
          key: "recent",
          label: "Recently Visited",
          icon: <History className="h-4 w-4" />,
          items: recentPages.map((route) => ({ kind: "recent", label: route, route, hint: "Enter" })),
        },
      ]
    }

    const itemMatches = kpiItems
      .filter((it) => `${it.kpiCode} ${it.itemName} ${it.definitionName}`.toLowerCase().includes(q))
      .slice(0, 6)

    const templateMatches = templates
      .filter((t) => `${t.templateCode} ${t.templateName}`.toLowerCase().includes(q))
      .slice(0, 6)

    const employeeMatches = employees
      .filter((e) => `${e.employeeName}`.toLowerCase().includes(q))
      .slice(0, 6)

    const actionDefs: Array<{
      label: string
      action: "new-kpi" | "new-template" | "export-dashboard" | "toggle-theme" | "switch-fy"
      hint: string
    }> = [
      { label: "New KPI Item", action: "new-kpi", hint: "Cmd+N" },
      { label: "New Template", action: "new-template", hint: "Cmd+N" },
      { label: "Export Dashboard", action: "export-dashboard", hint: "E" },
      { label: `Switch FY to ${fiscalYear}`, action: "switch-fy", hint: "F" },
      { label: "Toggle Dark Mode", action: "toggle-theme", hint: "Shift+Cmd+D" },
    ]
    const actionMatches = actionDefs.filter((a) => a.label.toLowerCase().includes(q))

    const groups: SearchGroup[] = [{
      key: "recent",
      label: "Recently Visited",
      icon: <History className="h-4 w-4" />,
      items: recentPages.filter((route) => route.toLowerCase().includes(q)).map((route) => ({ kind: "recent", label: route, route, hint: "Enter" })),
    }]
    if (actionMatches.length) {
      groups.push({
        key: "actions",
        label: "Actions",
        icon: <Settings className="h-4 w-4" />,
        items: actionMatches.map((item) => ({ kind: "action", ...item })),
      })
    }
    if (itemMatches.length) {
      groups.push({
        key: "items",
        label: "KPI Items",
        icon: <FileText className="h-4 w-4" aria-hidden="true" />,
        items: itemMatches.map((kpi) => ({ kind: "items", kpi })),
      })
    }

    if (templateMatches.length) {
      groups.push({
        key: "templates",
        label: "Templates",
        icon: <Layers className="h-4 w-4" aria-hidden="true" />,
        items: templateMatches.map((template) => ({ kind: "templates", template })),
      })
    }

    if (employeeMatches.length) {
      groups.push({
        key: "employees",
        label: "Employees",
        icon: <Users className="h-4 w-4" aria-hidden="true" />,
        items: employeeMatches.map((employee) => ({ kind: "employees", employee })),
      })
    }

    return groups
  }, [employees, fiscalYear, kpiItems, recentPages, searchQuery, templates])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (key !== "k") return
      if (!event.metaKey && !event.ctrlKey) return

      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        if (target.isContentEditable) return
      }

      event.preventDefault()
      setSearchOpen(true)
      setSearchQuery("")
      if (event.key === "?") {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const onSelectSearchItem = (payload: SearchGroup["items"][number]) => {
    if (payload.kind === "recent") navigate(payload.route)
    if (payload.kind === "action") {
      if (payload.action === "new-kpi") navigate("/kpi-items/new")
      if (payload.action === "new-template") navigate("/kpi-templates/new")
      if (payload.action === "export-dashboard") window.dispatchEvent(new CustomEvent("export-dashboard"))
      if (payload.action === "switch-fy") {
        const next = fiscalYear === "FY 2025-26" ? "FY 2024-25" : "FY 2025-26"
        setFiscalYear(next)
      }
      if (payload.action === "toggle-theme") toggleTheme()
    }
    if (payload.kind === "items") navigate("/kpi-items")
    if (payload.kind === "templates") navigate("/kpi-templates")
    if (payload.kind === "employees") navigate("/actuals-vs-target")
    setSearchOpen(false)
  }

  useEffect(() => {
    const onOpenHelp = () => setShortcutsOpen(true)
    window.addEventListener("open-shortcuts-help", onOpenHelp)
    return () => window.removeEventListener("open-shortcuts-help", onOpenHelp)
  }, [])

  const filteredNotifications = notifications.filter((item) => {
    if (notifFilter === "all") return true
    if (notifFilter === "unread") return item.unread
    return item.category === notifFilter
  })

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="min-w-0">
        <ShadcnBreadcrumb>
          <BreadcrumbList>
            {([...breadcrumbs, { label: title }] as TopbarBreadcrumb[]).map((crumb, idx, arr) => {
              const isLast = idx === arr.length - 1
              return (
                <Fragment key={`${crumb.label}-${idx}`}>
                  <BreadcrumbItem>
                    {crumb.href && !isLast ? (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className={cn(isLast ? "text-brand-blue" : undefined)}>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {isLast ? null : <BreadcrumbSeparator />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </ShadcnBreadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-sidebar"))}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="w-[190px]">
          <Select value={fyValue} onValueChange={(value) => { setFyValue(value); setFiscalYear(fyOptions.find((x) => x.value === value)?.label ?? fiscalYear) }}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={fiscalYear} />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden min-w-[10rem] max-w-[14rem] sm:block">
          <Select value={currentTenantId} onValueChange={setCurrentTenantId}>
            <SelectTrigger className="h-9 w-full" aria-label="Organization">
              <SelectValue placeholder="Organization" />
            </SelectTrigger>
            <SelectContent>
              {TENANT_OPTIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="button" variant="ghost" size="icon" aria-label="Toggle dark mode" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <div className="relative">
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications" onClick={() => setNotifOpen(true)}>
            <Bell className="h-5 w-5 text-slate-700" />
          </Button>
          {unreadCount > 0 ? (
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
              {unreadCount}
            </div>
          ) : null}

        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-brand-blue">
          <span className="text-sm font-semibold">UK</span>
        </div>
      </div>

      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[420px]">
          <SheetHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>Mark all read</Button>
                <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
              </div>
            </div>
          </SheetHeader>
          <div className="pt-3">
            <Tabs value={notifFilter} onValueChange={(v) => setNotifFilter(v as typeof notifFilter)}>
              <TabsList className="grid grid-cols-5 h-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="kpi-alerts">KPI Alerts</TabsTrigger>
                <TabsTrigger value="approvals">Approvals</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="mt-3 space-y-2">
              {filteredNotifications.map((n) => (
                <button key={n.id} type="button" className="w-full rounded-md border p-3 text-left hover:bg-muted/40" onClick={() => { markNotificationRead(n.id); navigate(n.route); setNotifOpen(false) }}>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {n.type === "alert" && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {n.type === "pending" && <Clock3 className="h-4 w-4 text-amber-500" />}
                      {n.type === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {n.type === "info" && <Info className="h-4 w-4 text-orange-500" />}
                      {n.type === "approval" && <FileCheck className="h-4 w-4 text-purple-500" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{n.title}</div>
                        {n.unread ? <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" /> : null}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{n.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Button variant="link" className="mt-3 px-0" onClick={() => navigate("/settings")}>View all notifications -&gt;</Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="p-0 overflow-hidden">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Search KPI items, templates, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Search pages, records, and quick actions.</div>
          </div>

          <div className="max-h-[60vh] overflow-auto p-2">
            {!searchGroups.length ? (
              <div className="p-4 text-sm text-muted-foreground">
                {searchQuery.trim() ? "No results found." : "Type to search... (Cmd+K)"}
              </div>
            ) : (
              <div className="space-y-3">
                {searchGroups.map((group) => (
                  <div key={group.key} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.icon}
                      {group.label}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item, idx) => {
                        const key = `${group.key}-${idx}`
                        if (item.kind === "recent") {
                          return <button key={key} type="button" className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-50 flex items-center justify-between" onClick={() => onSelectSearchItem(item)}><div className="text-sm font-medium">{item.label}</div><Badge variant="outline">{item.hint}</Badge></button>
                        }
                        if (item.kind === "action") {
                          return <button key={key} type="button" className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-50 flex items-center justify-between" onClick={() => onSelectSearchItem(item)}><div className="text-sm font-medium">{item.label}</div><Badge variant="outline">{item.hint}</Badge></button>
                        }
                        if (item.kind === "items") {
                          return (
                            <button
                              key={key}
                              type="button"
                              className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                              onClick={() => onSelectSearchItem(item)}
                            >
                              <div><div className="text-sm font-medium">{item.kpi.kpiCode}</div><div className="text-xs text-muted-foreground">{item.kpi.itemName}</div></div>
                              <Badge variant="outline">Enter</Badge>
                            </button>
                          )
                        }
                        if (item.kind === "templates") {
                          return (
                            <button
                              key={key}
                              type="button"
                              className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                              onClick={() => onSelectSearchItem(item)}
                            >
                              <div><div className="text-sm font-medium">{item.template.templateName}</div><div className="text-xs text-muted-foreground">{item.template.templateCode}</div></div>
                              <Badge variant="outline">Enter</Badge>
                            </button>
                          )
                        }

                        return (
                          <button
                            key={key}
                            type="button"
                            className="w-full rounded-md px-2 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                            onClick={() => onSelectSearchItem(item)}
                          >
                            <div><div className="text-sm font-medium">{item.employee.employeeName}</div><div className="text-xs text-muted-foreground">{item.employee.role}</div></div>
                            <Badge variant="outline">Enter</Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Keyboard Shortcuts</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Alt+1", "Go to KPI Items"],
              ["Alt+2", "Go to KPI Templates"],
              ["Alt+3", "Go to Template Allocation"],
              ["Alt+4", "Go to Actuals vs Target"],
              ["Cmd/Ctrl+K", "Open Command Palette"],
              ["Cmd/Ctrl+N", "Context-aware New Item"],
              ["Esc", "Close open dialog/sheet/drawer"],
              ["?", "Open this help modal"],
            ].map((row) => <Fragment key={row[0]}><div className="font-mono text-xs rounded border px-2 py-1 bg-muted">{row[0]}</div><div>{row[1]}</div></Fragment>)}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
