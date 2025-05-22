// app/api/createTeacher/route.ts
import { NextRequest, NextResponse } from "next/server"
import admin from "firebase-admin"
import { authAdmin, dbAdmin, verifyIdToken } from "@/lib/firebaseAdmin"

export async function POST(req: NextRequest) {
  // 1) Extract & verify the Bearer token
  const authHeader = req.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  const idToken = authHeader.split(" ")[1]

  let callerUid: string
  try {
    callerUid = (await verifyIdToken(idToken)).uid
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // 2) Ensure caller is a supervisor
  const callerDoc = await dbAdmin.collection("users").doc(callerUid).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== "supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 3) Parse incoming data
  const {
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
  } = await req.json()

  try {
    // a) Create the Auth user
    const teacherUser = await authAdmin.createUser({
      email,
      password: `Arwd${birthDate.split("-").reverse().join("")}`,
    })
    const tid = teacherUser.uid

    // b) Write Firestore documents
    await dbAdmin.collection("users").doc(tid).set({
      role: "teacher",
      email,
    })
    await dbAdmin.collection("teachers").doc(tid).set({
      uid: tid,
      name,
      birthDate: admin.firestore.Timestamp.fromDate(new Date(birthDate)),
      subject,
      department,
      email,
      phone,
      joinDate: admin.firestore.Timestamp.fromDate(new Date(joinDate)),
      experience,
      education,
      bio,
    })

    return NextResponse.json({ success: true, uid: tid })
  } catch (e: any) {
    console.error("Error in createTeacher:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
