// scripts/uploadTeachers.js
import admin from "firebase-admin"
import path from "path"
import { fileURLToPath } from "url"
import { readFileSync } from "fs"

// build __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1) Initialize Admin SDK
const serviceAccount = JSON.parse(
  readFileSync(
    path.resolve(
      __dirname,
      "rowaad-evaluation-firebase-adminsdk-fbsvc-bbc25039c3.json"
    ),
    "utf8"
  )
)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

// 2) Load the JSON array
const teachers = JSON.parse(
  readFileSync(path.resolve(__dirname, "teachers.json"), "utf8")
)

async function runImport() {
  console.log(`Uploading ${teachers.length} teachers…`)
  let batch = db.batch()
  let count = 0

  for (const t of teachers) {
    const ref = db.collection("teachers").doc()
    const joinTs = admin.firestore.Timestamp.fromDate(new Date(t.joinDate))
    const birthTs = admin.firestore.Timestamp.fromDate(
      new Date(t.birthDate)
    )

    batch.set(ref, {
      name:       t.name,
      department: t.department,
      subject:    t.subject,
      email:      t.email,
      phone:      t.phone,
      joinDate:   joinTs,
      birthDate:  birthTs,
      experience: t.experience,
      education:  t.education,
      bio:        t.bio,
    })

    count++
    if (count % 500 === 0) {
      console.log(`Committing batch of 500…`)
      await batch.commit()
      batch = db.batch()
    }
  }

  if (count % 500 !== 0) {
    console.log(`Committing final batch of ${count % 500}…`)
    await batch.commit()
  }

  console.log(`✅ Done! Imported ${count} teachers.`)
  process.exit(0)
}

runImport().catch((err) => {
  console.error("Upload failed:", err)
  process.exit(1)
})
