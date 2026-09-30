import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Web app config for Firebase project `apartment-site-dh`. These values are
// public identifiers, not secrets — access is enforced by firestore.rules and
// storage.rules. The deployed domain must be listed under Authentication ->
// Settings -> Authorized domains.
export const firebaseConfig = {
  apiKey: 'AIzaSyBD8s48E5R_iOV4DqfQbv4nwr0qaUBsEdo',
  authDomain: 'apartment-site-dh.firebaseapp.com',
  projectId: 'apartment-site-dh',
  storageBucket: 'apartment-site-dh.firebasestorage.app',
  messagingSenderId: '282981667768',
  appId: '1:282981667768:web:d54e1196ab0fc798b6f54d',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)

// `npm run dev` always talks to local emulators, never live data.
// `npm run build`/`preview` are unaffected (import.meta.env.DEV is false).
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectStorageEmulator(storage, '127.0.0.1', 9199)
  console.info('[firebase] dev mode: connected to local emulators, not live data')
}

// Creating a user with the client SDK signs that new user in on whichever
// Auth instance made the call. Admins create realtor accounts through this
// separate app instance so their own session on `auth` is left untouched.
const ACCOUNT_APP_NAME = 'account-creation'
export function getAccountCreationAuth() {
  const existing = getApps().find((a) => a.name === ACCOUNT_APP_NAME)
  if (existing) return getAuth(existing)
  const accountAuth = getAuth(initializeApp(firebaseConfig, ACCOUNT_APP_NAME))
  if (import.meta.env.DEV) {
    connectAuthEmulator(accountAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
  }
  return accountAuth
}
