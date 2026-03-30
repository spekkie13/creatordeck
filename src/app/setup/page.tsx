import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import type { User } from "@/types/entities"

import { authOptions } from "@/lib/auth"

import { userRepository } from "@/repositories"

import { SetupWizard } from "./setup-wizard"

export default async function SetupPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const user: User | null = await userRepository.findById(session.userId)
  if (user?.onboardingCompleted) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center p-6">
      <SetupWizard displayName={session.displayName} />
    </div>
  )
}
