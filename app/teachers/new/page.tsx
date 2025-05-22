// app/teachers/new/page.tsx
"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { getAuth } from "firebase/auth"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import AuthGuard from "@/components/AuthGuard"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function NewTeacherPage() {
  const router = useRouter()
  const { role, loading: authLoading } = useAuth()

  const [name, setName] = useState("")
  const [birthDate, setBirthDate] = useState("")    // YYYY-MM-DD
  const [subject, setSubject] = useState("")
  const [department, setDepartment] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [joinDate, setJoinDate] = useState("")      // YYYY-MM-DD
  const [experience, setExperience] = useState("")
  const [education, setEducation] = useState("")
  const [bio, setBio] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // wait for auth state
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        جاري التحقق…
      </div>
    )
  }

  // Only supervisors may access
  if (role !== "supervisor") {
    return (
      <div className="h-screen flex items-center justify-center text-red-600">
        غير مسموح بالوصول
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsSubmitting(true)

  try {
    // 1) get current Firebase user
    const auth = getAuth()
    const currentUser = auth.currentUser
    if (!currentUser) {
      throw new Error("لم يتم المصادقة")
    }

    // 2) fetch a fresh ID token (force refresh) with improved error handling
    let supervisorToken
    try {
      supervisorToken = await currentUser.getIdToken(true)
      console.log("Token obtained successfully") // Debug log
    } catch (tokenError) {
      console.error("Error getting token:", tokenError)
      throw new Error("فشل في الحصول على رمز المصادقة")
    }

    // 3) call server route with better error handling
    console.log("Sending request to API...") // Debug log
    const res = await fetch("/api/createTeacher", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        name,
        birthDate,
        subject,
        department,
        email,
        phone,
        joinDate,
        experience,
        education,
        bio,
      }),
    })

    // Improved error handling for API response
    let data
    try {
      data = await res.json()
    } catch (parseError) {
      console.error("Error parsing response:", parseError)
      throw new Error("فشل في قراءة استجابة الخادم")
    }

    console.log("API Response:", res.status, data) // Debug log

    if (!res.ok) {
      throw new Error(data.error || "فشل إضافة المعلم")
    }

    // 4) success feedback
    toast({
      title: "تم إضافة المعلم!",
      description: `${name} تمت إضافته بنجاح.`,
    })
    router.push("/teachers")
  } catch (err: any) {
    console.error("Submit error:", err)
    toast({
      title: "خطأ",
      description: err.message || "حدث خطأ أثناء الإضافة.",
      variant: "destructive",
    })
    setIsSubmitting(false)
  }
}

  return (
    <AuthGuard allowedRoles={["supervisor"]}>
      <div className="max-w-2xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>إضافة معلم جديد</CardTitle>
            <CardDescription>
              املأ البيانات أدناه ثم انقر "إضافة المعلم"
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">الاسم</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Birth Date */}
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

              {/* Subject */}
              <div>
                <Label htmlFor="subject">المادة</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              {/* Department */}
              <div>
                <Label htmlFor="department">القسم</Label>
                <Select
                  value={department}
                  onValueChange={setDepartment}
                  required
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="الثانوي">الثانوي</SelectItem>
                    <SelectItem value="المتوسط">المتوسط</SelectItem>
                    <SelectItem value="الإبتدائي">الإبتدائي</SelectItem>                   
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
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

              {/* Phone */}
              <div>
                <Label htmlFor="phone">الهاتف</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              {/* Join Date */}
              <div>
                <Label htmlFor="joinDate">تاريخ التعيين</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  required
                />
              </div>

              {/* Experience */}
              <div>
                <Label htmlFor="experience">الخبرة</Label>
                <Input
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="مثلاً: 5 سنوات"
                />
              </div>

              {/* Education */}
              <div>
                <Label htmlFor="education">المؤهل العلمي</Label>
                <Input
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="مثلاً: بكالوريوس تربية"
                />
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">نبذة قصيرة</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="نبذة تعريفية..."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "جارٍ الإضافة…" : "إضافة المعلم"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AuthGuard>
  )
}
