import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"

import type { TopbarBreadcrumb } from "./Topbar"
import { PageSkeleton } from "@/components/ui/page-skeleton"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/appStore"
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs"

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const setTheme = useAppStore((s) => s.setTheme)
  const theme = useAppStore((s) => s.theme)
  const addRecentPage = useAppStore((s) => s.addRecentPage)
  const breadcrumbs = useBreadcrumbs()

  const STORAGE_KEY = "sidebar-collapsed"
  const expandedWidth = 208
  const collapsedWidth = 56

  const [isDesktop, setIsDesktop] = useState(false)
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)")

    const readStored = () => localStorage.getItem(STORAGE_KEY) === "true"

    const sync = () => {
      const desktopNow = mql.matches
      setIsDesktop(desktopNow)
      if (!desktopNow) {
        setCollapsed(true)
      } else {
        setCollapsed(readStored())
      }
    }

    sync()
    mql.addEventListener?.("change", sync)

    const onSidebarEvent = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      if (typeof detail !== "boolean") return
      setCollapsed(detail)
    }
    window.addEventListener("sidebar-collapsed-change", onSidebarEvent as EventListener)

    return () => {
      mql.removeEventListener?.("change", sync)
      window.removeEventListener("sidebar-collapsed-change", onSidebarEvent as EventListener)
    }
  }, [])

  useEffect(() => {
    addRecentPage(pathname)
  }, [addRecentPage, pathname])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault()
        if (pathname.startsWith("/kpi-items")) navigate("/kpi-items/new")
        else if (pathname.startsWith("/kpi-templates")) navigate("/kpi-templates/new")
      }
      if (event.key === "?") {
        window.dispatchEvent(new CustomEvent("open-shortcuts-help"))
      }
      if (event.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-overlays"))
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault()
        setTheme(theme === "dark" ? "light" : "dark")
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [navigate, pathname, setTheme, theme])

  const sidebarOffset = useMemo(() => {
    if (!isDesktop) return collapsedWidth
    return collapsed ? collapsedWidth : expandedWidth
  }, [collapsed, expandedWidth, collapsedWidth, isDesktop])

  const [pageActive, setPageActive] = useState(true)
  useLayoutEffect(() => {
    setPageActive(false)
    const raf = window.requestAnimationFrame(() => setPageActive(true))
    return () => window.cancelAnimationFrame(raf)
  }, [pathname])

  const topbarData = {
    title: breadcrumbs[breadcrumbs.length - 1]?.label ?? "VoltusWave KPI",
    breadcrumbs: breadcrumbs.slice(0, -1) as TopbarBreadcrumb[],
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-2">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ marginLeft: isDesktop ? sidebarOffset : 0 }}>
        <div className="fixed right-0 top-0 z-10 transition-all duration-200" style={{ left: sidebarOffset }}>
          <Topbar title={topbarData.title} breadcrumbs={topbarData.breadcrumbs} />
        </div>
        <main className="flex-1 overflow-y-auto bg-surface-2 p-6 pt-14">
          <Suspense fallback={<PageSkeleton />}>
            <div key={pathname} className={cn("page-enter", pageActive ? "page-enter-active" : undefined)}>
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}
