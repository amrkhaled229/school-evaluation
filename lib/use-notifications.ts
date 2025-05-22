// lib/use-notifications.ts
"use client"

import { useEffect, useRef, useState } from "react"
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/hooks/use-toast"          // ← shad-cn toast you already have

type Notification = {
  id: string
  title: string
  time: Date
  read: boolean
}

export function useNotifications() {
  const [list, setList] = useState<Notification[]>([])
  const listRef = useRef<Notification[]>([])      // mutable ref to avoid stale state

  /* helper to push & toast */
  const push = (title: string) => {
    const n: Notification = {
      id: Date.now().toString(),
      title,
      time: new Date(),
      read: false,
    }
    listRef.current = [n, ...listRef.current].slice(0, 50) // keep last 50
    setList([...listRef.current])

    toast({
      title,
      description: n.time.toLocaleTimeString("ar-EG"),
    })
  }

  /* start listeners only once */
  useEffect(() => {
    // ─── teachers listener ──────────────────────────────────────────
    const unsubTeachers = onSnapshot(collection(db, "teachers"), snap =>
      handleChanges(snap, "teachers"),
    )

    // ─── evaluations listener ───────────────────────────────────────
    const unsubEvals = onSnapshot(collection(db, "evaluations"), snap =>
      handleChanges(snap, "evaluations"),
    )

    return () => {
      unsubTeachers()
      unsubEvals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* interpret document changes */
  function handleChanges(
    snap: QuerySnapshot<DocumentData>,
    col: "teachers" | "evaluations",
  ) {
    snap.docChanges().forEach(change => {
      const d = change.doc.data()
      if (col === "teachers") {
        if (change.type === "added")
          push(`تم إضافة معلم جديد: ${d.name || "غير مُسمّى"}`)
        else if (change.type === "modified")
          push(`تم تحديث بيانات المعلم: ${d.name || "غير مُسمّى"}`)
        else if (change.type === "removed")
          push(`تم حذف معلم: ${d.name || "غير مُسمّى"}`)
      } else if (col === "evaluations" && change.type === "added") {
        push("تم إضافة تقييم جديد")
      }
    })
  }

  /* api for consumer */
  const unread = list.filter(n => !n.read).length
  const markAllRead = () =>
    setList(prev => prev.map(n => ({ ...n, read: true })))

  return { notifications: list, unread, markAllRead }
}
