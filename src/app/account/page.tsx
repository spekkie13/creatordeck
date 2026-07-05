import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"

import { AppHeader } from "@/app/dashboard/app-header"
import { ApiKeyToggle } from "./api-key-toggle"
import { DeleteAccountButton } from "./delete-account-button"
import {Tier} from "@/types/tier";

export default async function AccountPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  return (
    <div className="min-h-screen">
      <AppHeader displayName={session.displayName} />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Account</h1>
          <p className="text-zinc-500 text-sm mt-1">Your account information and credentials.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Display name</span>
            <span className="text-sm text-zinc-900 dark:text-white">{session.displayName}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Plan</span>
            <span className="text-sm text-zinc-900 dark:text-white">{Tier.ALL.find((t: Tier) => t.id === session.tier)?.label}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Twitch ID</span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300 font-mono">{session.twitchId ?? "—"}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">YouTube Channel ID</span>
            {session.youtubeChannelId
              ? <span className="text-sm text-zinc-700 dark:text-zinc-300 font-mono">{session.youtubeChannelId}</span>
              : <span className="text-sm text-zinc-400 dark:text-zinc-600">Not connected</span>
            }
          </div>
          <div className="px-6 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">API Key</span>
                <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">Used by the desktop app to authenticate with CreatorDeck.</p>
              </div>
            </div>
            <ApiKeyToggle apiKey={session.apiKey} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Danger Zone</h2>
          <p className="text-sm text-zinc-500">
            Deleting your account permanently removes your connected platforms, tokens, stream and chat history, and
            all associated data. Any active subscription is cancelled. This cannot be undone.
          </p>
          <DeleteAccountButton />
        </div>
      </main>
    </div>
  )
}
