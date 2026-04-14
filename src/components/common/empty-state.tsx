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
    <div className="flex items-center gap-3 p-3 border-b border-border/50">
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3 w-1/3" />
        <SkeletonLine className="h-3 w-1/4" />
      </div>
      <SkeletonLine className="h-5 w-16 rounded-full" />
    </div>
  )
}
