// components/layouts/navbar-wrapper.tsx
"use client"

import { usePathname } from "next/navigation"
import { Navbar } from "@/components/navbar"

export function NavbarWrapper() {
  const path = usePathname()
  // don’t mount Navbar (and its hooks) when on /login or /signup
  if (path === "/login" || path === "/signup") {
    return null
  }
  return <Navbar />
}
