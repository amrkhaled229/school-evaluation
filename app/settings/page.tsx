// app/settings/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { PlusCircle, Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function SettingsPage() {
  const router = useRouter()

  // General & system
  const generalRef = doc(db, "settings", "general")
  const [schoolName, setSchoolName] = useState("")
  const [schoolCode, setSchoolCode] = useState("")
  const [address, setAddress] = useState("")
  const [schoolEmail, setSchoolEmail] = useState("")
  const [schoolPhone, setSchoolPhone] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [rtl, setRtl] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [language, setLanguage] = useState<"ar" | "en">("ar")

  // Evaluation categories
  const evalRef = doc(db, "settings", "evaluation")
  const [categories, setCategories] = useState<
    { id: string; label: string; weight: number; active: boolean }[]
  >([])

  // Supervisors
  const [supervisors, setSupervisors] = useState<
    { id: string; name: string; email: string; status: string }[]
  >([])

  // Notifications
  const notifRef = doc(db, "settings", "notifications")
  const [emailNotif, setEmailNotif] = useState(false)
  const [newEvalNotif, setNewEvalNotif] = useState(false)
  const [reminderNotif, setReminderNotif] = useState(false)
  const [systemUpdatesNotif, setSystemUpdatesNotif] = useState(false)
  const [reminderFrequency, setReminderFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly")

  // Load all data on mount
  useEffect(() => {
    async function load() {
      // General + system
      const gSnap = await getDoc(generalRef)
      if (gSnap.exists()) {
        const g = gSnap.data() as any
        setSchoolName(g.schoolName || "")
        setSchoolCode(g.schoolCode || "")
        setAddress(g.address || "")
        setSchoolEmail(g.schoolEmail || "")
        setSchoolPhone(g.schoolPhone || "")
        setDarkMode(!!g.darkMode)
        setRtl(!!g.rtl)
        setAutoSave(!!g.autoSave)
        setLanguage(g.language || "ar")
      }

      // Evaluation categories
      const eSnap = await getDoc(evalRef)
      if (eSnap.exists()) {
        setCategories(eSnap.data().categories || [])
      }

      // Supervisors only (role === "supervisor")
      const uSnap = await getDocs(collection(db, "users"))
      setSupervisors(
        uSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((u) => u.role === "supervisor")
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: u.status || "active",
          }))
      )

      // Notifications
      const nSnap = await getDoc(notifRef)
      if (nSnap.exists()) {
        const n = nSnap.data() as any
        setEmailNotif(!!n.emailNotif)
        setNewEvalNotif(!!n.newEvalNotif)
        setReminderNotif(!!n.reminderNotif)
        setSystemUpdatesNotif(!!n.systemUpdatesNotif)
        setReminderFrequency(n.reminderFrequency || "weekly")
      }
    }
    load()
  }, [])

  // Save handlers
  const saveGeneral = async () => {
    await setDoc(
      generalRef,
      {
        schoolName,
        schoolCode,
        address,
        schoolEmail,
        schoolPhone,
        darkMode,
        rtl,
        autoSave,
        language,
      },
      { merge: true }
    )
    alert("تم حفظ الإعدادات العامة!")
  }

  const saveEvaluation = async () => {
    await setDoc(evalRef, { categories }, { merge: true })
    alert("تم حفظ معايير التقييم!")
  }

  const saveNotifications = async () => {
    await setDoc(
      notifRef,
      {
        emailNotif,
        newEvalNotif,
        reminderNotif,
        systemUpdatesNotif,
        reminderFrequency,
      },
      { merge: true }
    )
    alert("تم حفظ إعدادات الإشعارات!")
  }

  const removeSupervisor = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشرف؟")) return
    await deleteDoc(doc(db, "users", id))
    setSupervisors((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">الإعدادات</h1>

      <Tabs defaultValue="general">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="general">عام</TabsTrigger>
          <TabsTrigger value="evaluation">التقييم</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="pt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معلومات المدرسة</CardTitle>
              <CardDescription>تعديل المعلومات الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolName">اسم المدرسة</Label>
                  <Input
                    id="schoolName"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolCode">الرمز التعريفي</Label>
                  <Input
                    id="schoolCode"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schoolEmail">بريد المدرسة</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="schoolPhone">هاتف المدرسة</Label>
                  <Input
                    id="schoolPhone"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>

            <CardHeader>
              <CardTitle>إعدادات النظام</CardTitle>
              <CardDescription>تخصيص خيارات النظام</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="darkMode">الوضع الداكن</Label>
                <Switch
                  id="darkMode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              <div className="flex justify-between">
                <Label htmlFor="rtl">واجهة RTL</Label>
                <Switch id="rtl" checked={rtl} onCheckedChange={setRtl} />
              </div>
              <div className="flex justify-between">
                <Label htmlFor="autoSave">الحفظ التلقائي</Label>
                <Switch
                  id="autoSave"
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
              <div>
                <Label>اللغة</Label>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as "ar" | "en")}
                >
                  <SelectTrigger id="languageTrigger">
                    <SelectValue placeholder="اختر اللغة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">الإنجليزية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>

            <CardFooter>
              <Button onClick={saveGeneral}>حفظ التغييرات</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Evaluation */}
        <TabsContent value="evaluation" className="pt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معايير التقييم</CardTitle>
              <CardDescription>إدارة فئات التقييم</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفئة</TableHead>
                    <TableHead>الوزن (%)</TableHead>
                    <TableHead>نشط</TableHead>
                    <TableHead className="text-right">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat, i) => (
                    <TableRow key={cat.id}>
                      <TableCell>{cat.label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={cat.weight}
                          onChange={(e) => {
                            const w = parseInt(e.target.value) || 0
                            setCategories((prev) =>
                              prev.map((c, j) =>
                                j === i ? { ...c, weight: w } : c
                              )
                            )
                          }}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={cat.active}
                          onCheckedChange={(v) =>
                            setCategories((prev) =>
                              prev.map((c, j) =>
                                j === i ? { ...c, active: v } : c
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setCategories((prev) =>
                              prev.filter((_, j) => j !== i)
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                onClick={() =>
                  setCategories((prev) => [
                    ...prev,
                    {
                      id: `cat-${Date.now()}`,
                      label: "فئة جديدة",
                      weight: 10,
                      active: true,
                    },
                  ])
                }
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                إضافة فئة
              </Button>
            </CardContent>
            <CardFooter>
              <Button onClick={saveEvaluation}>حفظ معايير التقييم</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="pt-6 space-y-4">
          <Card>
            <CardHeader className="flex justify-between">
              <div>
                <CardTitle>المشرفون</CardTitle>
                <CardDescription>إدارة حسابات المشرفين</CardDescription>
              </div>
              <Button onClick={() => router.push("/settings/add-user")}>
                <UserPlus className="h-4 w-4 mr-2" />
                إضافة مشرف
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المشرف</TableHead>
                    <TableHead>البريد</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-right">حذف</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisors.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {((u.name ?? u.email) || "")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {u.name ?? u.email ?? ""}
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            u.status === "active"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSupervisor(u.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="pt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الإشعارات</CardTitle>
              <CardDescription>اختيارات التنبيهات</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <Label htmlFor="emailNotif">بريد إلكتروني</Label>
                <Switch
                  id="emailNotif"
                  checked={emailNotif}
                  onCheckedChange={setEmailNotif}
                />
              </div>
              <div className="flex justify-between">
                <Label htmlFor="newEvalNotif">تقييم جديد</Label>
                <Switch
                  id="newEvalNotif"
                  checked={newEvalNotif}
                  onCheckedChange={setNewEvalNotif}
                />
              </div>
              <div className="flex justify-between">
                <Label htmlFor="reminderNotif">تذكير</Label>
                <Switch
                  id="reminderNotif"
                  checked={reminderNotif}
                  onCheckedChange={setReminderNotif}
                />
              </div>
              <div className="flex justify-between">
                <Label htmlFor="systemUpdatesNotif">
                  تحديثات النظام
                </Label>
                <Switch
                  id="systemUpdatesNotif"
                  checked={systemUpdatesNotif}
                  onCheckedChange={setSystemUpdatesNotif}
                />
              </div>
              <div>
                <Label>تكرار التذكير</Label>
                <Select
                  value={reminderFrequency}
                  onValueChange={(v) =>
                    setReminderFrequency(v as "daily" | "weekly" | "monthly")
                  }
                >
                  <SelectTrigger id="reminderFreqTrigger">
                    <SelectValue placeholder="اختر التكرار" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="weekly">أسبوعي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveNotifications}>
                حفظ إعدادات الإشعارات
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
