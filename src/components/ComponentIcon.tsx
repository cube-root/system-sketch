import {
  Monitor,
  Smartphone,
  Users,
  Braces,
  Server,
  Waypoints,
  Network,
  Database,
  DatabaseZap,
  Zap,
  ListOrdered,
  Cog,
  HardDrive,
  Globe,
  Route,
  ShieldCheck,
  Search,
  Bell,
  ChartNoAxesCombined,
  Radio,
  Box,
  Shield,
  Cloud,
  Activity,
  Cable,
  Clock,
  Gauge,
  KeyRound,
  ScrollText,
  Warehouse,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import brandIcons from '@/data/brand-icons.json'
import type { SystemComponent } from '@/types'
export const iconMap: Record<string, LucideIcon> = {
  Monitor,
  Smartphone,
  Users,
  Braces,
  Server,
  Waypoints,
  Network,
  Database,
  DatabaseZap,
  Zap,
  ListOrdered,
  Cog,
  HardDrive,
  Globe,
  Route,
  ShieldCheck,
  Search,
  Bell,
  ChartNoAxesCombined,
  Radio,
  Box,
  Shield,
  Cloud,
  Activity,
  Cable,
  Clock,
  Gauge,
  KeyRound,
  ScrollText,
  Warehouse,
  Workflow,
}
export const brands = brandIcons as Record<string, { body: string; width: number; height: number }>
export function ComponentIcon({
  component,
  size = 22,
}: {
  component: SystemComponent
  size?: number
}) {
  const brand = component.brand && brands[component.brand]
  if (brand)
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${brand.width} ${brand.height}`}
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: brand.body }}
      />
    )
  const Icon = iconMap[component.icon] ?? Box
  return <Icon size={size} strokeWidth={1.7} color={component.color} aria-hidden="true" />
}
