// Usage: node scripts/create-realtor.mjs <email> [displayName]
//
// Requires scripts/serviceAccountKey.json (Firebase Console -> Project
// Settings -> Service Accounts -> Generate new private key). Never commit
// this file — it is gitignored.
//
// To run against the local emulators instead of a real project, set:
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
// before running this script.
import { readFileSync } from 'node:fs'
import { initializeApp, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const [, , email, displayName] = process.argv
if (!email) {
  console.error('Usage: node scripts/create-realtor.mjs <email> [displayName]')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(new URL('./serviceAccountKey.json', import.meta.url)))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const db = getFirestore()

const userRecord = await auth.createUser({ email, displayName: displayName ?? email })

await db.collection('realtors').doc(userRecord.uid).set({
  email,
  name: displayName ?? email,
  addedAt: new Date().toISOString(),
})

const resetLink = await auth.generatePasswordResetLink(email)

console.log(`Created realtor account for ${email} (uid: ${userRecord.uid})`)
console.log(`Send this password-reset link to the realtor: ${resetLink}`)
