// app/signup/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function TeacherSignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [subject, setSubject] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return toast({
        title: "خطأ",
        description: "رجاءً أدخل تاريخ ميلاد صحيح (YYYY-MM-DD).",
      });
    }

    setLoading(true);
    try {
      // Build password: ArwdDDMMYYYY
      const [yyyy, mm, dd] = birthDate.split("-");
      const password = `Arwd${dd}${mm}${yyyy}`;

      const auth = getAuth();
      const cred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = cred.user.uid;

      // 1️⃣ Create a minimal user doc for role-based access control
      await setDoc(doc(db, "users", uid), {
        role: "teacher",
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Create the teacher profile under teachers/{uid}
      await setDoc(doc(db, "teachers", uid), {
        name,
        email,
        birthDate,
        subject,
        department,
        phone,
        joinDate: serverTimestamp(), // can be updated later by supervisor
      });

      toast({
        title: "تم التسجيل!",
        description: `تم إنشاء حسابك بنجاح. كلمة المرور الخاصة بك هي: ${password}`,
      });

      router.push("/login");
    } catch (err: any) {
      console.error(err);
      toast({
        title: "خطأ",
        description: err.message || "فشل التسجيل، حاول مرة أخرى.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>تسجيل حساب جديد</CardTitle>
          <CardDescription>
            سجل هنا كمعلم. سيُنشأ حسابك تلقائيًا ويُرسل لك البريد.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="birthDate">تاريخ الميلاد</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="subject">المادة</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>القسم</Label>
              <Select
                value={department}
                onValueChange={setDepartment}
                required
              >
                <SelectTrigger id="departmentTrigger">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="القسم العلمي">
                    القسم العلمي
                  </SelectItem>
                  <SelectItem value="القسم الأدبي">
                    القسم الأدبي
                  </SelectItem>
                  <SelectItem value="قسم اللغات">قسم اللغات</SelectItem>
                  <SelectItem value="التربية الإسلامية">
                    التربية الإسلامية
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone">رقم الجوال</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "جاري التسجيل…" : "تسجيل"}
            </Button>
            <div className="text-center text-sm">
              بالفعل لديك حساب؟{" "}
              <Link
                href="/login"
                className="text-blue-600 underline hover:text-blue-800"
              >
                تسجيل الدخول
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
