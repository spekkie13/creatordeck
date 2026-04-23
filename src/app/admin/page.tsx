import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { featureFlagsRepository } from "@/repositories"
import { AdminFlagsClient } from "./admin-flags-client"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  const flags = await featureFlagsRepository.getAll()

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-8">Feature Flags</h1>
      <AdminFlagsClient flags={flags} actorId={session!.userId} />
    </main>
  )
}
