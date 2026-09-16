import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return n.toLocaleString()
  return n.toString()
}

export function formatPercent(n: number, decimals = 2): string {
  return n.toFixed(decimals) + '%'
}

export function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} d ago`
}

export function riskColor(risk: number): string {
  if (risk >= 90) return 'text-fanos-red'
  if (risk >= 70) return 'text-fanos-orange'
  if (risk >= 50) return 'text-fanos-amber'
  if (risk >= 30) return 'text-blue-400'
  return 'text-fanos-green'
}

export function severityClass(sev: string): string {
  switch (sev.toLowerCase()) {
    case 'critical': return 'badge-critical'
    case 'high':     return 'badge-high'
    case 'medium':   return 'badge-medium'
    case 'low':      return 'badge-low'
    default:         return 'badge-info'
  }
}

export function statusClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'blocked':       return 'status-blocked'
    case 'investigating': return 'status-investigating'
    case 'contained':     return 'status-contained'
    case 'monitored':     return 'status-monitored'
    case 'alert':         return 'status-alert'
    default:              return 'status-alert'
  }
}
