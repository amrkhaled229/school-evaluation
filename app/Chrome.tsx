// app/Chrome.tsx
"use client"

import { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

export default function Chrome({ children }: { children: ReactNode }) {
  const path = usePathname() || ""
  const hide = path === "/login" || path === "/signup"

  if (hide) {
    // no nav/sidebar on auth pages
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-3.5rem)]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  )
}
