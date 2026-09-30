import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

let testEnv

const ADMIN_UID = 'adminUid'
const REALTOR_UID = 'realtorUid'
const OTHER_UID = 'otherUid'
const NO_ROLE_UID = 'noRoleUid'
const REVOKED_UID = 'revokedUid'

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'apartment-site-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(async () => {
  await testEnv.cleanup()
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'admins', ADMIN_UID), {})
    await setDoc(doc(db, 'realtors', REALTOR_UID), { email: 'r@example.com' })
    await setDoc(doc(db, 'realtors', REVOKED_UID), { email: 'gone@example.com', active: false })
    await setDoc(doc(db, 'accessRequests', 'pending@example.com'), { name: 'Pending', email: 'pending@example.com' })
    await setDoc(doc(db, 'content', 'site'), { heroTitle: 'Welcome' })
    await setDoc(doc(db, 'gallery', 'photo1'), { storagePath: 'gallery/1.jpg', order: 1 })
    await setDoc(doc(db, 'documents', 'realtorDoc'), {
      title: 'Pricing', category: 'pricing', visibility: 'realtor',
    })
    await setDoc(doc(db, 'documents', 'adminDoc'), {
      title: 'Internal', category: 'lease', visibility: 'admin',
    })
  })
})

function ctxDb(uid) {
  return uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore()
}

describe('content/site', () => {
  it('anyone can read', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(null), 'content', 'site')))
  })
  it('admin can write', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(ADMIN_UID), 'content', 'site'), { heroTitle: 'New' }))
  })
  it('realtor cannot write', async () => {
    await assertFails(setDoc(doc(ctxDb(REALTOR_UID), 'content', 'site'), { heroTitle: 'New' }))
  })
  it('anonymous cannot write', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'content', 'site'), { heroTitle: 'New' }))
  })
})

describe('gallery', () => {
  it('anyone can read', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(null), 'gallery', 'photo1')))
  })
  it('admin can write', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(ADMIN_UID), 'gallery', 'photo2'), { storagePath: 'gallery/2.jpg', order: 2 }))
  })
  it('realtor cannot write', async () => {
    await assertFails(setDoc(doc(ctxDb(REALTOR_UID), 'gallery', 'photo2'), { storagePath: 'gallery/2.jpg', order: 2 }))
  })
})

describe('documents', () => {
  it('admin can read a realtor-visibility doc', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(ADMIN_UID), 'documents', 'realtorDoc')))
  })
  it('admin can read an admin-visibility doc', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(ADMIN_UID), 'documents', 'adminDoc')))
  })
  it('realtor can read a realtor-visibility doc', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(REALTOR_UID), 'documents', 'realtorDoc')))
  })
  it('realtor cannot read an admin-visibility doc', async () => {
    await assertFails(getDoc(doc(ctxDb(REALTOR_UID), 'documents', 'adminDoc')))
  })
  it('anonymous cannot read any document', async () => {
    await assertFails(getDoc(doc(ctxDb(null), 'documents', 'realtorDoc')))
  })
  it('realtor cannot write a document', async () => {
    await assertFails(setDoc(doc(ctxDb(REALTOR_UID), 'documents', 'realtorDoc'), { title: 'x' }))
  })
  it('admin can write a document', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(ADMIN_UID), 'documents', 'newDoc'), {
      title: 'New', category: 'lease', visibility: 'admin',
    }))
  })
  it('realtor can run the scoped realtor-visibility query', async () => {
    await assertSucceeds(getDocs(query(
      collection(ctxDb(REALTOR_UID), 'documents'), where('visibility', '==', 'realtor'))))
  })
  it('realtor cannot list documents unscoped', async () => {
    await assertFails(getDocs(collection(ctxDb(REALTOR_UID), 'documents')))
  })
  it('realtor cannot run the admin-visibility query', async () => {
    await assertFails(getDocs(query(
      collection(ctxDb(REALTOR_UID), 'documents'), where('visibility', '==', 'admin'))))
  })
  it('admin can list documents unscoped', async () => {
    await assertSucceeds(getDocs(collection(ctxDb(ADMIN_UID), 'documents')))
  })
  it('a user with no marker doc cannot read any document', async () => {
    await assertFails(getDoc(doc(ctxDb(NO_ROLE_UID), 'documents', 'realtorDoc')))
  })
  it('a user with no marker doc cannot read another user\'s realtor doc', async () => {
    await assertFails(getDoc(doc(ctxDb(NO_ROLE_UID), 'realtors', REALTOR_UID)))
  })
})

