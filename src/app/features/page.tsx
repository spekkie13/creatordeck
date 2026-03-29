import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppHeader } from "@/app/dashboard/app-header"
import { FeatureRow } from "@/app/features/feature-row";

export default async function FeaturesPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  return (
    <div className="min-h-screen">
      <AppHeader displayName={session.displayName} />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Features</h1>
          <p className="text-zinc-500 text-sm mt-1">Enable or disable individual features for your account.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
          <FeatureRow
            name="Event tracking"
            description="Record follows, subs, bits and raids to your event history."
            enabled={true}
          />
          <FeatureRow
            name="Live event feed"
            description="Stream live events to your dashboard in real time."
            enabled={true}
          />
          <FeatureRow
            name="OBS overlay"
            description="Browser source alerts for subs, follows and raids."
            comingSoon={true}
          />
          <FeatureRow
            name="Spotify widget"
            description="Show your currently playing track in the dashboard."
            comingSoon={true}
          />
          <FeatureRow
            name="Analytics"
            description="Charts and trends across your stream history."
            comingSoon={true}
          />
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Feature controls are coming soon. Toggles currently reflect what is active.
        </p>
      </main>
    </div>
  )
}
