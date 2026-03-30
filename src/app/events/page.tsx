import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"

import { EventsClient } from "./events-client"

export default async function EventsPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  return <EventsClient displayName={session.displayName} />
}
