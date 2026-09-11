import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Placeholder config for local development against emulators only. Before
// deploying to production, replace this with the real web app config from
// Firebase Console -> Project Settings -> General -> Your apps, and add the
// deployed domain under Authentication -> Settings -> Authorized domains.
const firebaseConfig = {
  apiKey: 'placeholder-api-key',
  authDomain: 'apartment-site.firebaseapp.com',
  projectId: 'apartment-site',
  storageBucket: 'apartment-site.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
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
