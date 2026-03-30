import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { getServerSession } from "next-auth"

import "./globals.css"

import { authOptions } from "@/lib/auth"

import { ThemeProvider } from "@/components/theme-provider"

import { SessionProvider } from "./session-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CreatorDeck",
  description: "Your creator command centre — streams, videos, and everything in between.",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
