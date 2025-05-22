// app/teachers/[id]/edit/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/hooks/useAuth"

type Teacher = {
  id: string
  name: string
  subject: string
  department: string
  email?: string
  phone?: string
  joinDate?: string
  experience?: string
  education?: string
  bio?: string
}

// Default values for our form
const emptyTeacher: Teacher = {
  id: "",
  name: "",
  subject: "",
  department: "",
  email: "",
  phone: "",
  joinDate: "",
  experience: "",
  education: "",
  bio: "",
}

const departments = ["القسم الابتدائي", "القسم المتوسط", "القسم الثانوي"]

export default function EditTeacherPage({ params }: { params: { id: string } }) {
  const teacherId = params.id
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const isSupervisor = role === "supervisor"

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teacher, setTeacher] = useState<Teacher>(emptyTeacher)
  const [error, setError] = useState("")

  // Load teacher data
  useEffect(() => {
    if (authLoading) return

    // Check authentication and permissions
    if (!user) {
      router.replace("/login")
      return
    }

    if (!isSupervisor) {
      setError("ليست لديك صلاحية لتعديل بيانات المعلمين")
      setLoading(false)
      return
    }

    async function loadTeacher() {
      try {
        const docRef = doc(db, "teachers", teacherId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          setTeacher({
            id: docSnap.id,
            ...docSnap.data() as Omit<Teacher, "id">
          })
        } else {
          setError("لم يتم العثور على المعلم")
        }
      } catch (err) {
        console.error("Error loading teacher:", err)
        setError("حدث خطأ أثناء تحميل بيانات المعلم")
      } finally {
        setLoading(false)
      }
    }

    loadTeacher()
  }, [teacherId, router, user, authLoading, isSupervisor])

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!teacher.name || !teacher.subject || !teacher.department) {
      setError("الرجاء تعبئة الحقول الإلزامية")
      return
    }

    setSaving(true)
    setError("")

    try {
      // Update teacher document in Firestore
      const teacherRef = doc(db, "teachers", teacherId)
      
      // Remove the id field before updating
      const { id, ...teacherData } = teacher
      
      await updateDoc(teacherRef, teacherData)
      
      alert("تم حفظ التعديلات بنجاح")
      // Navigate back to the teachers list
      router.push("/teachers")
    } catch (err) {
      console.error("Error saving teacher:", err)
      setError("فشل حفظ البيانات. الرجاء المحاولة مرة أخرى.")
    } finally {
      setSaving(false)
    }
  }

  // Handle form field changes
  const handleChange = (field: keyof Teacher, value: string) => {
    setTeacher(prev => ({ ...prev, [field]: value }))
  }

  if (authLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>
  }

  if (loading) {
    return <div className="text-center py-8">جاري تحميل بيانات المعلم...</div>
  }

  if (error && !teacher.name) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => router.push("/teachers")}>العودة إلى قائمة المعلمين</Button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-right">تعديل بيانات المعلم</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-right">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم</Label>
                  <Input
                    id="name"
                    value={teacher.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={teacher.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={teacher.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Work Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">المادة</Label>
                  <Input
                    id="subject"
                    value={teacher.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">القسم</Label>
                  <Select
                    value={teacher.department}
                    onValueChange={(value) => handleChange("department", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="joinDate">تاريخ التعيين</Label>
                  <Input
                    id="joinDate"
                    value={teacher.joinDate || ""}
                    onChange={(e) => handleChange("joinDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="experience">الخبرة</Label>
                <Input
                  id="experience"
                  value={teacher.experience || ""}
                  onChange={(e) => handleChange("experience", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="education">المؤهلات العلمية</Label>
                <Input
                  id="education"
                  value={teacher.education || ""}
                  onChange={(e) => handleChange("education", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio">نبذة شخصية</Label>
                <Textarea
                  id="bio"
                  value={teacher.bio || ""}
                  onChange={(e) => handleChange("bio", e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.push("/teachers")}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}