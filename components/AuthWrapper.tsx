// components/AuthWrapper.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "./AuthGuard";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // allow login (and static assets, etc.) through
  if (path.startsWith("/login")) {
    return <>{children}</>;
  }
  // otherwise guard everything
  return <AuthGuard>{children}</AuthGuard>;
}
