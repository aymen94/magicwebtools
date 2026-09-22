'use client'

import { ArrowLeftRight, Code2, FileText, Image, Ruler, ShieldCheck, Sparkles, Type, Rocket } from 'lucide-react'
import type { ToolIconName } from '../lib/tools'

const icons = {
  ruler: Ruler,
  text: Type,
  convert: ArrowLeftRight,
  code: Code2,
  generate: Sparkles,
  check: ShieldCheck,
  image: Image,
  pdf: FileText,
  system: Rocket,
}

export function ToolIcon({ icon, size = 18 }: { icon: ToolIconName; size?: number }) {
  const Icon = icons[icon]
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}