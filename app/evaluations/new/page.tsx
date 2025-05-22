// app/evaluations/new/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Save } from "lucide-react"
import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"

type TabKey = "classroom" | "student" | "professional" | "summary"

interface CategoryState {
  score: number
  notes: string
}

interface FormData {
  classroom: Record<string, CategoryState>
  student: Record<string, CategoryState>
  professional: Record<string, CategoryState>
  finalNotes: string
}

export default function NewEvaluationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teacherId = searchParams.get("teacher") || ""

  // teacher info state
  const [teacherData, setTeacherData] = useState({
    name: "",
    subject: "",
    department: "",
  })
  const [loadingTeacher, setLoadingTeacher] = useState(true)

  // tabs & progress
  const [activeTab, setActiveTab] = useState<TabKey>("classroom")
  const [progress, setProgress] = useState(25)

  // categories (static)
  const categories: Record<
    Exclude<TabKey, "summary">,
    { id: string; label: string; description: string }[]
  > = {
    classroom: [
      {
        id: "preparation",
        label: "التحضير والتخطيط للدرس",
        description: "مدى استعداد المعلم وتخطيطه للدرس",
      },
      {
        id: "delivery",
        label: "أسلوب تقديم الدرس",
        description: "وضوح الشرح وتسلسل الأفكار",
      },
      {
        id: "engagement",
        label: "تفاعل الطلاب",
        description: "مدى مشاركة الطلاب وتفاعلهم مع الدرس",
      },
      {
        id: "time",
        label: "إدارة وقت الحصة",
        description: "الاستغلال الأمثل لوقت الحصة",
      },
    ],
    student: [
      {
        id: "understanding",
        label: "فهم المادة العلمية",
        description: "مدى فهم الطلاب للمادة المقدمة",
      },
      {
        id: "feedback",
        label: "التغذية الراجعة",
        description: "تقديم تغذية راجعة مناسبة للطلاب",
      },
      {
        id: "assessment",
        label: "أساليب التقييم",
        description: "تنوع أساليب تقييم الطلاب",
      },
    ],
    professional: [
      {
        id: "knowledge",
        label: "المعرفة بالمادة العلمية",
        description: "إلمام المعلم بالمادة التي يدرسها",
      },
      {
        id: "development",
        label: "التطوير المهني",
        description: "سعي المعلم للتطوير المهني المستمر",
      },
      {
        id: "collaboration",
        label: "التعاون مع الزملاء",
        description: "مستوى التعاون مع الزملاء والإدارة",
      },
    ],
  }

  // initialize form data
  const buildInitialForm = (): FormData => ({
    classroom: Object.fromEntries(
      categories.classroom.map((cat) => [cat.id, { score: 3, notes: "" }])
    ),
    student: Object.fromEntries(
      categories.student.map((cat) => [cat.id, { score: 3, notes: "" }])
    ),
    professional: Object.fromEntries(
      categories.professional.map((cat) => [cat.id, { score: 3, notes: "" }])
    ),
    finalNotes: "",
  })

  const [formData, setFormData] = useState<FormData>(buildInitialForm())

  // fetch teacher data or redirect if no ID
  useEffect(() => {
    if (!teacherId) {
      router.replace("/teachers")
      return
    }
    setLoadingTeacher(true)
    getDoc(doc(db, "teachers", teacherId))
      .then((snap) => {
        if (snap.exists()) {
          setTeacherData(snap.data() as any)
        } else {
          router.replace("/teachers")
        }
      })
      .finally(() => setLoadingTeacher(false))
  }, [teacherId, router])

  // tab change handler
  const handleTabChange = (value: string) => {
    const tab = value as TabKey
    setActiveTab(tab)
    setProgress(
      tab === "classroom"
        ? 25
        : tab === "student"
        ? 50
        : tab === "professional"
        ? 75
        : 100
    )
  }

  // score & notes handlers
  const handleScoreChange = (
    tab: Exclude<TabKey, "summary">,
    id: string,
    newScore: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [id]: { ...prev[tab][id], score: parseInt(newScore, 10) },
      },
    }))
  }

  const handleNotesChange = (
    tab: Exclude<TabKey, "summary">,
    id: string,
    notes: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [id]: { ...prev[tab][id], notes },
      },
    }))
  }

  const handleFinalNotesChange = (notes: string) => {
    setFormData((prev) => ({ ...prev, finalNotes: notes }))
  }

  // navigation buttons
  const handlePrevious = () => {
    handleTabChange(
      activeTab === "summary"
        ? "professional"
        : activeTab === "professional"
        ? "student"
        : "classroom"
    )
  }
  const handleNext = () => {
    handleTabChange(
      activeTab === "classroom"
        ? "student"
        : activeTab === "student"
        ? "professional"
        : "summary"
    )
  }

  // save to Firestore
  const handleSave = async () => {
    try {
      await addDoc(collection(db, "evaluations"), {
        teacherId,
        evaluation: formData,
        createdAt: serverTimestamp(),
      })
      alert("تم حفظ التقييم بنجاح!")
      router.push("/evaluations")
    } catch {
      alert("حدث خطأ أثناء حفظ التقييم.")
    }
  }

  if (loadingTeacher) {
    return <div>Loading teacher data…</div>
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">تقييم جديد</h1>
        <Button variant="outline" onClick={() => router.push("/teachers")}>
          إلغاء
        </Button>
      </div>

      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <CardTitle>تقييم المعلم: {teacherData.name}</CardTitle>
          <CardDescription>
            {teacherData.subject} – {teacherData.department}
          </CardDescription>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="classroom">ملاحظة الفصل</TabsTrigger>
              <TabsTrigger value="student">تقييم الطلاب</TabsTrigger>
              <TabsTrigger value="professional">الأداء المهني</TabsTrigger>
              <TabsTrigger value="summary">الملخص</TabsTrigger>
            </TabsList>

            {/* Classroom */}
            <TabsContent value="classroom" className="mt-6 space-y-8">
              {categories.classroom.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <RadioGroup
                    value={formData.classroom[cat.id].score.toString()}
                    onValueChange={(val) =>
                      handleScoreChange("classroom", cat.id, val)
                    }
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="flex flex-col items-center">
                          <RadioGroupItem
                            value={val.toString()}
                            id={`${cat.id}-${val}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`${cat.id}-${val}`}
                            className="flex h-16 w-full cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                          >
                            <span className="text-xl font-semibold">
                              {val}
                            </span>
                            <span className="text-xs">
                              {{
                                1: "ضعيف جداً",
                                2: "ضعيف",
                                3: "متوسط",
                                4: "جيد",
                                5: "ممتاز",
                              }[val]}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  <div>
                    <Label htmlFor={`${cat.id}-notes`}>ملاحظات</Label>
                    <Textarea
                      id={`${cat.id}-notes`}
                      value={formData.classroom[cat.id].notes}
                      onChange={(e) =>
                        handleNotesChange(
                          "classroom",
                          cat.id,
                          e.target.value
                        )
                      }
                      placeholder="أضف ملاحظاتك هنا..."
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Student */}
            <TabsContent value="student" className="mt-6 space-y-8">
              {categories.student.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <RadioGroup
                    value={formData.student[cat.id].score.toString()}
                    onValueChange={(val) =>
                      handleScoreChange("student", cat.id, val)
                    }
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="flex flex-col items-center">
                          <RadioGroupItem
                            value={val.toString()}
                            id={`${cat.id}-${val}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`${cat.id}-${val}`}
                            className="flex h-16 w-full cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                          >
                            <span className="text-xl font-semibold">
                              {val}
                            </span>
                            <span className="text-xs">
                              {{
                                1: "ضعيف جداً",
                                2: "ضعيف",
                                3: "متوسط",
                                4: "جيد",
                                5: "ممتاز",
                              }[val]}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  <div>
                    <Label htmlFor={`${cat.id}-notes`}>ملاحظات</Label>
                    <Textarea
                      id={`${cat.id}-notes`}
                      value={formData.student[cat.id].notes}
                      onChange={(e) =>
                        handleNotesChange("student", cat.id, e.target.value)
                      }
                      placeholder="أضف ملاحظاتك هنا..."
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Professional */}
            <TabsContent value="professional" className="mt-6 space-y-8">
              {categories.professional.map((cat) => (
                <div key={cat.id} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{cat.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <RadioGroup
                    value={formData.professional[cat.id].score.toString()}
                    onValueChange={(val) =>
                      handleScoreChange("professional", cat.id, val)
                    }
                  >
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <div key={val} className="flex flex-col items-center">
                          <RadioGroupItem
                            value={val.toString()}
                            id={`${cat.id}-${val}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`${cat.id}-${val}`}
                            className="flex h-16 w-full cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                          >
                            <span className="text-xl font-semibold">
                              {val}
                            </span>
                            <span className="text-xs">
                              {{
                                1: "ضعيف جداً",
                                2: "ضعيف",
                                3: "متوسط",
                                4: "جيد",
                                5: "ممتاز",
                              }[val]}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  <div>
                    <Label htmlFor={`${cat.id}-notes`}>ملاحظات</Label>
                    <Textarea
                      id={`${cat.id}-notes`}
                      value={formData.professional[cat.id].notes}
                      onChange={(e) =>
                        handleNotesChange("professional", cat.id, e.target.value)
                      }
                      placeholder="أضف ملاحظاتك هنا..."
                      className="mt-1"
                    />
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Summary */}
            <TabsContent value="summary" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="final-notes">ملاحظات ختامية</Label>
                <Textarea
                  id="final-notes"
                  value={formData.finalNotes}
                  onChange={(e) => handleFinalNotesChange(e.target.value)}
                  placeholder="أضف ملاحظاتك النهائية هنا..."
                  className="mt-1"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={activeTab === "classroom"}
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            السابق
          </Button>

          {activeTab === "summary" ? (
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              حفظ التقييم
            </Button>
          ) : (
            <Button onClick={handleNext}>
              التالي
              <ChevronLeft className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
