export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 rounded-md bg-slate-200 animate-pulse" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="h-36 rounded-md bg-slate-200 animate-pulse" />
        <div className="h-36 rounded-md bg-slate-200 animate-pulse" />
      </div>
      <div className="h-24 rounded-md bg-slate-200 animate-pulse" />
    </div>
  )
}

