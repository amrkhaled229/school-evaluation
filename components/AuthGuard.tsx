// components/AuthGuard.tsx
"use client";

import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function AuthGuard({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: Array<"supervisor" | "teacher">;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (allowedRoles && !allowedRoles.includes(role!)) {
        // Signed in but not authorized for this page
        router.replace("/teachers"); // or wherever you want teachers to land
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || (allowedRoles && !allowedRoles.includes(role!))) {
    return <div className="flex h-full items-center justify-center">Loading…</div>;
  }

  return <>{children}</>;
}
