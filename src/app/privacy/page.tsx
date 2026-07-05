import type { Metadata } from "next"
import Link from "next/link"

import { CreatorDeckLogo } from "@/components/creator-deck-logo"

export const metadata: Metadata = {
  title: "Privacy Policy — CreatorDeck",
  description: "How CreatorDeck collects, uses, and protects your data.",
}

const LAST_UPDATED = "5 July 2026"
// CreatorDeck is operated by an individual (no registered KVK entity).
const OPERATOR = "Tom Spek"
const OPERATOR_LOCATION = "the Netherlands"
const CONTACT_EMAIL = "contact.itsspekkie@gmail.com"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-zinc-600 dark:text-zinc-400 leading-relaxed">{children}</div>
    </section>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-900">
        <div className="px-6 py-5 flex items-center justify-between max-w-3xl mx-auto w-full">
          <Link href="/" aria-label="CreatorDeck home">
            <CreatorDeckLogo size="sm" />
          </Link>
        </div>
      </nav>

      {/* Body */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12 space-y-10">
        <header className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          CreatorDeck is a dashboard for live creators that brings your streaming events, chat, goals, and
          analytics into one place. CreatorDeck is operated by {OPERATOR}, an individual based in{" "}
          {OPERATOR_LOCATION} (&ldquo;CreatorDeck&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), who acts as the data
          controller for the personal data described below. This policy explains what data we collect, why we
          collect it, and the choices you have. By using CreatorDeck you agree to the practices described here.
        </p>

        <Section title="Information we collect">
          <p>We collect only what we need to run the service:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Account &amp; identity.</strong> When you sign
              in or connect a platform (Twitch, YouTube/Google, or Spotify), we receive your account identifier,
              display name, email, and profile details that the platform shares with us through OAuth.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Platform access tokens.</strong> To read your
              stream, chat, and playback data on your behalf, we store the OAuth access and refresh tokens you
              authorise. These tokens are encrypted at rest.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Stream &amp; channel activity.</strong> Support
              events (follows, subscriptions, bits, raids), chat messages, Super Chats, memberships, and related
              metadata from your connected channels.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Spotify playback.</strong> If you connect
              Spotify, we read your currently playing track and playback state to display and control it, as
              authorised by you.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Billing information.</strong> If you subscribe
              to a paid plan, our payment processor (Lemon Squeezy) handles your payment details. We do not store
              your full card details; we retain records such as your subscription status and plan.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Preferences &amp; goals.</strong> Settings such
              as enabled features, stream goals, and theme.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Waitlist email.</strong> If you join the
              waitlist, we store the email address you provide so we can contact you about access.
            </li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide the dashboard, live event feed, chat view, goals, and analytics.</li>
            <li>Authenticate you and keep your connected platform integrations working.</li>
            <li>Display your channel activity back to you in real time and in your history.</li>
            <li>Process subscriptions and manage your plan where you choose a paid tier.</li>
            <li>Communicate with you about access, service changes, and support.</li>
            <li>Diagnose problems, prevent abuse, and keep the service secure.</li>
          </ul>
          <p>
            We do not sell your personal data, and we do not use your chat or channel content for advertising.
          </p>
        </Section>

        <Section title="Connected platforms and the data we access">
          <p>
            CreatorDeck integrates with third-party platforms using their official APIs and OAuth. When you connect
            an account, that platform&rsquo;s own privacy policy and terms also apply to the data it shares with us.
            We request only the permissions needed for the features you use, and you can revoke our access at any
            time from the platform&rsquo;s account settings. The scopes we request are:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Twitch:</strong> your email and identity,
              subscriptions, followers, chat, and bits (
              <code className="text-xs">user:read:email</code>,{" "}
              <code className="text-xs">channel:read:subscriptions</code>,{" "}
              <code className="text-xs">moderator:read:followers</code>,{" "}
              <code className="text-xs">chat:read</code>, <code className="text-xs">user:read:chat</code>,{" "}
              <code className="text-xs">bits:read</code>).
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">YouTube (Google):</strong> read-only access to
              your YouTube account, channel, and live chat (
              <code className="text-xs">https://www.googleapis.com/auth/youtube.readonly</code>, plus{" "}
              <code className="text-xs">openid email profile</code>).
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Spotify:</strong> read and control your current
              playback (<code className="text-xs">user-read-playback-state</code>,{" "}
              <code className="text-xs">user-modify-playback-state</code>,{" "}
              <code className="text-xs">user-read-currently-playing</code>).
            </li>
          </ul>
          <p>
            CreatorDeck&rsquo;s use of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-500 hover:text-teal-400 underline underline-offset-2"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We only use your Google/YouTube data to provide and improve
            the user-facing features described above.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            We use strictly necessary cookies to keep you signed in and to secure your session (set through our
            authentication provider). These are essential to operate the service. We do not use advertising or
            third-party tracking cookies.
          </p>
        </Section>

        <Section title="How we store and protect your data">
          <p>
            Your data is stored in a hosted database. Sensitive credentials such as OAuth tokens are encrypted at
            rest, and access is limited to what is required to operate the service. No method of transmission or
            storage is completely secure, but we take reasonable measures to protect your information.
          </p>
        </Section>

        <Section title="Data sharing and sub-processors">
          <p>
            We do not sell your data. We share it only with service providers that process data on our behalf under
            confidentiality obligations, and where required by law. Our main sub-processors are:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Neon</strong> — managed database hosting.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Lemon Squeezy</strong> — payment processing for
              paid plans.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Our hosting provider</strong> — application
              hosting and delivery.
            </li>
            <li>
              <strong className="text-zinc-800 dark:text-zinc-200">Twitch, Google/YouTube, and Spotify</strong> —
              the platforms you connect, which provide the data you ask us to display.
            </li>
          </ul>
          <p>
            We may also disclose data when required by law or to protect the rights, safety, and security of
            CreatorDeck and its users. Some of these providers may process data outside your country; where they do,
            appropriate safeguards apply.
          </p>
        </Section>

        <Section title="Data retention">
          <p>
            We retain your account and activity data for as long as your account is active or as needed to provide
            the service. When you delete your account or disconnect a platform, we delete or de-identify the
            associated data, except where we must retain it to comply with legal obligations.
          </p>
        </Section>

        <Section title="Your rights and choices">
          <p>
            You can disconnect any connected platform yourself at any time from your CreatorDeck connections
            settings — this revokes the stored tokens and stops further data collection for that platform. In
            addition, under the GDPR you may:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Request access to, correction of, or deletion (&ldquo;erasure&rdquo;) of your personal data.</li>
            <li>Object to or restrict certain processing, and request data portability.</li>
            <li>Revoke CreatorDeck&rsquo;s access from your Twitch, Google, or Spotify account settings.</li>
            <li>Ask to be removed from the waitlist or other communications.</li>
          </ul>
          <p>
            You can permanently delete your account and all associated data yourself at any time from your account
            settings (Account → Danger Zone). This erases your connected platforms, tokens, and stored stream and
            chat history, and cancels any active subscription. Alternatively, you can email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-teal-500 hover:text-teal-400 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and we will action it. If you are in the EU/EEA, you also have the right to lodge a complaint with your
            local data protection authority — in the Netherlands, the Autoriteit Persoonsgegevens.
          </p>
        </Section>

        <Section title="Children">
          <p>
            CreatorDeck is not directed to children under 16, and we do not knowingly collect their personal data.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
            date above. Significant changes may be communicated to you directly.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Contact {OPERATOR} at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-teal-500 hover:text-teal-400 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 text-center">
        <p className="text-xs text-zinc-400 dark:text-zinc-600">© {new Date().getFullYear()} CreatorDeck</p>
      </footer>
    </div>
  )
}
