// app/page.tsx
"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  ClipboardCheck,
  BarChart4,
  TrendingUp,
  Award,
} from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

interface Evaluation {
  id: string
  teacherId: string
  createdAt: any
  evaluation: Record<string, Record<string, any>>
  teacherName: string
  percent: number
}

interface Teacher {
  id: string
  name: string
}

export default function Dashboard() {
  const [totalTeachers, setTotalTeachers] = useState(0)
  const [completedEvals, setCompletedEvals] = useState(0)
  const [averagePercent, setAveragePercent] = useState(0)
  const [pendingEvals, setPendingEvals] = useState(0)
  const [latestEvals, setLatestEvals] = useState<Evaluation[]>([])
  const [topTeachers, setTopTeachers] = useState<
    { name: string; percent: number }[]
  >([])

  useEffect(() => {
    async function fetchStats() {
      // 1) Load teachers
      const tSnap = await getDocs(collection(db, "teachers"))
      const teachers: Teacher[] = tSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
      setTotalTeachers(teachers.length)

      // 2) Load evaluations
      const eSnap = await getDocs(collection(db, "evaluations"))
      const evalsRaw: any[] = eSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))

      // 3) Completed evaluations count
      setCompletedEvals(evalsRaw.length)

      // 4) Compute overall average percent
      const allScores: number[] = []
      evalsRaw.forEach((ev) => {
        const evObj = ev.evaluation as Record<string, any>
        Object.values(evObj).forEach((tab: any) => {
          Object.values(tab).forEach((item: any) => {
            allScores.push(item.score)
          })
        })
      })
      const rawAvg =
        allScores.reduce((sum, s) => sum + s, 0) / (allScores.length || 1)
      setAveragePercent(Math.round(rawAvg * 20))

      // 5) Pending evaluations (missing createdAt)
      setPendingEvals(evalsRaw.filter((ev) => !ev.createdAt).length)

      // 6) Latest 5 evaluations with teacherName & percent
      const latestFive: Evaluation[] = evalsRaw
        .filter((ev) => ev.createdAt)
        .sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        )
        .slice(0, 5)
        .map((ev) => {
          const evObj = ev.evaluation as Record<string, any>
          const scores = Object.values(evObj)
            .flatMap((tab: any) => Object.values(tab))
            .map((item: any) => item.score)
          const raw =
            scores.length > 0
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : 0
          const percent = Math.round(raw * 20)

          return {
            id: ev.id,
            teacherId: ev.teacherId,
            createdAt: ev.createdAt,
            evaluation: ev.evaluation,
            teacherName:
              teachers.find((t) => t.id === ev.teacherId)?.name ??
              ev.teacherId,
            percent,
          }
        })
      setLatestEvals(latestFive)

      // 7) Top 3 teachers by average percent
      const agg: Record<string, { sum: number; count: number }> = {}
      evalsRaw.forEach((ev) => {
        const evObj = ev.evaluation as Record<string, any>
        const scores = Object.values(evObj)
          .flatMap((tab: any) => Object.values(tab))
          .map((item: any) => item.score)
        const raw =
          scores.reduce((s, v) => s + v, 0) / (scores.length || 1)
        agg[ev.teacherId] = agg[ev.teacherId] || { sum: 0, count: 0 }
        agg[ev.teacherId].sum += raw
        agg[ev.teacherId].count += 1
      })
      const topThree = Object.entries(agg)
        .map(([id, { sum, count }]) => ({
          id,
          avg: sum / count,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 3)
        .map(({ id, avg }) => ({
          name: teachers.find((t) => t.id === id)?.name ?? "-",
          percent: Math.round(avg * 20),
        }))
      setTopTeachers(topThree)
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            تحديث البيانات
          </Button>
          <Link href="/evaluations/new?teacher=">
            <Button>تقييم جديد</Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المعلمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}</div>
            <p className="text-xs text-muted-foreground">+2 منذ الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              التقييمات المكتملة
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedEvals}</div>
            <p className="text-xs text-muted-foreground">
              +12 منذ الشهر الماضي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">متوسط التقييم</CardTitle>
            <BarChart4 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePercent}%</div>
            <p className="text-xs text-muted-foreground">+4% منذ الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              التقييمات المعلقة
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEvals}</div>
            <p className="text-xs text-muted-foreground">-2 منذ الشهر الماضي</p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Evaluations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>أحدث التقييمات</CardTitle>
            <CardDescription>آخر 5 تقييمات تم إجراؤها</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {latestEvals.map((ev) => {
                const date = ev.createdAt
                  .toDate()
                  .toLocaleDateString("ar-EG")
                return (
                  <div key={ev.id} className="flex items-center">
                    <div className="font-medium flex-1">{ev.teacherName}</div>
                    <div className="text-sm text-muted-foreground flex-1">
                      {date}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Progress value={ev.percent} className="h-2" />
                      <span className="text-sm font-medium">
                        {ev.percent}%
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex-1" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Teachers */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>أفضل المعلمين أداءً</CardTitle>
            <CardDescription>
              المعلمون الحاصلون على أعلى التقييمات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topTeachers.map((t, i) => (
                <div key={i} className="flex items-center">
                  <div className="mr-2">
                    <Award
                      className={`h-8 w-8 ${
                        i === 0
                          ? "text-yellow-500"
                          : i === 1
                          ? "text-gray-400"
                          : "text-amber-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{t.name}</div>
                  </div>
                  <div className="font-bold text-lg">{t.percent}%</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
