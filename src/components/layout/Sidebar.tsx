import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { BarChart2, CalendarClock, ChevronLeft, ChevronRight, FileText, Layers, Settings, Target, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent } from "@/components/ui/sheet"

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  altHint: string
  isActive: (pathname: string) => boolean
}

export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const STORAGE_KEY = "sidebar-collapsed"
  const expandedWidth = 208
  const collapsedWidth = 56

  const [isDesktop, setIsDesktop] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)")

    const readStored = () => localStorage.getItem(STORAGE_KEY) === "true"

    const syncFromMedia = () => {
      const desktopNow = mql.matches
      setIsDesktop(desktopNow)
      if (!desktopNow) {
        setCollapsed(true)
      } else {
        setCollapsed(readStored())
      }
    }

    syncFromMedia()
    mql.addEventListener?.("change", syncFromMedia)
    return () => mql.removeEventListener?.("change", syncFromMedia)
  }, [])

  const toggleCollapsed = () => {
    if (!isDesktop) return
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      window.dispatchEvent(new CustomEvent("sidebar-collapsed-change", { detail: next }))
      return next
    })
  }

  const performanceItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/actuals-vs-target",
      icon: BarChart2,
      altHint: "Alt+5",
      isActive: (p) => p === "/actuals-vs-target",
    },
    {
      label: "KPI Items",
      href: "/kpi-items",
      icon: FileText,
      altHint: "Alt+1",
      isActive: (p) => p === "/kpi-items" || p.startsWith("/kpi-items/"),
    },
    {
      label: "KPI Templates",
      href: "/kpi-templates",
      icon: Layers,
      altHint: "Alt+2",
      isActive: (p) => p === "/kpi-templates" || p.startsWith("/kpi-templates/"),
    },
    {
      label: "Template Allocation",
      href: "/template-allocation",
      icon: Users,
      altHint: "Alt+3",
      isActive: (p) => p === "/template-allocation",
    },
    {
      label: "Period Tracker",
      href: "/period-tracker",
      icon: CalendarClock,
      altHint: "Alt+4",
      isActive: (p) => p === "/period-tracker",
    },
    {
      label: "Responsible Targets",
      href: "/responsible-targets",
      icon: Target,
      altHint: "Alt+6",
      isActive: (p) => p === "/responsible-targets",
    },
  ]

  const settingsItems: NavItem[] = [
    {
      label: "Configuration",
      href: "/settings",
      icon: Settings,
      altHint: "",
      isActive: (p) => p === "/settings",
    },
  ]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return

      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
        if (target.isContentEditable) return
      }

      const digit = event.key
      if (digit === "1") {
        event.preventDefault()
        navigate("/kpi-items")
      } else if (digit === "2") {
        event.preventDefault()
        navigate("/kpi-templates")
      } else if (digit === "3") {
        event.preventDefault()
        navigate("/template-allocation")
      } else if (digit === "4") {
        event.preventDefault()
        navigate("/period-tracker")
      } else if (digit === "5") {
        event.preventDefault()
        navigate("/actuals-vs-target")
      } else if (digit === "6") {
        event.preventDefault()
        navigate("/responsible-targets")
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate])

  const sidebarContent = (
    <>
      <div className="mb-6 pb-4">
        {!collapsed ? (
          <>
            <p className="text-sm font-semibold text-brand-blue">VoltusWave</p>
            <p className="text-xs text-slate-500">KPI Performance</p>
          </>
        ) : (
          <div className="flex h-10 w-full items-center justify-center" title="VoltusWave KPI Performance">
            <div className="h-9 w-9 rounded-full bg-orange-100 text-brand-blue flex items-center justify-center text-sm font-semibold">V</div>
          </div>
        )}
      </div>

      <div className="flex-1">
        {!collapsed ? <div className="text-xs font-semibold tracking-wide text-slate-500">PERFORMANCE</div> : null}
        <ul className="mt-2 space-y-1">
          {performanceItems.map((item) => {
            const isActive = item.isActive(pathname)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md border-l-2 py-2 transition-colors",
                    isActive
                      ? "border-brand-blue bg-orange-50 text-brand-blue font-medium"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    collapsed ? "justify-center px-2" : "justify-between pl-3 pr-2"
                  )}
                >
                  <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0")}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </span>
                  {!collapsed && item.altHint ? (
                    <span
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[10px] font-medium md:hidden lg:block",
                        isActive
                          ? "border-brand-blue/30 bg-white text-brand-blue"
                          : "border-slate-200 bg-slate-50 text-slate-600",
                      )}
                    >
                      {item.altHint}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
        {!collapsed ? <div className="mt-6 text-xs font-semibold tracking-wide text-slate-500">SETTINGS</div> : null}
        <ul className="mt-2 space-y-1">
          {settingsItems.map((item) => {
            const isActive = item.isActive(pathname)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md border-l-2 py-2 transition-colors",
                    isActive
                      ? "border-brand-blue bg-orange-50 text-brand-blue font-medium"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    collapsed ? "justify-center px-2" : "justify-between pl-3 pr-2"
                  )}
                >
                  <span className={cn("flex items-center gap-2", collapsed ? "justify-center" : "min-w-0")}>
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <footer className="mt-4 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-brand-blue">
              <span className="text-sm font-semibold">UK</span>
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">Umesh Kumar</div>
                <div className="truncate text-xs text-slate-500">Sr. DB Admin</div>
              </div>
            ) : null}
          </div>

          {isDesktop ? (
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleCollapsed}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-white text-slate-700 hover:bg-slate-50"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </footer>
    </>
  )

  useEffect(() => {
    const onOpen = () => setMobileOpen(true)
    const onClose = () => setMobileOpen(false)
    window.addEventListener("open-mobile-sidebar", onOpen)
    window.addEventListener("close-overlays", onClose)
    return () => {
      window.removeEventListener("open-mobile-sidebar", onOpen)
      window.removeEventListener("close-overlays", onClose)
    }
  }, [])

  if (!isDesktop) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-full p-4">
          <aside className="flex h-full flex-col">{sidebarContent}</aside>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn("fixed left-0 top-0 flex h-screen flex-col border-r bg-white transition-all duration-200", collapsed ? "p-2" : "p-4")}
      style={{ width: collapsed ? collapsedWidth : expandedWidth }}
    >
      {sidebarContent}
    </aside>
  )
}
