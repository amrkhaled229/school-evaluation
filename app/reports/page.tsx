// app/reports/page.tsx

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import AuthGuard from "@/components/AuthGuard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
import { Download, Filter, Printer } from "lucide-react"
import {
  Chart,
  ChartContainer,
  ChartLegend,
  ChartTooltipContent,
  ChartTooltipItem,
} from "@/components/ui/chart"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  TooltipProps,
} from "recharts"
import { db } from "@/lib/firebase"
import { collection, getDocs } from "firebase/firestore"

// Arabic month names
const MONTH_NAMES = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
]

// Evaluation categories
const CATEGORIES = {
  classroom: [
    { id: "preparation", label: "التحضير والتخطيط" },
    { id: "delivery",    label: "أسلوب التدريس"    },
    { id: "engagement",  label: "تفاعل الطلاب"     },
    { id: "time",        label: "إدارة الصف"        },
  ],
  student: [
    { id: "understanding", label: "فهم المادة"    },
    { id: "feedback",      label: "التغذية الراجعة" },
    { id: "assessment",    label: "أساليب التقييم" },
  ],
  professional: [
    { id: "knowledge",     label: "المعرفة بالمادة" },
    { id: "development",   label: "التطوير المهني"  },
    { id: "collaboration", label: "التعاون"         },
  ],
}

// Tooltip renderer for Recharts
const renderTooltip = ({ active, payload }: TooltipProps<any, any>) => {
  if (active && payload && payload.length) {
    const entry = payload[0]
    return (
      <ChartTooltipContent>
        <ChartTooltipItem
          label={entry.payload.name}
          value={`${entry.value}%`}
          color={entry.color}
        />
      </ChartTooltipContent>
    )
  }
  return null
}

// convert 1–5 raw score to 0–100%
const pct = (raw: number) => Math.round(raw * 20)

