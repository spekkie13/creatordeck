"use client"

import { useFeatureFlag } from "@/hooks/use-feature-flags"

interface Props {
  name: string
  children: React.ReactNode
}

export function FeatureFlag({ name, children }: Props) {
  const enabled = useFeatureFlag(name)
  if (!enabled) return null
  return <>{children}</>
}
