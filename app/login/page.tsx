// app/login/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, signInWithEmailAndPassword, getIdToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [roleTab, setRoleTab] = useState<"supervisor" | "teacher">("supervisor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect out
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/teachers");
    }
  }, [user, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // grab and store the Firebase ID token so our middleware sees it
      const token = await getIdToken(cred.user);
      document.cookie = `token=${token}; Path=/; Max-Age=${7 * 24 * 60 * 60}`;

      // load the user's Firestore profile for their role
      const snap = await getDoc(doc(db, "users", uid));
      const role = snap.exists() ? (snap.data() as any).role : null;

      if (role === "supervisor") {
        router.push("/teachers");
      } else if (role === "teacher") {
        router.push(`/teachers/${uid}`);
      } else {
        alert("لا يوجد دور مسجل لهذا المستخدم");
        await auth.signOut();
      }
    } catch (err: any) {
      alert(err.message || "خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="h-screen flex items-center justify-center" dir="rtl">
        Loading…
      </div>
    );
  }

  return (
    <div
      className="flex h-screen w-full items-center justify-center bg-slate-50"
      dir="rtl"
    >
      <div className="mx-auto w-full max-w-sm space-y-6 text-right">
        <div className="text-center">
          <h1 className="text-3xl font-bold">مدارس الرواد</h1>
          <p className="text-sm text-muted-foreground">
            نظام تقييم المعلمين
          </p>
        </div>

        <Tabs
          value={roleTab}
          onValueChange={(v) =>
            setRoleTab(v as "supervisor" | "teacher")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="supervisor">مشرف</TabsTrigger>
            <TabsTrigger value="teacher">معلم</TabsTrigger>
          </TabsList>

          <TabsContent value={roleTab}>
            <Card>
              <CardHeader>
                <CardTitle className="text-right">
                  تسجيل الدخول كـ{" "}
                  {roleTab === "supervisor" ? "مشرف" : "معلم"}
                </CardTitle>
                <CardDescription className="text-right">
                  أدخل بريدك وكلمة المرور
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="أدخل البريد الإلكتروني"
                        className="pr-10 text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور"
                        className="pr-10 text-right"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute left-0 top-0 h-full px-3"
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 text-right">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? "جاري تسجيل الدخول…" : "تسجيل الدخول"}
                  </Button>

                  {roleTab === "teacher" && (
                    <p className="text-center text-sm">
                      ليس لديك حساب؟{" "}
                      <Link
                        href="/signup"
                        className="text-blue-600 underline"
                      >
                        إنشاء حساب جديد
                      </Link>
                    </p>
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
