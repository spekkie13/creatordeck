"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<Record<string, boolean>>

export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useSWR("/api/feature-flags", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 30_000,
    fallbackData: {},
  })
  return data ?? {}
}

export function useFeatureFlag(name: string): boolean {
  const flags = useFeatureFlags()
  return flags[name] ?? false
}