export default function ReportsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("current")
  
  // redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login")
    }
  }, [authLoading, user, router])

  // fetch once on mount - always declare this hook, even if we don't use the data yet
  useEffect(() => {
    // Only fetch data if we're authenticated
    if (!authLoading && user) {
      async function fetchData() {
        const [eSnap, tSnap] = await Promise.all([
          getDocs(collection(db, "evaluations")),
          getDocs(collection(db, "teachers")),
        ])
        setEvaluations(eSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setTeachers(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      fetchData()
    }
  }, [authLoading, user])

  // filter by department & period
  const filteredEvals = useMemo(() => {
    const now = new Date()
    const thisYear = now.getFullYear()

    return evaluations.filter(e => {
      // department filter
      if (selectedDept !== "all") {
        const teacher = teachers.find(t => t.id === e.teacherId)
        if (teacher?.department !== selectedDept) return false
      }
      // period filter
      const date = e.createdAt?.toDate?.() ?? new Date()
      const year = date.getFullYear()
      const month = date.getMonth()
      switch (selectedPeriod) {
        case "current":   return year === thisYear
        case "previous":  return year === thisYear - 1
        case "semester1": return year === thisYear && month <= 5
        case "semester2": return year === thisYear && month >= 6
        default:          return true
      }
    })
  }, [evaluations, teachers, selectedDept, selectedPeriod])

  // compute each evaluation's average percent
  const evalAverages = useMemo(() => {
    return filteredEvals.map(e => {
      const raw: number[] = []
      Object.keys(CATEGORIES).forEach(tab => {
        ;(CATEGORIES as any)[tab].forEach((cat: any) => {
          raw.push(e.evaluation[tab][cat.id].score)
        })
      })
      const avgRaw = raw.reduce((a, b) => a + b, 0) / raw.length
      return {
        teacherId: e.teacherId,
        avgPct: pct(avgRaw),
        createdAt: e.createdAt?.toDate?.() ?? new Date(),
      }
    })
  }, [filteredEvals])

  // aggregate all metrics
  const {
    topTeachers,
    monthlyData,
    departmentData,
    categoryData,
    deptStats,
    teacherDetails,
  } = useMemo(() => {
    // If we're not authenticated yet or don't have data, return empty objects
    if (authLoading || !user || evaluations.length === 0 || teachers.length === 0) {
      return {
        topTeachers: [],
        monthlyData: [],
        departmentData: [],
        categoryData: [],
        deptStats: [],
        teacherDetails: [],
      }
    }

    const teacherAgg: Record<string, { sum: number; count: number }> = {}
    const monthAgg: Record<number, { sum: number; count: number }> = {}
    const deptAgg: Record<string, { sum: number; count: number }> = {}
    const catAgg: Record<string, { sum: number; count: number; label: string }> = {}

    // init categories
    Object.values(CATEGORIES).flat().forEach((c: any) => {
      catAgg[c.id] = { sum: 0, count: 0, label: c.label }
    })

    // fold evalAverages
    evalAverages.forEach(ea => {
      // per‐teacher
      if (!teacherAgg[ea.teacherId]) teacherAgg[ea.teacherId] = { sum: 0, count: 0 }
      teacherAgg[ea.teacherId].sum += ea.avgPct
      teacherAgg[ea.teacherId].count++

      // monthly
      const m = ea.createdAt.getMonth()
      if (!monthAgg[m]) monthAgg[m] = { sum: 0, count: 0 }
      monthAgg[m].sum += ea.avgPct
      monthAgg[m].count++

      // department
      const info = teachers.find(t => t.id === ea.teacherId) ?? {}
      const dept = info.department ?? "غير محدد"
      if (!deptAgg[dept]) deptAgg[dept] = { sum: 0, count: 0 }
      deptAgg[dept].sum += ea.avgPct
      deptAgg[dept].count++
    })

    // fold raw for categories
    filteredEvals.forEach(e => {
      Object.keys(CATEGORIES).forEach(tab => {
        ;(CATEGORIES as any)[tab].forEach((cat: any) => {
          const raw = e.evaluation[tab][cat.id].score
          catAgg[cat.id].sum += pct(raw)
          catAgg[cat.id].count++
        })
      })
    })

    // build top teachers
    const topArr = Object.entries(teacherAgg)
      .map(([tid, v]) => ({ tid, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)
      .map(ta => {
        const info = teachers.find(t => t.id === ta.tid) ?? {}
        return {
          id: ta.tid,
          name: info.name,
          subject: info.subject,
          department: info.department,
          score: Math.round(ta.avg),
        }
      })

    // monthly data
    const monthArr = Object.entries(monthAgg).map(([m, v]) => ({
      name: MONTH_NAMES[+m],
      score: Math.round(v.sum / v.count),
    }))

    // department data
    const deptArr = Object.entries(deptAgg).map(([dept, v]) => ({
      name: dept,
      value: Math.round(v.sum / v.count),
      rawCount: v.count,
    }))

    // category data
    const catArr = Object.values(catAgg).map(c => ({
      name: c.label,
      score: Math.round(c.sum / c.count),
    }))

    // department stats table
    const deptTable = deptArr.map(d => {
      const inDept = teachers.filter(t => t.department === d.name)
      const theirAvgs = Object.entries(teacherAgg)
        .filter(([tid]) => inDept.some(t => t.id === tid))
        .map(([, v]) => v.sum / v.count)
      return {
        department: d.name,
        teacherCount: inDept.length,
        evalCount: d.rawCount,
        avg: d.value,
        max: theirAvgs.length ? Math.round(Math.max(...theirAvgs)) : 0,
        min: theirAvgs.length ? Math.round(Math.min(...theirAvgs)) : 0,
      }
    })

    // detailed teacher report
    const teacherDetailsArr = Object.entries(teacherAgg).map(([tid, v]) => {
      const info = teachers.find(t => t.id === tid) ?? {}
      const detail: any = {
        id: tid,
        name: info.name,
        subject: info.subject,
        department: info.department,
        evalCount: v.count,
        avg: Math.round(v.sum / v.count),
      }
      Object.values(CATEGORIES)
        .flat()
        .forEach(cat => {
          const rel = filteredEvals.filter(e => e.teacherId === tid)
          const perCatPct = rel.length
            ? Math.round(
                rel.reduce((acc, e) => {
                  // find raw
                  const raw = e.evaluation[
                    (Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).find(tab =>
                      (CATEGORIES as any)[tab].some((c: any) => c.id === cat.id)
                    )!
                  ][cat.id].score
                  return acc + pct(raw)
                }, 0) / rel.length
              )
            : 0
          detail[cat.id] = perCatPct
        })
      return detail
    })

    return {
      topTeachers: topArr,
      monthlyData: monthArr,
      departmentData: deptArr,
      categoryData: catArr,
      deptStats: deptTable,
      teacherDetails: teacherDetailsArr,
    }
  }, [evalAverages, filteredEvals, teachers, authLoading, user])

  // while we're checking or redirecting, show loader
  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          التقارير والإحصائيات
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            تصفية
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            طباعة
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="الفترة الزمنية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">العام الحالي</SelectItem>
            <SelectItem value="previous">السنة السابقة</SelectItem>
            <SelectItem value="semester1">الفصل 1</SelectItem>
            <SelectItem value="semester2">الفصل 2</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="القسم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأقسام</SelectItem>
            {departmentData.map(d => (
              <SelectItem key={d.name} value={d.name}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="departments">الأقسام</TabsTrigger>
          <TabsTrigger value="teachers">المعلمين</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6 pt-6">
          {/* Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly */}
            <Card>
              <CardHeader>
                <CardTitle>متوسط التقييم الشهري</CardTitle>
                <CardDescription>
                  تطور متوسط تقييم المعلمين على مدار العام
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <Chart>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip content={renderTooltip} />
                          <Bar
                            dataKey="score"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Chart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category */}
            <Card>
              <CardHeader>
                <CardTitle>التقييم حسب الفئة</CardTitle>
                <CardDescription>متوسط التقييم في كل فئة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <Chart>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={categoryData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" width={100} />
                          <Tooltip content={renderTooltip} />
                          <Bar
                            dataKey="score"
                            fill="#8884d8"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Chart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Teachers */}
          <Card>
            <CardHeader>
              <CardTitle>أفضل المعلمين أداءً</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>متوسط التقييم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTeachers.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>{t.department}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            t.score >= 90
                              ? "bg-green-500"
                              : t.score >= 80
                              ? "bg-blue-500"
                              : t.score >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }
                        >
                          {t.score}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments */}
        <TabsContent value="departments" className="space-y-6 pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dept Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>متوسط التقييم حسب القسم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <Chart>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={departmentData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip content={renderTooltip} />
                          <Bar
                            dataKey="value"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Chart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Dept Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>
                  توزيع التقييمات حسب القسم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ChartContainer>
                    <Chart>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={departmentData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {departmentData.map((_, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  [
                                    "#0088FE",
                                    "#00C49F",
                                    "#FFBB28",
                                    "#FF8042",
                                    "#8884D8",
                                  ][idx % 5]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={renderTooltip} />
                        </PieChart>
                      </ResponsiveContainer>
                      <ChartLegend>
                        <div className="flex flex-wrap justify-center gap-4">
                          {departmentData.map((d, idx) => (
                            <div
                              key={d.name}
                              className="flex items-center gap-1"
                            >
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    [
                                      "#0088FE",
                                      "#00C49F",
                                      "#FFBB28",
                                      "#FF8042",
                                      "#8884D8",
                                    ][idx % 5],
                                }}
                              />
                              <span className="text-xs">
                                {d.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ChartLegend>
                    </Chart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Dept Stats Table */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الأقسام</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead>عدد المعلمين</TableHead>
                    <TableHead>عدد التقييمات</TableHead>
                    <TableHead>متوسط التقييم</TableHead>
                    <TableHead>أعلى تقييم</TableHead>
                    <TableHead>أدنى تقييم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptStats.map(d => (
                    <TableRow key={d.department}>
                      <TableCell className="font-medium">
                        {d.department}
                      </TableCell>
                      <TableCell>{d.teacherCount}</TableCell>
                      <TableCell>{d.evalCount}</TableCell>
                      <TableCell>{d.avg}%</TableCell>
                      <TableCell>{d.max}%</TableCell>
                      <TableCell>{d.min}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers */}
        <TabsContent value="teachers" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>تقرير تفصيلي للمعلمين</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المادة</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>عدد التقييمات</TableHead>
                    <TableHead>متوسط التقييم</TableHead>
                    {Object.values(CATEGORIES)
                      .flat()
                      .map(cat => (
                        <TableHead key={cat.id}>{cat.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacherDetails.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.name}
                      </TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell>{t.department}</TableCell>
                      <TableCell>{t.evalCount}</TableCell>
                      <TableCell>{t.avg}%</TableCell>
                      {Object.values(CATEGORIES)
                        .flat()
                        .map(cat => (
                          <TableCell key={cat.id}>
                            {t[cat.id]}%
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}