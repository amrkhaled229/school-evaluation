"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() || ""
  const hideSidebar = ["/login", "/signup"].includes(path)

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-3.5rem)]">
        {!hideSidebar && <Sidebar />}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  )
}
