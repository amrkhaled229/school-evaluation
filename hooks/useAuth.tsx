/* hooks/useAuth.ts - Fixed export */
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

export type Role = "supervisor" | "teacher";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  /* ───────── listen once to auth + user doc ───────── */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // realtime listener on users/{uid}
        const unsubSnap = onSnapshot(doc(db, "users", firebaseUser.uid), (s) => {
          setRole((s.data()?.role as Role) ?? null);
          setLoading(false);
        });

        return () => unsubSnap();
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ------------ convenience hook ------------ */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}

// Ensure both named exports are available
export default AuthProvider;