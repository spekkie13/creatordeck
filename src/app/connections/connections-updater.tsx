"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import {useSearchParams, useRouter, ReadonlyURLSearchParams} from "next/navigation"
import {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";

export function ConnectionsUpdater() {
  const { update } = useSession()
  const searchParams: ReadonlyURLSearchParams = useSearchParams()
  const router: AppRouterInstance = useRouter()

  useEffect(() => {
    if (searchParams.get("linked")) {
      update().then(() => router.replace("/connections"))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
