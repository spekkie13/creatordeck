import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SignInButton } from "../sign-in-button"

export default async function LoginPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <main className="min-h-screen flex items-center justify-center">
      {/* <SignInButton /> */}
    </main>
  )
}