describe('admins collection', () => {
  it('any authenticated user can read', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(REALTOR_UID), 'admins', ADMIN_UID)))
  })
  it('anonymous cannot read', async () => {
    await assertFails(getDoc(doc(ctxDb(null), 'admins', ADMIN_UID)))
  })
  it('non-admin cannot write', async () => {
    await assertFails(setDoc(doc(ctxDb(REALTOR_UID), 'admins', 'newAdmin'), {}))
  })
  it('admin can write', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(ADMIN_UID), 'admins', 'newAdmin'), {}))
  })
})

describe('realtors collection', () => {
  it('a realtor can read their own doc', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(REALTOR_UID), 'realtors', REALTOR_UID)))
  })
  it('admin can read any realtor doc', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(ADMIN_UID), 'realtors', REALTOR_UID)))
  })
  it('a realtor cannot read another realtor doc', async () => {
    await assertFails(getDoc(doc(ctxDb(OTHER_UID), 'realtors', REALTOR_UID)))
  })
  it('non-admin cannot write a realtor doc', async () => {
    await assertFails(setDoc(doc(ctxDb(REALTOR_UID), 'realtors', 'newRealtor'), {}))
  })
  it('admin can write', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(ADMIN_UID), 'realtors', 'newRealtor'), { email: 'new@example.com' }))
  })
})

describe('revoked realtors', () => {
  it('cannot read a realtor-visibility document', async () => {
    await assertFails(getDoc(doc(ctxDb(REVOKED_UID), 'documents', 'realtorDoc')))
  })
  it('cannot run the scoped realtor-visibility query', async () => {
    await assertFails(getDocs(query(
      collection(ctxDb(REVOKED_UID), 'documents'), where('visibility', '==', 'realtor'))))
  })
  it('can still read their own realtor doc (so the app can explain why)', async () => {
    await assertSucceeds(getDoc(doc(ctxDb(REVOKED_UID), 'realtors', REVOKED_UID)))
  })
})

describe('accessRequests', () => {
  const EMAIL = 'jane@example.com'
  const valid = () => ({ name: 'Jane Doe', email: EMAIL, requestedAt: serverTimestamp() })

  it('anonymous can create a valid request keyed by its email', async () => {
    await assertSucceeds(setDoc(doc(ctxDb(null), 'accessRequests', EMAIL), valid()))
  })
  it('rejects a request whose id is not its email', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', 'other@example.com'), valid()))
  })
  it('rejects an uppercase email', async () => {
    const email = 'Jane@Example.com'
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', email), { ...valid(), email }))
  })
  it('rejects extra fields', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', EMAIL), { ...valid(), role: 'admin' }))
  })
  it('rejects an empty or overlong name', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', EMAIL), { ...valid(), name: '' }))
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', EMAIL), { ...valid(), name: 'x'.repeat(101) }))
  })
  it('rejects a malformed email', async () => {
    const email = 'not-an-email'
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', email), { ...valid(), email }))
  })
  it('rejects a client-chosen timestamp', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', EMAIL), { ...valid(), requestedAt: new Date(0) }))
  })
  it('cannot overwrite an existing request', async () => {
    await assertFails(setDoc(doc(ctxDb(null), 'accessRequests', 'pending@example.com'),
      { name: 'Someone else', email: 'pending@example.com', requestedAt: serverTimestamp() }))
  })
  it('anonymous and realtors cannot read or list requests', async () => {
    await assertFails(getDoc(doc(ctxDb(null), 'accessRequests', 'pending@example.com')))
    await assertFails(getDocs(collection(ctxDb(REALTOR_UID), 'accessRequests')))
  })
  it('admin can list and delete requests', async () => {
    await assertSucceeds(getDocs(collection(ctxDb(ADMIN_UID), 'accessRequests')))
    await assertSucceeds(deleteDoc(doc(ctxDb(ADMIN_UID), 'accessRequests', 'pending@example.com')))
  })
  it('a realtor cannot delete requests', async () => {
    await assertFails(deleteDoc(doc(ctxDb(REALTOR_UID), 'accessRequests', 'pending@example.com')))
  })
})
