// components/sidebar.tsx
"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  BarChart4,
  Settings,
  LogOut,
  ChevronFirst,
  ChevronLast,
} from "lucide-react"

import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"

/* ─────────────────────── config ──────────────────────── */
const routes = [
  { label: "لوحة التحكم", icon: LayoutDashboard, href: "/",            color: "text-sky-500"    },
  { label: "المعلمين",     icon: Users,           href: "/teachers",   color: "text-violet-500" },
  { label: "التقييمات",    icon: ClipboardCheck,  href: "/evaluations", color: "text-pink-700"  },
  { label: "التقارير",     icon: BarChart4,       href: "/reports",    color: "text-orange-500" },
  { label: "الإعدادات",    icon: Settings,        href: "/settings",   color: "text-gray-500"   },
]

const MIN_W      = 176  // 11 rem
const MAX_W      = 320  // 20 rem
const DEFAULT_W  = 256  // 16 rem
const STORAGE_KEY = "sidebar-width"

/* ───────────────────── sidebar ──────────────────────── */
export function Sidebar() {
  const pathname     = usePathname()
  const router       = useRouter()

  /* width / collapsed state ------------------------------------------- */
  const [width, setWidth]           = useState<number>(DEFAULT_W)   // safe default for SSR
  const [collapsed, setCollapsed]   = useState(false)
  const draggingRef                 = useRef(false)

  /* after first client render → read saved width ---------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = Number(localStorage.getItem(STORAGE_KEY))
    if (saved > 0) setWidth(saved)
  }, [])

  /* resize handlers --------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const newW = Math.max(MIN_W, Math.min(MAX_W, e.clientX))
      setWidth(newW)
    }

    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.userSelect = ""
      localStorage.setItem(STORAGE_KEY, width.toString())
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup",   onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup",   onMouseUp)
    }
  }, [width])

  /* logout ------------------------------------------------------------ */
  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  /* computed width (0 when collapsed) --------------------------------- */
  const sideWidth = collapsed ? 0 : width

  return (
    <>
      {/* ░░░░░░░░░░ sidebar ░░░░░░░░░░ */}
      <aside
        style={{ width: sideWidth, minWidth: sideWidth, maxWidth: sideWidth }}
        className={cn(
          "relative flex h-screen flex-col justify-between overflow-y-auto transition-[width] duration-200",
          "bg-slate-50 text-slate-800 border-e border-slate-200 shadow-lg",
          "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700"
        )}
      >
        {/* header + collapse button */}
        <div className="flex items-center justify-between px-3 py-4">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
            مدارس الرواد
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronFirst className="h-5 w-5" /> : <ChevronLast className="h-5 w-5" />}
          </Button>
        </div>

        {/* nav items */}
        <nav className="flex-1 space-y-1 px-3">
          {routes.map(r => {
            const active = pathname === r.href
            return (
              <Link key={r.href} href={r.href}>
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 px-3 font-normal",
                    active
                      ? "bg-slate-200 text-slate-900 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-50"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  )}
                >
                  <r.icon className={cn("h-5 w-5 shrink-0", r.color)} />
                  {!collapsed && r.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* logout */}
        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2 px-3 font-normal text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40"
          >
            <LogOut className="h-5 w-5 text-red-500" />
            {!collapsed && "تسجيل الخروج"}
          </Button>
        </div>

        {/* resize handle – only when expanded */}
        {!collapsed && (
          <div
            className="absolute inset-y-0 end-0 w-1 cursor-ew-resize"
            onMouseDown={() => {
              draggingRef.current = true
              document.body.style.userSelect = "none"
            }}
          />
        )}
      </aside>

      {/* floating reopen button */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open sidebar"
          className={cn(
            "fixed top-4 start-4 z-50 flex h-9 w-9 items-center justify-center rounded-md border",
            "bg-slate-50 text-slate-800 shadow-lg hover:bg-slate-100",
            "dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          )}
        >
          <ChevronLast className="h-5 w-5" />
        </button>
      )}
    </>
  )
}
