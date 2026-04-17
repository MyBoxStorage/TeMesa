import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-[12px] text-muted-foreground max-w-[280px] leading-relaxed mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

/* ── SKELETON LINES ──────────────────────────────────────────────────────── */
export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('bg-muted animate-pulse rounded', className)} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-28 bg-muted rounded" />
          <div className="h-3 w-10 bg-muted rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-16 bg-muted rounded" />
          <div className="h-2.5 w-14 bg-muted rounded" />
        </div>
      </div>
      <div className="h-5 w-20 bg-muted rounded-full shrink-0" />
    </div>
  )
}
