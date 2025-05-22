// components/layouts/sidebar-wrapper.tsx
"use client"

import * as React from "react"
import { Sidebar } from "@/components/sidebar"

// This wrapper ensures Sidebar (with its hooks) is properly isolated as a Client Component
export function SidebarWrapper() {
  return <Sidebar />
}