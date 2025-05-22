import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import Providers from "./providers"
import Shell from "@/components/Shell.client"  // <-- import the client shell

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AL-Rowaad Schools – Teacher Evaluation System",
  description: "A comprehensive system for evaluating teachers at AL-Rowaad Schools",
  generator: "Amr Khaled",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="light" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Shell>
            {children}
          </Shell>
        </Providers>
      </body>
    </html>
  )
}
