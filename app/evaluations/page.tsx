// app/evaluations/page.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Filter, Printer, Download, Search } from "lucide-react"
import { db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  query,
  where,
  Query,
  DocumentData,
} from "firebase/firestore"
import { useAuth } from "@/hooks/useAuth"
import AuthGuard from "@/components/AuthGuard"

/* -------------------------------------------------------------------------- */
/*                               helper types                                 */
/* -------------------------------------------------------------------------- */

interface Teacher {
  id: string
  uid: string
  name: string
  department: string
}

interface EvalRow {
  id: string
  teacherId: string
  teacherName: string
  department: string
  createdAt: Date
  avgPct: number
}

/* convert raw 1-5 score -> 0-100 % */
const pct = (raw: number) => Math.round(raw * 20)

const PAGE_SIZE = 10

export default function EvaluationsPage() {
  const { user, role, loading: authLoading } = useAuth()
  const isTeacher = role === "teacher"

  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [evaluations, setEvaluations] = useState<EvalRow[]>([])
  const [loading, setLoading] = useState(true)

  /* filters */
  const [deptFilter, setDeptFilter] = useState<string>("all")
  const [teacherFilter, setTeacherFilter] = useState<string>("all")
  const [minScore, setMinScore] = useState<number>(0)
  const [search, setSearch] = useState<string>("")
  const [page, setPage] = useState(0)

  useEffect(() => {
    // wait until auth state is known
    if (authLoading) return
    if (!user) return

    const uid = user.uid

    async function fetchData() {
      setLoading(true)

      // Fetch teachers
      let teachersQuery: Query<DocumentData> = collection(db, "teachers")
      if (isTeacher) {
        teachersQuery = query(
          collection(db, "teachers"),
          where("uid", "==", uid)
        )
      }
      const tSnap = await getDocs(teachersQuery)
      const teachersArr: Teacher[] = tSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))

      // Fetch evaluations
      let evalQuery: Query<DocumentData> = collection(db, "evaluations")
      if (isTeacher) {
        evalQuery = query(
          collection(db, "evaluations"),
          where("teacherId", "==", uid)
        )
      }
      const eSnap = await getDocs(evalQuery)

      const evalRows: EvalRow[] = eSnap.docs.map((d) => {
        const data: any = d.data()
        const teacher =
          teachersArr.find((t) => t.id === data.teacherId) || {
            name: "—",
            department: "—",
          }

        // aggregate scores
        const rawScores: number[] = []
        Object.values(data.evaluation).forEach((tab: any) =>
          Object.values(tab).forEach((item: any) =>
            rawScores.push(item.score)
          )
        )
        const avgRaw =
          rawScores.reduce((sum, v) => sum + v, 0) / rawScores.length

        return {
          id: d.id,
          teacherId: data.teacherId,
          teacherName: teacher.name,
          department: teacher.department,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          avgPct: pct(avgRaw),
        }
      })

      // sort newest first
      evalRows.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )

      setTeachers(teachersArr)
      setEvaluations(evalRows)
      setLoading(false)
    }

    fetchData()
  }, [authLoading, user, role, isTeacher])

  /* filtered rows */
  const rows = useMemo(() => {
    return evaluations
      .filter((r) =>
        deptFilter === "all" ? true : r.department === deptFilter
      )
      .filter((r) =>
        teacherFilter === "all" ? true : r.teacherId === teacherFilter
      )
      .filter((r) => r.avgPct >= minScore)
      .filter((r) =>
        search
          ? r.teacherName.toLowerCase().includes(search.toLowerCase())
          : true
      )
  }, [evaluations, deptFilter, teacherFilter, minScore, search])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pagedRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (authLoading || loading) {
    return <div>جاري التحميل...</div>
  }

  return (
    <AuthGuard allowedRoles={["supervisor", "teacher"]}>
      <div className="space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">التقييمات</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              تصفية
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              طباعة
            </Button>
            <Button variant="outline" size="sm" className="w-15 px-2">
              <Download className="mr-2 h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        {/* filters */}
        <Card>
          <CardHeader>
            <CardTitle>خيارات التصفية</CardTitle>
            <CardDescription>فلترة و فرز التقييمات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Select
                value={deptFilter}
                onValueChange={(v) => setDeptFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأقسام</SelectItem>
                  {Array.from(
                    new Set(teachers.map((t) => t.department))
                  ).map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={teacherFilter}
                onValueChange={(v) => setTeacherFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="المعلم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المعلمين</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(minScore)}
                onValueChange={(v) => setMinScore(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="أقل نسبة" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 40, 60, 70, 80, 90].map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* search */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم المعلم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* table */}
        <Card>
          <CardContent className="p-6">
            {rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد بيانات مطابقة
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>المعلم</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المتوسط</TableHead>
                        <TableHead>التقدّم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedRows.map((r, i) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {page * PAGE_SIZE + i + 1}
                          </TableCell>
                          <TableCell>{r.teacherName}</TableCell>
                          <TableCell>{r.department}</TableCell>
                          <TableCell>
                            {r.createdAt.toLocaleDateString("ar-EG")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                r.avgPct >= 90
                                  ? "bg-green-500"
                                  : r.avgPct >= 80
                                  ? "bg-blue-500"
                                  : r.avgPct >= 70
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }
                            >
                              {r.avgPct}%
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Progress value={r.avgPct} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* pagination */}
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-sm">
                    صفحة {page + 1} من {totalPages}
                  </span>
                  <div className="space-x-2 rtl:space-x-reverse">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  )
}
