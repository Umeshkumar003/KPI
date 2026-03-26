import { useEffect, useState } from "react"

export function useCountUp(target: number, duration = 800, triggerKey?: string | number): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setValue(0))
    return () => cancelAnimationFrame(frame)
  }, [triggerKey])

  useEffect(() => {
    const start = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(target * progress)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, triggerKey])

  return value
}
