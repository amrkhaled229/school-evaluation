// components/navbar.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { getAuth, signOut } from "firebase/auth"
import { Bell, Sun, Moon } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { db } from "@/lib/firebase"
import { doc, onSnapshot } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/lib/use-notifications"

export function Navbar() {
  const router = useRouter()
  const auth = getAuth()

  // --- theme + hydration guard ---
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  // --- auth status ---
  const { user, role, loading: authLoading } = useAuth()
  
  // Create a state to track logout status
  const [loggingOut, setLoggingOut] = React.useState(false)

  // --- user profile (name, avatar, role) from Firestore ---
  const [profile, setProfile] = React.useState<{
    name: string
    avatar?: string
    role?: string
  } | null>(null)

  // Use a ref to store the unsubscribe function
  const unsubRef = React.useRef<() => void | null>(() => null)

  // Setup profile listener
  React.useEffect(() => {
    // Clear any existing subscription
    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = () => null
    }
    
    // Skip if we're not logged in or in the process of logging out
    if (!user || loggingOut) {
      setProfile(null)
      return
    }
    
    try {
      // Setup listener with error handling
      const unsub = onSnapshot(
        doc(db, "users", user.uid),
        (doc) => {
          if (loggingOut) return // Don't update if logging out
          
          const data = doc.data()
          if (!data) return
          
          setProfile({
            name: data.name || user.email || "––",
            avatar: data.avatarUrl,
            role: data.role,
          })
        },
        (error) => {
          console.error("Profile listener error:", error)
          // Only update state if we're not in the logout process
          if (!loggingOut) {
            setProfile(null)
          }
        }
      )
      
      // Store unsubscribe function in ref
      unsubRef.current = unsub
      
      // Cleanup on unmount or when user changes
      return () => {
        unsub()
        unsubRef.current = () => null
      }
    } catch (error) {
      console.error("Failed to setup profile listener:", error)
      setProfile(null)
      return () => {}
    }
  }, [user, loggingOut])

  // --- notifications ---
  const { notifications, unread, markAllRead } = useNotifications()
  const [openNotif, setOpenNotif] = React.useState(false)
  const [openUser, setOpenUser] = React.useState(false)

  // Handle logout with cleanup
  const handleLogout = async () => {
    try {
      // Prevent further updates
      setLoggingOut(true)
      
      // Close any open menus
      setOpenNotif(false)
      setOpenUser(false)
      
      // Clean up Firestore listener
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = () => null
      }
      
      // Sign out and redirect
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Reset state if logout fails
      setLoggingOut(false)
      router.push("/login")
    }
  }

  // Show loading placeholder but ensure consistent hook calls
  if (authLoading || loggingOut) {
    return <div className="h-14 sm:h-16 border-b shadow-sm"></div>
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 shadow-sm sm:h-16 sm:px-6">
      {/* Brand (right in RTL) */}
      <Link
        href="/"
        className="ms-auto rtl:ms-0 rtl:me-auto flex items-center gap-3 text-lg font-bold"
      >
        <img
          src="/alrwad-schools.png"
          alt="Logo"
          className="h-12 w-17"
        />
      </Link>

      {/* Controls (left) */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Toggle theme"
          onClick={() =>
            setTheme(resolvedTheme === "light" ? "dark" : "light")
          }
        >
          {mounted
            ? resolvedTheme === "light"
              ? <Moon className="h-5 w-5" />
              : <Sun  className="h-5 w-5" />
            : null}
        </Button>

        {/* Notifications */}
        {user && (
          <DropdownMenu open={openNotif} onOpenChange={setOpenNotif}>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Notifications"
                className="relative"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -end-1 -top-1 h-4 w-4 justify-center rounded-full p-0 text-[10px] leading-none"
                  >
                    {unread}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-0"
              sideOffset={8}
              onCloseAutoFocus={markAllRead}
            >
              <div className="p-4 pb-2 font-medium">الإشعارات</div>
              {notifications.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  لا توجد إشعارات
                </div>
              ) : (
                notifications.slice(0, 10).map((n, idx) => (
                  <DropdownMenuItem
                    key={`${n.id}-${idx}`}
                    className="flex-col items-start gap-0"
                  >
                    <span className="text-xs font-medium">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {n.time.toLocaleTimeString("ar-EG")}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User dropdown */}
        {user && (
          <DropdownMenu open={openUser} onOpenChange={setOpenUser}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu">
                <Avatar className="h-8 w-8">
                  {profile?.avatar ? (
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                  ) : (
                    <AvatarFallback>
                      {profile?.name?.slice(0, 2) || "––"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-medium leading-none">
                  {profile?.name}
                </p>
                {profile?.role && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    {profile.role}
                  </Badge>
                )}
              </div>

              <DropdownMenuItem asChild>
                <Link href="/settings">الإعدادات</Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}