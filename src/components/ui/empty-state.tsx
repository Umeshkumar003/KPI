import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction }: Props) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Icon className="h-20 w-20 text-slate-300" aria-hidden="true" />
      <div className="space-y-1">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        <div className="text-sm text-slate-400">{description}</div>
      </div>
      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button type="button" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

