import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { WaitlistForm } from "./waitlist-form"
import { SignInButton } from "./sign-in-button"
import { CreatorDeckLogo } from "@/components/creator-deck-logo"
import { ScreenshotCarousel } from "@/components/screenshot-carousel"

const FEATURES = [
  {
    icon: "⚡",
    title: "Live event feed",
    description: "Subs, follows, bits, and raids appear the moment they happen — no refresh needed.",
  },
  {
    icon: "📊",
    title: "Event history",
    description: "Every support event from every stream, filterable and sortable in one place.",
  },
  {
    icon: "🎯",
    title: "Stream goals",
    description: "Set a target for subs or followers and watch the progress bar fill up live.",
  },
  {
    icon: "🎬",
    title: "Multi-platform",
    description: "YouTube Super Chats, memberships, and a unified chat view — coming soon.",
  },
]

export default async function LandingPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">

      {/* Nav */}
      <nav className="sticky top-0 z-30 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900">
        <div className="px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
          <CreatorDeckLogo size="sm" />
          <SignInButton variant="ghost" />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center gap-6 max-w-2xl">
          <span className="text-xs font-medium text-purple-500 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full tracking-wide uppercase">
            Early access
          </span>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            The control centre<br className="hidden sm:block" /> for live creators.
          </h1>

          <p className="text-zinc-500 dark:text-zinc-400 text-lg sm:text-xl max-w-xl leading-relaxed">
            One dashboard for your stream events, goals, and analytics — across Twitch, YouTube, and more.
          </p>

          <div className="pt-2">
            <SignInButton />
          </div>
        </div>
      </section>

      {/* Screenshot carousel */}
      <section className="pb-16">
        <ScreenshotCarousel />
      </section>

      {/* Features */}
      <section className="px-6 pb-12 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{f.icon}</span>
                <span className="text-sm font-semibold">{f.title}</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist */}
      <section className="px-6 pb-20 max-w-sm mx-auto w-full space-y-3 text-center">
        <p className="text-sm text-zinc-500">Don&apos;t have access yet? Join the waitlist.</p>
        <WaitlistForm />
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">© {new Date().getFullYear()} CreatorDeck</p>
      </footer>

    </div>
  )
}
