import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getBytes } from 'firebase/storage'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

let testEnv

const ADMIN_UID = 'adminUid'
const REALTOR_UID = 'realtorUid'
const FILE_BYTES = new Uint8Array([1, 2, 3])

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'apartment-site',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync('storage.rules', 'utf8'),
      host: '127.0.0.1',
      port: 9199,
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
  })
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const storage = ctx.storage()
    await uploadBytes(ref(storage, 'gallery/seed.jpg'), FILE_BYTES)
    await uploadBytes(ref(storage, 'documents/realtor/seed.pdf'), FILE_BYTES)
    await uploadBytes(ref(storage, 'documents/admin/seed.pdf'), FILE_BYTES)
  })
})

function ctxStorage(uid) {
  return uid ? testEnv.authenticatedContext(uid).storage() : testEnv.unauthenticatedContext().storage()
}

describe('gallery storage', () => {
  it('anyone can read', async () => {
    await assertSucceeds(getBytes(ref(ctxStorage(null), 'gallery/seed.jpg')))
  })
  it('admin can write', async () => {
    await assertSucceeds(uploadBytes(ref(ctxStorage(ADMIN_UID), 'gallery/new.jpg'), FILE_BYTES))
  })
  it('realtor cannot write', async () => {
    await assertFails(uploadBytes(ref(ctxStorage(REALTOR_UID), 'gallery/new.jpg'), FILE_BYTES))
  })
})

describe('documents/realtor storage', () => {
  it('realtor can read', async () => {
    await assertSucceeds(getBytes(ref(ctxStorage(REALTOR_UID), 'documents/realtor/seed.pdf')))
  })
  it('admin can read', async () => {
    await assertSucceeds(getBytes(ref(ctxStorage(ADMIN_UID), 'documents/realtor/seed.pdf')))
  })
  it('anonymous cannot read', async () => {
    await assertFails(getBytes(ref(ctxStorage(null), 'documents/realtor/seed.pdf')))
  })
  it('realtor cannot write', async () => {
    await assertFails(uploadBytes(ref(ctxStorage(REALTOR_UID), 'documents/realtor/new.pdf'), FILE_BYTES))
  })
  it('admin can write', async () => {
    await assertSucceeds(uploadBytes(ref(ctxStorage(ADMIN_UID), 'documents/realtor/new.pdf'), FILE_BYTES))
  })
})

describe('documents/admin storage', () => {
  it('admin can read', async () => {
    await assertSucceeds(getBytes(ref(ctxStorage(ADMIN_UID), 'documents/admin/seed.pdf')))
  })
  it('realtor cannot read', async () => {
    await assertFails(getBytes(ref(ctxStorage(REALTOR_UID), 'documents/admin/seed.pdf')))
  })
  it('anonymous cannot read', async () => {
    await assertFails(getBytes(ref(ctxStorage(null), 'documents/admin/seed.pdf')))
  })
  it('admin can write', async () => {
    await assertSucceeds(uploadBytes(ref(ctxStorage(ADMIN_UID), 'documents/admin/new.pdf'), FILE_BYTES))
  })
  it('realtor cannot write', async () => {
    await assertFails(uploadBytes(ref(ctxStorage(REALTOR_UID), 'documents/admin/new.pdf'), FILE_BYTES))
  })
})
