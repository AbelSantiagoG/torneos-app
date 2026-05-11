import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variantStyles = {
  default: 'bg-card',
  success: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  danger: 'bg-destructive/10 border-destructive/20',
  info: 'bg-accent/10 border-accent/20',
}

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning-foreground',
  danger: 'bg-destructive/20 text-destructive',
  info: 'bg-accent/20 text-accent-foreground',
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn(variantStyles[variant], 'border', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-success' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('p-2 rounded-lg', iconVariantStyles[variant])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
