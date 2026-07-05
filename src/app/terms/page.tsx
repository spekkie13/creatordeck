import type { Metadata } from "next"
import Link from "next/link"

import { CreatorDeckLogo } from "@/components/creator-deck-logo"

export const metadata: Metadata = {
  title: "Terms of Service — CreatorDeck",
  description: "The terms that govern your use of CreatorDeck.",
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

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">Last updated {LAST_UPDATED}</p>
        </header>

        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of CreatorDeck, a dashboard for
          live creators that brings your streaming events, chat, goals, and analytics into one place. CreatorDeck is
          operated by {OPERATOR}, an individual based in {OPERATOR_LOCATION} (&ldquo;CreatorDeck&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the service, you agree to these
          Terms. If you do not agree, do not use CreatorDeck.
        </p>

        <Section title="Eligibility">
          <p>
            You must be at least 16 years old and able to form a binding agreement to use CreatorDeck. If you use
            the service on behalf of an organisation, you represent that you are authorised to accept these Terms on
            its behalf.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            You sign in to CreatorDeck through connected platforms such as Twitch, YouTube, or Spotify. You are
            responsible for the activity that occurs under your account and for keeping your connected platform
            credentials secure. Notify us promptly if you believe your account has been accessed without
            authorisation.
          </p>
        </Section>

        <Section title="Connected platforms">
          <p>
            CreatorDeck integrates with third-party platforms (for example Twitch, YouTube/Google, and Spotify)
            using their official APIs. Your use of those platforms remains subject to their own terms and policies,
            and you are responsible for complying with them. We are not responsible for third-party platforms, and
            their availability, data, or behaviour may change at any time in ways outside our control. You may
            revoke CreatorDeck&rsquo;s access from a platform&rsquo;s account settings, or disconnect it from your
            CreatorDeck connections settings, at any time.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Use CreatorDeck to violate any law or the terms of a connected platform.</li>
            <li>Access data or accounts you are not authorised to access.</li>
            <li>Interfere with, disrupt, or place unreasonable load on the service or its infrastructure.</li>
            <li>Reverse engineer, scrape, or attempt to circumvent security or access controls.</li>
            <li>Resell, sublicense, or misrepresent the service as your own.</li>
          </ul>
        </Section>

        <Section title="Your content and data">
          <p>
            CreatorDeck reads and displays activity from your connected channels — such as events, chat messages,
            and Super Chats — so you can view and manage it. You retain all rights to your channel content and
            data. You grant us the limited permission needed to process and display that data to you in order to
            provide the service. How we handle your data is described in our{" "}
            <Link href="/privacy" className="text-teal-500 hover:text-teal-400 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Service availability and changes">
          <p>
            CreatorDeck is offered on an evolving basis and may currently be in early access. We may add, change,
            suspend, or discontinue features at any time. We aim to keep the service reliable but do not guarantee
            uninterrupted or error-free operation.
          </p>
        </Section>

        <Section title="Plans and payment">
          <p>
            Some features are offered free of charge and others as paid subscription plans. If you choose a paid
            plan, the applicable pricing and billing cycle are shown to you before you subscribe. Payments are
            processed by our payment provider, Lemon Squeezy, and are subject to their terms. Subscriptions renew
            automatically unless cancelled before the renewal date; you can manage or cancel your subscription from
            your billing settings. Except where required by law, payments are non-refundable.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You may stop using CreatorDeck and disconnect your platforms at any time, and you may permanently delete
            your account and data from your account settings or by contacting us. We may suspend or terminate your
            access if you breach these Terms, if
            required by law, or if necessary to protect the service or other users. On termination, the rights
            granted to you under these Terms end, and we may delete or de-identify your data as described in our
            Privacy Policy.
          </p>
        </Section>

        <Section title="Disclaimers">
          <p>
            CreatorDeck is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any
            kind, whether express or implied, including fitness for a particular purpose, availability, accuracy,
            and non-infringement. We do not warrant that data surfaced from third-party platforms is complete or
            accurate. Nothing in these Terms excludes or limits any rights you have under mandatory consumer
            protection law that cannot be excluded.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, CreatorDeck will not be liable for any indirect, incidental,
            special, consequential, or punitive damages, or for any loss of data, revenue, or profits, arising from
            your use of or inability to use the service. This does not limit liability that cannot be limited under
            applicable law.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These Terms are governed by the laws of {OPERATOR_LOCATION}, without regard to conflict-of-law rules.
            Any disputes arising from or relating to these Terms or the service will be subject to the exclusive
            jurisdiction of the competent courts of the Netherlands, unless mandatory law grants you the right to
            bring proceedings elsewhere.
          </p>
        </Section>

        <Section title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. When we do, we will revise the &ldquo;Last updated&rdquo;
            date above. Your continued use of CreatorDeck after changes take effect constitutes acceptance of the
            revised Terms.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these Terms? Contact {OPERATOR} at{" "}
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
