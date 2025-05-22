// app/teachers/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Search,
  Filter,
  ClipboardCheck,
  BarChart4,
  Eye,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Award,
  Edit2 as EditIcon,
  Trash2 as DeleteIcon,
} from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

import { db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  documentId,
  deleteDoc,
  doc as firestoreDoc,
  DocumentData,
  Query,
} from "firebase/firestore"
import { useAuth } from "@/hooks/useAuth"

/* ------------------------------------------------------------------ */
/*                               Types                                */
/* ------------------------------------------------------------------ */

type FireTeacher = {
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

type Row = FireTeacher & {
  evaluations: number
  /** 0-100 % */
  avgScore: number
}

/* convert 1-5 score -> 0-100% */
const pct = (raw: number) => Math.round(raw * 20)

/* ------------------------------------------------------------------ */
/*                                Page                                */
/* ------------------------------------------------------------------ */

const TeachersPage: React.FC = () => {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();
  const isTeacher = role === "teacher";
  const isSupervisor = role === "supervisor";

  // ─── All state hooks ──────────────────────
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"name" | "avgScore" | "evaluations">("name");

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<FireTeacher | null>(null);

  // IMPORTANT: useMemo hook must be defined before any conditional return statements
  /* filtered / sorted data */
  const filtered = useMemo(() => {
    let data = [...rows]

    if (search.trim()) {
      const s = search.toLowerCase()
      data = data.filter((r) => r.name.toLowerCase().includes(s))
    }
    if (deptFilter !== "all") {
      data = data.filter((r) => r.department === deptFilter)
    }
    data.sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name, "ar")
      }
      if (sortKey === "avgScore") return b.avgScore - a.avgScore
      return b.evaluations - a.evaluations
    })
    return data
  }, [rows, search, deptFilter, sortKey])

  // redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  // 2) load data once we know we have a user
  useEffect(() => {
    if (authLoading || !user) return;
    const uid = user.uid;

    async function load() {
      setLoading(true);

      // 1️⃣ fetch teachers
      let teacherQ: Query<DocumentData> = collection(db, "teachers");
      if (isTeacher) {
        teacherQ = query(
          collection(db, "teachers"),
          where(documentId(), "==", uid)
        );
      }
      const tSnap = await getDocs(teacherQ);
      const teachers: FireTeacher[] = tSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // 2️⃣ fetch evaluations
      let evalQ: Query<DocumentData> = collection(db, "evaluations");
      if (isTeacher) {
        evalQ = query(
          collection(db, "evaluations"),
          where("teacherId", "==", uid)
        );
      }
      const eSnap = await getDocs(evalQ);
      const evals = eSnap.docs.map((d) => d.data() as any);

      // 3️⃣ aggregate stats
      const agg: Record<string, { count: number; sumRaw: number }> = {};
      evals.forEach((ev) => {
        const tid: string = ev.teacherId;
        const rawScores: number[] = [];
        Object.values(ev.evaluation).forEach((tab: any) =>
          Object.values(tab).forEach((item: any) => rawScores.push(item.score))
        );
        const avgRaw =
          rawScores.reduce((a, b) => a + b, 0) / (rawScores.length || 1);

        if (!agg[tid]) agg[tid] = { count: 0, sumRaw: 0 };
        agg[tid].count++;
        agg[tid].sumRaw += avgRaw;
      });

      // 4️⃣ prepare rows
      const prepared: Row[] = teachers.map((t) => {
        const stats = agg[t.id] ?? { count: 0, sumRaw: 0 };
        const percent = stats.count ? pct(stats.sumRaw / stats.count) : 0;
        return { ...t, evaluations: stats.count, avgScore: percent };
      });

      setRows(prepared);
      setLoading(false);
    }

    load();
  }, [authLoading, user, role, isTeacher]);

  // delete handler
  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المعلم؟")) return
    try {
      // Check if the user is a supervisor before attempting to delete
      if (!isSupervisor) {
        alert("فقط المشرفين يمكنهم حذف المعلمين.")
        return
      }
      
      try {
        // Try to delete from Firestore
        await deleteDoc(firestoreDoc(db, "teachers", id))
        // remove ACL entry
        await deleteDoc(firestoreDoc(db, "users", id))
        // update state
        setRows((prev) => prev.filter((r) => r.id !== id))
        alert("تم حذف المعلم بنجاح.")
      } catch (firestoreErr) {
        console.error("Firestore error:", firestoreErr)
        alert("فشل الحذف: خطأ في الصلاحيات. تأكد من أن لديك صلاحيات كافية.")
      }
    } catch (err) {
      console.error("General error:", err)
      alert("فشل الحذف، حاول مرة أخرى.")
    }
  }

  // while we're checking or redirecting, show loader
  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        جاري التحميل…
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8">جاري التحميل…</div>;
  }

  return (
    <div dir="rtl" className="space-y-6">
      <Dialog open={open} onOpenChange={setOpen}>
        {current && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold mb-2 text-right">
                {current.name}
              </DialogTitle>
              <DialogDescription className="text-right">
                بطاقة معلومات المعلم
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-right">
              <Info icon={<Mail />} label={current.email} />
              <Info icon={<Phone />} label={current.phone} />
              <Info
                icon={<Calendar />}
                label={`تاريخ التعيين: ${current.joinDate || "—"}`}
              />
              <Info icon={<Award />} label={`الخبرة: ${current.experience || "—"}`} />
              <Info icon={<BookOpen />} label={current.education || "—"} />
              <p className="pt-2 text-muted-foreground">
                {current.bio || "لا توجد نبذة مسجّلة."}
              </p>
            </div>
            <div className="pt-4 flex justify-end">
              <Link href={`/teachers/${current.id}`}>
                <Button size="sm">ملف كامل</Button>
              </Link>
            </div>
          </DialogContent>
        )}

        {/* Main content */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-right">المعلمين</h1>
          {isSupervisor && (
            <Link href="/teachers/new">
              <Button>إضافة معلم جديد</Button>
            </Link>
          )}
        </div>
        <Card>
          <CardContent className="p-6">
            {/* filters */}
            {/* ... (same as before) */}

            {/* table */}
            <div className="mt-6 overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>عدد التقييمات</TableHead>
                    <TableHead>متوسط التقييم</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        لا توجد نتائج مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.subject}</TableCell>
                        <TableCell>{t.department}</TableCell>
                        <TableCell>{t.evaluations}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              t.avgScore >= 90
                                ? "bg-green-500"
                                : t.avgScore >= 80
                                ? "bg-blue-500"
                                : t.avgScore >= 70
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }
                          >
                            {t.avgScore}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/evaluations/new?teacher=${t.id}`}>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <ClipboardCheck className="h-4 w-4" />
                                <span className="sr-only">تقييم جديد</span>
                              </Button>
                            </Link>
                            <Link href={`/teachers/${t.id}/reports`}>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <BarChart4 className="h-4 w-4" />
                                <span className="sr-only">التقارير</span>
                              </Button>
                            </Link>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setCurrent(t)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">عرض سريع</span>
                              </Button>
                            </DialogTrigger>

                            {/* Supervisor-only edit/delete */}
                            {isSupervisor && (
                              <>
                                <Link href={`/teachers/${t.id}/edit`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <EditIcon className="h-4 w-4" />
                                    <span className="sr-only">تعديل</span>
                                  </Button>
                                </Link>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleDelete(t.id)}
                                >
                                  <DeleteIcon className="h-4 w-4" />
                                  <span className="sr-only">حذف</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Dialog>
    </div>
  )
}

export default TeachersPage

/* ------------------------------------------------------------------ */
/*                        small sub-component                          */
/* ------------------------------------------------------------------ */
function Info({
  icon,
  label,
}: {
  icon: React.ReactNode
  label?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground h-4 w-4">{icon}</span>
      <span>{label || "—"}</span>
    </div>
  )
}