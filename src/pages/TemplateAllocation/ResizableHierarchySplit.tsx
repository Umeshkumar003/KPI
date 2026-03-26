import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"

type Props = {
  /** Persisted width of the left pane (% of row). */
  storageKey?: string
  defaultLeftPercent?: number
  minLeftPercent?: number
  maxLeftPercent?: number
  className?: string
  leftClassName?: string
  rightClassName?: string
  left: ReactNode
  right: ReactNode
}

function readStoredPct(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

export function ResizableHierarchySplit({
  storageKey = "kpi-template-allocation-hierarchy-pct",
  defaultLeftPercent = 38,
  minLeftPercent = 18,
  maxLeftPercent = 62,
  className,
  leftClassName,
  rightClassName,
  left,
  right,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startPct: number; width: number } | null>(null)

  const [leftPct, setLeftPct] = useState(() => {
    const v = readStoredPct(storageKey, defaultLeftPercent)
    return Math.min(maxLeftPercent, Math.max(minLeftPercent, v))
  })

  const leftPctRef = useRef(leftPct)
  useEffect(() => {
    leftPctRef.current = leftPct
  }, [leftPct])

  const persistPct = useCallback(
    (v: number) => {
      const c = Math.min(maxLeftPercent, Math.max(minLeftPercent, v))
      try {
        localStorage.setItem(storageKey, String(Math.round(c * 10) / 10))
      } catch {
        /* ignore */
      }
      return c
    },
    [maxLeftPercent, minLeftPercent, storageKey],
  )

  const endDrag = useCallback(() => {
    if (dragRef.current) {
      persistPct(leftPctRef.current)
    }
    dragRef.current = null
    document.body.style.removeProperty("cursor")
    document.body.style.removeProperty("user-select")
  }, [persistPct])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const deltaPct = (dx / d.width) * 100
      const next = d.startPct + deltaPct
      const clamped = Math.min(maxLeftPercent, Math.max(minLeftPercent, next))
      leftPctRef.current = clamped
      setLeftPct(clamped)
    }
    const onUp = () => endDrag()

    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("blur", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("blur", onUp)
    }
  }, [endDrag, maxLeftPercent, minLeftPercent])

  const onDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startPct: leftPctRef.current,
      width: rect.width,
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  return (
    <div ref={containerRef} className={cn("flex min-h-0 min-w-0 flex-1 flex-row", className)}>
      <div
        className={cn("min-h-0 min-w-0 shrink-0 overflow-hidden border-r border-slate-200 bg-slate-50", leftClassName)}
        style={{ width: `${leftPct}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPct)}
        aria-valuemin={minLeftPercent}
        aria-valuemax={maxLeftPercent}
        tabIndex={0}
        className={cn(
          "group relative flex w-2 shrink-0 cursor-col-resize items-center justify-center bg-slate-100",
          "hover:bg-brand-blue/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-blue",
        )}
        onMouseDown={onDividerMouseDown}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 5 : 2
          if (e.key === "ArrowLeft") {
            e.preventDefault()
            setLeftPct((p) => persistPct(p - step))
          } else if (e.key === "ArrowRight") {
            e.preventDefault()
            setLeftPct((p) => persistPct(p + step))
          }
        }}
      >
        <span className="pointer-events-none flex h-10 w-1 items-center justify-center rounded-full bg-slate-300/80 group-hover:bg-brand-blue/50">
          <GripVertical className="h-4 w-4 text-slate-600 opacity-70" aria-hidden="true" />
        </span>
        <span className="sr-only">Drag to resize hierarchy and content panels. Use arrow keys to adjust.</span>
      </div>

      <div className={cn("min-h-0 min-w-0 flex-1 overflow-hidden", rightClassName)}>{right}</div>
    </div>
  )
}
