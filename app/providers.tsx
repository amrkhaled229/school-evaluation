// app/providers.tsx (client component)
"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/hooks/useAuth" // Make sure this path matches where AuthProvider is exported
import { Toaster } from "@/components/ui/toaster"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"      // toggles `class="light"` or `class="dark"` on <html>
      defaultTheme="light"    // must match your SSR className
      enableSystem={false}    // or true if you prefer system override
      enableColorScheme={true} 
    >
      <AuthProvider>
        <Toaster />
        {children}
      </AuthProvider>
    </ThemeProvider>
  )
}