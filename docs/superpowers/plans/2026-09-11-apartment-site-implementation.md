# Apartment Complex Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-property apartment complex website with three access tiers (public, realtor, admin) using Vue 3 + Vite + Firebase, deployable to GitHub Pages.

**Architecture:** A Vue 3 SPA with state-based navigation (no router, matching the SVS-Clinics precedent) backed by Firebase Auth (realtor/admin login), Firestore (site content, gallery metadata, document metadata, role markers), and Firebase Storage (photo and document files). Firestore/Storage security rules enforce the three-tier access model server-side; the client never trusts its own role check for anything sensitive.

**Tech Stack:** Vue 3, Vite, Firebase (Auth, Firestore, Storage), Vitest, `@firebase/rules-unit-testing`, firebase-admin (provisioning script only), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-11-apartment-site-design.md`

## Global Constraints

- Single property only — no multi-tenancy in the data model.
- No Cloud Functions or server backend of any kind — everything runs from the static built SPA plus Firebase client SDKs, except the realtor-provisioning script, which runs locally with firebase-admin.
- No self-registration for realtors or admins. Realtor accounts are created only via `scripts/create-realtor.mjs`. The first admin is created manually in the Firebase Console.
- Public content editing is structured fields only — no free-form rich text/WYSIWYG.
- No public contact/inquiry form (out of scope for v1).
- State-based navigation (a `currentPage` ref in `App.vue`), no Vue Router — matches the SVS-Clinics precedent this project reuses.
- Deploy target is GitHub Pages via GitHub Actions; the build output is a portable static bundle so moving to Cloudflare Pages later requires no app changes.
- Local development and all automated tests run against Firebase emulators only — never live data.
- Logic worth unit-testing is extracted into small pure functions (mirroring SVS-Clinics's `riderKey` pattern); Firestore/Storage calls otherwise live inline in component `<script setup>` blocks, not behind a data-access abstraction layer.

---

## File Structure

```
Apartment/
├── package.json
├── vite.config.js
├── vitest.config.js
├── vitest.rules.config.js
├── firebase.json
├── .firebaserc
├── .gitignore
├── index.html
├── firestore.rules
├── storage.rules
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── firebase.js
│   ├── auth.js                  # resolveRole() — pure, unit tested
│   ├── documentAccess.js        # filter helpers — pure, unit tested
│   └── components/
│       ├── HomePage.vue
│       ├── GalleryInfoPage.vue
│       ├── LoginForm.vue
│       ├── DocumentList.vue
│       ├── RealtorLibraryPage.vue
│       ├── AdminLibraryPage.vue
│       ├── ContentEditorPage.vue
│       └── DocumentManagerPage.vue
├── scripts/
│   └── create-realtor.mjs
├── tests/
│   ├── auth.test.js
│   ├── documentAccess.test.js
│   └── rules/
│       ├── firestore.test.js
│       └── storage.test.js
├── public/
│   └── 404.html
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
└── DEPLOY.md
```

---

### Task 1: Project Scaffold & Firebase Client

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `vitest.rules.config.js`
- Create: `.gitignore`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/firebase.js`
- Create: `src/App.vue` (placeholder, replaced fully in Task 4)
- Create: `firebase.json`
- Create: `.firebaserc`

**Interfaces:**
- Produces: `db`, `auth`, `storage` exports from `src/firebase.js`, used by every later task that touches Firebase.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "apartment-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "emulators": "firebase emulators:start --only firestore,auth,storage --project apartment-site --import=./.emulator-data --export-on-exit=./.emulator-data",
    "test": "vitest run",
    "test:rules": "firebase emulators:exec --only firestore,storage --project apartment-site \"vitest run --config vitest.rules.config.js\""
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^3.0.4",
    "@vitejs/plugin-vue": "^6.0.8",
    "firebase-admin": "^13.8.0",
    "firebase-tools": "^13.35.1",
    "vite": "^6.4.3",
    "vitest": "^3.2.7"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base must match the GitHub Pages repo name exactly, e.g. '/Apartment/'.
// Update this once the GitHub repo name is finalized (see Task 11 / DEPLOY.md).
export default defineConfig({
  plugins: [vue()],
  base: '/Apartment/',
})
```

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig, configDefaults } from 'vitest/config'

// Default test run = unit tests only. The emulator-backed rules tests run via
// `npm run test:rules` (which boots the Firestore/Storage emulators first).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
})
```

- [ ] **Step 4: Create `vitest.rules.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.js'],
  },
})
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/

# Local Firestore/Auth/Storage emulator data — never commit
.emulator-data/
firestore-debug.log
ui-debug.log
storage-debug.log

# Firebase Admin service-account key — never commit
serviceAccountKey.json
scripts/serviceAccountKey.json
```

- [ ] **Step 6: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Apartment Complex</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `src/main.js`**

```js
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 8: Create `src/firebase.js`**

```js
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
```

- [ ] **Step 9: Create placeholder `src/App.vue`**

```vue
<template>
  <div>Apartment site scaffold OK</div>
</template>

<script setup>
</script>
```

- [ ] **Step 10: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "auth": {
      "port": 9099
    },
    "storage": {
      "port": 9199
    },
    "singleProjectMode": true
  }
}
```

Note: `firestore.rules` and `storage.rules` don't exist until Tasks 2 and 3 — that's fine, `firebase.json` just points to where they'll be.

- [ ] **Step 11: Create `.firebaserc`**

```json
{
  "projects": {
    "default": "apartment-site"
  }
}
```

- [ ] **Step 12: Verify the scaffold**

```bash
npm install
npm run dev
```

Open the printed local URL in a browser. Expected: page shows "Apartment site scaffold OK", no console errors. Stop the dev server (Ctrl+C).

- [ ] **Step 13: Commit**

```bash
git add package.json vite.config.js vitest.config.js vitest.rules.config.js .gitignore index.html src/main.js src/firebase.js src/App.vue firebase.json .firebaserc
git commit -m "Scaffold Vue/Vite/Firebase project"
```

---

### Task 2: Firestore Security Rules

**Files:**
- Create: `firestore.rules`
- Create: `tests/rules/firestore.test.js`

**Interfaces:**
- Consumes: none (rules are the first thing tested against the emulator).
- Produces: the `admins/{uid}` / `realtors/{uid}` marker-doc pattern that `src/auth.js` (Task 4) and every component's Firestore reads rely on.

- [ ] **Step 1: Create a deny-all `firestore.rules` stub**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Write the failing rules tests** — `tests/rules/firestore.test.js`

```js
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

let testEnv

const ADMIN_UID = 'adminUid'
const REALTOR_UID = 'realtorUid'
const OTHER_UID = 'otherUid'

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
})
```

- [ ] **Step 3: Run the tests to verify they fail against the deny-all stub**

Run: `npm run test:rules`
Expected: every `assertSucceeds` case FAILs (deny-all rules reject everything), confirming the tests actually exercise the rules file.

- [ ] **Step 4: Implement the real rules** — replace `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isRealtor() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/realtors/$(request.auth.uid));
    }

    // Public site content: readable by anyone, editable only by admin.
    match /content/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Public photo gallery metadata: same pattern as content.
    match /gallery/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Library documents: admin sees everything; a realtor sees only docs
    // marked visibility=='realtor'. Writes (including creating an
    // admin-visibility doc) are admin-only.
    match /documents/{docId} {
      allow read: if isAdmin() || (isRealtor() && resource.data.visibility == 'realtor');
      allow write: if isAdmin();
    }

    // Admins: readable by any signed-in user (needed for isAdmin()-style
    // checks client-side). Writes are admin-only — the FIRST admin doc must
    // be created in the Firebase Console, which bypasses rules.
    match /admins/{uid} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // Realtors: a realtor can read their own marker doc (to resolve their
    // own role); admin can read/write any. No self-write — accounts are
    // provisioned only via scripts/create-realtor.mjs.
    match /realtors/{uid} {
      allow read: if isAdmin() || (request.auth != null && request.auth.uid == uid);
      allow write: if isAdmin();
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS, all cases green.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules tests/rules/firestore.test.js
git commit -m "Add Firestore security rules with role-based document access"
```

---

### Task 3: Storage Security Rules

**Files:**
- Create: `storage.rules`
- Create: `tests/rules/storage.test.js`

**Interfaces:**
- Consumes: `admins/{uid}` / `realtors/{uid}` marker docs from Task 2 (Storage rules call into Firestore to check them).
- Produces: the `/gallery/*`, `/documents/realtor/*`, `/documents/admin/*` path layout that `ContentEditorPage.vue` (Task 8) and `DocumentManagerPage.vue` (Task 9) upload into.

- [ ] **Step 1: Create a deny-all `storage.rules` stub**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Write the failing rules tests** — `tests/rules/storage.test.js`

```js
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
    projectId: 'apartment-site-storage-rules-test',
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
})
```

- [ ] **Step 3: Run the tests to verify they fail against the deny-all stub**

Run: `npm run test:rules`
Expected: every `assertSucceeds` case FAILs.

- [ ] **Step 4: Implement the real rules** — replace `storage.rules`

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function isAdmin() {
      return request.auth != null &&
        firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }

    function isRealtor() {
      return request.auth != null &&
        firestore.exists(/databases/(default)/documents/realtors/$(request.auth.uid));
    }

    match /gallery/{fileName} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /documents/realtor/{fileName} {
      allow read: if isAdmin() || isRealtor();
      allow write: if isAdmin();
    }

    match /documents/admin/{fileName} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS, all cases green (both `tests/rules/firestore.test.js` and `tests/rules/storage.test.js` run in this command).

- [ ] **Step 6: Commit**

```bash
git add storage.rules tests/rules/storage.test.js
git commit -m "Add Storage security rules gated on Firestore role docs"
```

---

### Task 4: Role Resolution, App Shell, and Login

**Files:**
- Create: `src/auth.js`
- Create: `tests/auth.test.js`
- Create: `src/components/LoginForm.vue`
- Create (stub, replaced in Task 5/6): `src/components/HomePage.vue`
- Create (stub, replaced in Task 5/6): `src/components/GalleryInfoPage.vue`
- Modify: `src/App.vue` (replace placeholder from Task 1 entirely)

**Interfaces:**
- Produces: `resolveRole(hasAdminDoc, hasRealtorDoc)` from `src/auth.js`, returning `'admin' | 'realtor' | null` — used only here in this task, but the `role` ref it powers is read by every later page-visibility check in `App.vue`.
- Produces: `App.vue`'s `currentPage` ref values used by later tasks: `'home'`, `'gallery'`, `'login'`, `'realtor-library'`, `'admin-library'`, `'content-editor'`, `'document-manager'`.

- [ ] **Step 1: Write the failing test** — `tests/auth.test.js`

```js
import { describe, it, expect } from 'vitest'
import { resolveRole } from '../src/auth.js'

describe('resolveRole', () => {
  it('returns admin when an admin doc exists, regardless of realtor doc', () => {
    expect(resolveRole(true, true)).toBe('admin')
    expect(resolveRole(true, false)).toBe('admin')
  })
  it('returns realtor when only a realtor doc exists', () => {
    expect(resolveRole(false, true)).toBe('realtor')
  })
  it('returns null when neither doc exists', () => {
    expect(resolveRole(false, false)).toBe(null)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth.test.js`
Expected: FAIL with "Failed to resolve import '../src/auth.js'" or similar.

- [ ] **Step 3: Implement** — `src/auth.js`

```js
export function resolveRole(hasAdminDoc, hasRealtorDoc) {
  if (hasAdminDoc) return 'admin'
  if (hasRealtorDoc) return 'realtor'
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/auth.test.js`
Expected: PASS.

- [ ] **Step 5: Create `src/components/LoginForm.vue`**

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <label>
      Email
      <input v-model="email" type="email" required />
    </label>
    <label>
      Password
      <input v-model="password" type="password" required />
    </label>
    <button type="submit" :disabled="submitting">Log in</button>
    <p v-if="error">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase.js'

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
  } catch (err) {
    error.value = 'Invalid email or password.'
  } finally {
    submitting.value = false
  }
}
</script>
```

- [ ] **Step 6: Create stub `src/components/HomePage.vue`**

```vue
<template>
  <p>Home page placeholder.</p>
</template>

<script setup>
</script>
```

- [ ] **Step 7: Create stub `src/components/GalleryInfoPage.vue`**

```vue
<template>
  <p>Gallery & info page placeholder.</p>
</template>

<script setup>
</script>
```

- [ ] **Step 8: Replace `src/App.vue`**

```vue
<template>
  <header>
    <nav>
      <a href="#" @click.prevent="currentPage = 'home'" :class="{ active: currentPage === 'home' }">Home</a>
      <a href="#" @click.prevent="currentPage = 'gallery'" :class="{ active: currentPage === 'gallery' }">Gallery &amp; Info</a>
      <a v-if="role === 'realtor' || role === 'admin'" href="#" @click.prevent="currentPage = 'realtor-library'" :class="{ active: currentPage === 'realtor-library' }">Document Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'admin-library'" :class="{ active: currentPage === 'admin-library' }">Admin Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'content-editor'" :class="{ active: currentPage === 'content-editor' }">Edit Content</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'document-manager'" :class="{ active: currentPage === 'document-manager' }">Manage Documents</a>
      <a v-if="!user" href="#" @click.prevent="currentPage = 'login'" :class="{ active: currentPage === 'login' }">Login</a>
      <a v-if="user" href="#" @click.prevent="handleLogout">Logout</a>
    </nav>
  </header>

  <main>
    <HomePage v-if="currentPage === 'home'" />
    <GalleryInfoPage v-else-if="currentPage === 'gallery'" />
    <LoginForm v-else-if="currentPage === 'login'" />
    <p v-else>Coming soon.</p>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { resolveRole } from './auth.js'
import HomePage from './components/HomePage.vue'
import GalleryInfoPage from './components/GalleryInfoPage.vue'
import LoginForm from './components/LoginForm.vue'

const currentPage = ref('home')
const user = ref(null)
const role = ref(null)

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (!firebaseUser) {
      role.value = null
      return
    }
    const [adminSnap, realtorSnap] = await Promise.all([
      getDoc(doc(db, 'admins', firebaseUser.uid)),
      getDoc(doc(db, 'realtors', firebaseUser.uid)),
    ])
    role.value = resolveRole(adminSnap.exists(), realtorSnap.exists())
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Once login resolves a role, leave the login page automatically.
watch(role, (newRole) => {
  if (currentPage.value === 'login' && newRole) {
    currentPage.value = newRole === 'admin' ? 'admin-library' : 'realtor-library'
  }
})

async function handleLogout() {
  await signOut(auth)
  currentPage.value = 'home'
}
</script>
```

- [ ] **Step 9: Manual verification**

```bash
npm run emulators
```

In another terminal: `npm run dev`, open the app.

1. Open the Emulator UI at `http://127.0.0.1:4000`.
2. Under Authentication, add a user (email/password) and note its UID.
3. Under Firestore, create a document at `admins/<that UID>` with no fields.
4. In the app, click Login, sign in with that email/password.
5. Expected: nav bar now shows Document Library, Admin Library, Edit Content, Manage Documents, and Logout; you're redirected off the login page.

- [ ] **Step 10: Commit**

```bash
git add src/auth.js tests/auth.test.js src/App.vue src/components/LoginForm.vue src/components/HomePage.vue src/components/GalleryInfoPage.vue
git commit -m "Add role resolution, app shell, and login"
```

---

### Task 5: Public Home Page

**Files:**
- Modify: `src/components/HomePage.vue` (replace stub from Task 4)

**Interfaces:**
- Consumes: `db` from `src/firebase.js`; reads the `content/site` doc shape defined in the spec (`heroTitle`, `heroSubtitle`, `description`).

- [ ] **Step 1: Replace `src/components/HomePage.vue`**

```vue
<template>
  <section v-if="content">
    <h1>{{ content.heroTitle }}</h1>
    <p class="subtitle">{{ content.heroSubtitle }}</p>
    <p>{{ content.description }}</p>
  </section>
  <p v-else>Loading...</p>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const content = ref(null)

onMounted(async () => {
  const snap = await getDoc(doc(db, 'content', 'site'))
  content.value = snap.exists() ? snap.data() : {}
})
</script>
```

- [ ] **Step 2: Manual verification**

With emulators running (`npm run emulators`) and a `content/site` doc seeded via the Emulator UI (fields: `heroTitle`, `heroSubtitle`, `description`), run `npm run dev`, load the Home page, and confirm the fields render.

- [ ] **Step 3: Commit**

```bash
git add src/components/HomePage.vue
git commit -m "Implement public home page from content/site"
```

---

### Task 6: Public Gallery & Info Page

**Files:**
- Modify: `src/components/GalleryInfoPage.vue` (replace stub from Task 4)

**Interfaces:**
- Consumes: `db`, `storage` from `src/firebase.js`; the `gallery/{docId}` shape (`storagePath`, `caption`, `order`) and `content/site`'s `amenities`, `description`, `contactInfo` fields.

- [ ] **Step 1: Replace `src/components/GalleryInfoPage.vue`**

```vue
<template>
  <section>
    <h2>Gallery</h2>
    <div class="gallery-grid">
      <img v-for="photo in photos" :key="photo.id" :src="photo.url" :alt="photo.caption" />
    </div>

    <h2>About This Property</h2>
    <p>{{ content?.description }}</p>

    <h3>Amenities</h3>
    <ul>
      <li v-for="amenity in content?.amenities ?? []" :key="amenity">{{ amenity }}</li>
    </ul>

    <h3>Contact</h3>
    <p v-if="content?.contactInfo">
      {{ content.contactInfo.phone }} · {{ content.contactInfo.email }} · {{ content.contactInfo.address }}
    </p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase.js'

const content = ref(null)
const photos = ref([])

onMounted(async () => {
  const contentSnap = await getDoc(doc(db, 'content', 'site'))
  content.value = contentSnap.exists() ? contentSnap.data() : {}

  const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('order')))
  photos.value = await Promise.all(
    gallerySnap.docs.map(async (d) => {
      const data = d.data()
      const url = await getDownloadURL(storageRef(storage, data.storagePath))
      return { id: d.id, caption: data.caption ?? '', url }
    })
  )
})
</script>
```

- [ ] **Step 2: Manual verification**

With emulators running and at least one `gallery` doc (pointing at an uploaded image in the Storage emulator) plus `amenities`/`contactInfo` on `content/site`, load the Gallery & Info page and confirm the photo, amenities list, and contact info render.

- [ ] **Step 3: Commit**

```bash
git add src/components/GalleryInfoPage.vue
git commit -m "Implement public gallery and info page"
```

---

### Task 7: Realtor & Admin Document Libraries

**Files:**
- Create: `src/documentAccess.js`
- Create: `tests/documentAccess.test.js`
- Create: `src/components/DocumentList.vue`
- Create: `src/components/RealtorLibraryPage.vue`
- Create: `src/components/AdminLibraryPage.vue`
- Modify: `src/App.vue` (import the two new pages and replace their `'Coming soon.'` fallback branches)

**Interfaces:**
- Produces: `realtorVisibleDocuments(docs)`, `adminOnlyDocuments(docs)`, `filterByCategory(docs, category)` from `src/documentAccess.js` — `filterByCategory` is consumed directly by `DocumentList.vue`; the other two describe the query pattern both library pages use (as Firestore `where` clauses, not client-side filtering, since Firestore rules require the query itself to be scoped — see Step 5 comment).

- [ ] **Step 1: Write the failing test** — `tests/documentAccess.test.js`

```js
import { describe, it, expect } from 'vitest'
import { realtorVisibleDocuments, adminOnlyDocuments, filterByCategory } from '../src/documentAccess.js'

const DOCS = [
  { id: '1', category: 'pricing', visibility: 'realtor' },
  { id: '2', category: 'lease', visibility: 'admin' },
  { id: '3', category: 'floorplan', visibility: 'realtor' },
]

describe('realtorVisibleDocuments', () => {
  it('returns only realtor-visibility docs', () => {
    expect(realtorVisibleDocuments(DOCS).map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('adminOnlyDocuments', () => {
  it('returns only admin-visibility docs', () => {
    expect(adminOnlyDocuments(DOCS).map((d) => d.id)).toEqual(['2'])
  })
})

describe('filterByCategory', () => {
  it('returns all docs when category is "all" or falsy', () => {
    expect(filterByCategory(DOCS, 'all')).toEqual(DOCS)
    expect(filterByCategory(DOCS, null)).toEqual(DOCS)
  })
  it('filters by exact category match', () => {
    expect(filterByCategory(DOCS, 'pricing').map((d) => d.id)).toEqual(['1'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/documentAccess.test.js`
Expected: FAIL (module doesn't exist).

- [ ] **Step 3: Implement** — `src/documentAccess.js`

```js
export function realtorVisibleDocuments(docs) {
  return docs.filter((d) => d.visibility === 'realtor')
}

export function adminOnlyDocuments(docs) {
  return docs.filter((d) => d.visibility === 'admin')
}

export function filterByCategory(docs, category) {
  if (!category || category === 'all') return docs
  return docs.filter((d) => d.category === category)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/documentAccess.test.js`
Expected: PASS.

- [ ] **Step 5: Create `src/components/DocumentList.vue`**

```vue
<template>
  <div>
    <label>
      Category
      <select v-model="category">
        <option value="all">All</option>
        <option value="floorplan">Floor Plans</option>
        <option value="pricing">Pricing / Availability</option>
        <option value="lease">Lease / Legal</option>
      </select>
    </label>
    <ul>
      <li v-for="docItem in filtered" :key="docItem.id">
        <a href="#" @click.prevent="download(docItem)">{{ docItem.title }}</a>
        <span class="category-tag">{{ docItem.category }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import { storage } from '../firebase.js'
import { filterByCategory } from '../documentAccess.js'

const props = defineProps({
  documents: { type: Array, required: true },
})

const category = ref('all')
const filtered = computed(() => filterByCategory(props.documents, category.value))

async function download(docItem) {
  const url = await getDownloadURL(storageRef(storage, docItem.storagePath))
  window.open(url, '_blank')
}
</script>
```

- [ ] **Step 6: Create `src/components/RealtorLibraryPage.vue`**

```vue
<template>
  <section>
    <h2>Document Library</h2>
    <DocumentList :documents="documents" />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import DocumentList from './DocumentList.vue'

const documents = ref([])

onMounted(async () => {
  // Must filter server-side by visibility=='realtor': a realtor's Firestore
  // rules only allow reading docs with this visibility, so an unfiltered
  // query would be denied outright when a realtor (not admin) runs it.
  const snap = await getDocs(query(collection(db, 'documents'), where('visibility', '==', 'realtor')))
  documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
})
</script>
```

- [ ] **Step 7: Create `src/components/AdminLibraryPage.vue`**

```vue
<template>
  <section>
    <h2>Admin Library</h2>
    <DocumentList :documents="documents" />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'
import DocumentList from './DocumentList.vue'

const documents = ref([])

onMounted(async () => {
  const snap = await getDocs(query(collection(db, 'documents'), where('visibility', '==', 'admin')))
  documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
})
</script>
```

- [ ] **Step 8: Modify `src/App.vue`**

In the `<script setup>` imports, add:

```js
import RealtorLibraryPage from './components/RealtorLibraryPage.vue'
import AdminLibraryPage from './components/AdminLibraryPage.vue'
```

In the `<template>`, replace:

```vue
<p v-else>Coming soon.</p>
```

with:

```vue
<RealtorLibraryPage v-else-if="currentPage === 'realtor-library'" />
<AdminLibraryPage v-else-if="currentPage === 'admin-library'" />
<p v-else>Coming soon.</p>
```

- [ ] **Step 9: Manual verification**

With emulators running and `documents` docs seeded (one `visibility: 'realtor'`, one `visibility: 'admin'`, each with a matching file uploaded to the Storage emulator at the doc's `storagePath`), log in as the admin from Task 4 and confirm both Document Library and Admin Library show the expected documents, with category filtering and working downloads.

- [ ] **Step 10: Commit**

```bash
git add src/documentAccess.js tests/documentAccess.test.js src/components/DocumentList.vue src/components/RealtorLibraryPage.vue src/components/AdminLibraryPage.vue src/App.vue
git commit -m "Add realtor and admin document library pages"
```

---

### Task 8: Admin Content Editor

**Files:**
- Create: `src/components/ContentEditorPage.vue`
- Modify: `src/App.vue` (import and wire up the page)

**Interfaces:**
- Consumes: `db`, `storage` from `src/firebase.js`; the `content/site` and `gallery/{docId}` shapes from the spec.

- [ ] **Step 1: Create `src/components/ContentEditorPage.vue`**

```vue
<template>
  <section>
    <h2>Edit Site Content</h2>
    <form @submit.prevent="save">
      <label>Hero Title <input v-model="form.heroTitle" /></label>
      <label>Hero Subtitle <input v-model="form.heroSubtitle" /></label>
      <label>Description <textarea v-model="form.description"></textarea></label>
      <label>
        Amenities (one per line)
        <textarea v-model="amenitiesText"></textarea>
      </label>
      <label>Contact Phone <input v-model="form.contactInfo.phone" /></label>
      <label>Contact Email <input v-model="form.contactInfo.email" /></label>
      <label>Contact Address <input v-model="form.contactInfo.address" /></label>
      <button type="submit" :disabled="saving">Save</button>
      <p v-if="saved">Saved.</p>
    </form>

    <h2>Gallery</h2>
    <ul>
      <li v-for="(photo, index) in photos" :key="photo.id">
        {{ photo.caption }}
        <button type="button" @click="moveUp(index)" :disabled="index === 0">Up</button>
        <button type="button" @click="moveDown(index)" :disabled="index === photos.length - 1">Down</button>
        <button type="button" @click="deletePhoto(photo)">Delete</button>
      </li>
    </ul>
    <form @submit.prevent="addPhoto">
      <input type="file" accept="image/*" @change="onFileChange" required />
      <input v-model="newCaption" placeholder="Caption" />
      <button type="submit" :disabled="uploading">Add Photo</button>
    </form>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  doc, getDoc, setDoc, collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase.js'

const form = reactive({
  heroTitle: '',
  heroSubtitle: '',
  description: '',
  contactInfo: { phone: '', email: '', address: '' },
})
const amenitiesText = ref('')
const saving = ref(false)
const saved = ref(false)

const photos = ref([])
const newFile = ref(null)
const newCaption = ref('')
const uploading = ref(false)

onMounted(async () => {
  const snap = await getDoc(doc(db, 'content', 'site'))
  if (snap.exists()) {
    const data = snap.data()
    Object.assign(form, data, { contactInfo: { ...form.contactInfo, ...data.contactInfo } })
    amenitiesText.value = (data.amenities ?? []).join('\n')
  }
  await loadPhotos()
})

async function loadPhotos() {
  const snap = await getDocs(query(collection(db, 'gallery'), orderBy('order')))
  photos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function save() {
  saving.value = true
  saved.value = false
  const amenities = amenitiesText.value.split('\n').map((s) => s.trim()).filter(Boolean)
  await setDoc(doc(db, 'content', 'site'), { ...form, amenities }, { merge: true })
  saving.value = false
  saved.value = true
}

function onFileChange(event) {
  newFile.value = event.target.files[0] ?? null
}

async function addPhoto() {
  if (!newFile.value) return
  uploading.value = true
  const path = `gallery/${Date.now()}-${newFile.value.name}`
  await uploadBytes(storageRef(storage, path), newFile.value)
  const order = photos.value.length ? Math.max(...photos.value.map((p) => p.order)) + 1 : 1
  await addDoc(collection(db, 'gallery'), { storagePath: path, caption: newCaption.value, order })
  newFile.value = null
  newCaption.value = ''
  uploading.value = false
  await loadPhotos()
}

async function deletePhoto(photo) {
  await deleteObject(storageRef(storage, photo.storagePath))
  await deleteDoc(doc(db, 'gallery', photo.id))
  await loadPhotos()
}

async function moveUp(index) {
  if (index === 0) return
  await swapOrder(index, index - 1)
}

async function moveDown(index) {
  if (index === photos.value.length - 1) return
  await swapOrder(index, index + 1)
}

async function swapOrder(i, j) {
  const a = photos.value[i]
  const b = photos.value[j]
  await updateDoc(doc(db, 'gallery', a.id), { order: b.order })
  await updateDoc(doc(db, 'gallery', b.id), { order: a.order })
  await loadPhotos()
}
</script>
```

- [ ] **Step 2: Modify `src/App.vue`**

In the `<script setup>` imports, add:

```js
import ContentEditorPage from './components/ContentEditorPage.vue'
```

In the `<template>`, add a branch before the final fallback:

```vue
<ContentEditorPage v-else-if="currentPage === 'content-editor'" />
```

- [ ] **Step 3: Manual verification**

Logged in as admin, open Edit Content, change the hero title/description/amenities/contact info, save, then reload the Home and Gallery & Info pages and confirm the new values appear. Upload a photo, confirm it appears in the gallery, reorder it, then delete it.

- [ ] **Step 4: Commit**

```bash
git add src/components/ContentEditorPage.vue src/App.vue
git commit -m "Add admin content editor for site text and gallery"
```

---

### Task 9: Admin Document Manager

**Files:**
- Create: `src/components/DocumentManagerPage.vue`
- Modify: `src/App.vue` (import and wire up the page)

**Interfaces:**
- Consumes: `db`, `storage`, `auth` from `src/firebase.js`; writes into the `documents/{docId}` shape and the `/documents/{visibility}/*` Storage paths defined in Task 3.

- [ ] **Step 1: Create `src/components/DocumentManagerPage.vue`**

```vue
<template>
  <section>
    <h2>Manage Documents</h2>
    <form @submit.prevent="upload">
      <input v-model="title" placeholder="Title" required />
      <select v-model="category" required>
        <option value="floorplan">Floor Plan</option>
        <option value="pricing">Pricing / Availability</option>
        <option value="lease">Lease / Legal</option>
      </select>
      <select v-model="visibility" required>
        <option value="realtor">Realtor Library</option>
        <option value="admin">Admin Library</option>
      </select>
      <input type="file" @change="onFileChange" required />
      <button type="submit" :disabled="uploading">Upload</button>
    </form>

    <ul>
      <li v-for="docItem in documents" :key="docItem.id">
        {{ docItem.title }} ({{ docItem.category }}, {{ docItem.visibility }})
        <button type="button" @click="remove(docItem)">Delete</button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage, auth } from '../firebase.js'

const title = ref('')
const category = ref('floorplan')
const visibility = ref('realtor')
const file = ref(null)
const uploading = ref(false)
const documents = ref([])

onMounted(loadDocuments)

async function loadDocuments() {
  const snap = await getDocs(collection(db, 'documents'))
  documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

function onFileChange(event) {
  file.value = event.target.files[0] ?? null
}

async function upload() {
  if (!file.value) return
  uploading.value = true
  const path = `documents/${visibility.value}/${Date.now()}-${file.value.name}`
  await uploadBytes(storageRef(storage, path), file.value)
  await addDoc(collection(db, 'documents'), {
    title: title.value,
    category: category.value,
    visibility: visibility.value,
    storagePath: path,
    uploadedAt: serverTimestamp(),
    uploadedBy: auth.currentUser?.uid ?? null,
  })
  title.value = ''
  file.value = null
  uploading.value = false
  await loadDocuments()
}

async function remove(docItem) {
  await deleteObject(storageRef(storage, docItem.storagePath))
  await deleteDoc(doc(db, 'documents', docItem.id))
  await loadDocuments()
}
</script>
```

- [ ] **Step 2: Modify `src/App.vue`**

In the `<script setup>` imports, add:

```js
import DocumentManagerPage from './components/DocumentManagerPage.vue'
```

In the `<template>`, add a branch before the final fallback:

```vue
<DocumentManagerPage v-else-if="currentPage === 'document-manager'" />
```

- [ ] **Step 3: Manual verification**

Logged in as admin, open Manage Documents, upload a file with category "pricing" and visibility "realtor", confirm it appears in the list and in the realtor Document Library page. Upload another with visibility "admin" and confirm it appears only in the Admin Library. Delete one and confirm it disappears from both the manager list and the corresponding library.

- [ ] **Step 4: Commit**

```bash
git add src/components/DocumentManagerPage.vue src/App.vue
git commit -m "Add admin document manager for uploading and deleting library files"
```

---

### Task 10: Realtor Account Provisioning Script

**Files:**
- Create: `scripts/create-realtor.mjs`

**Interfaces:**
- Consumes: `scripts/serviceAccountKey.json` (gitignored, not created by this plan — the user downloads it from Firebase Console when a real project exists).
- Produces: a `realtors/{uid}` Firestore doc matching the shape Task 2's rules and Task 7's queries expect.

- [ ] **Step 1: Create `scripts/create-realtor.mjs`**

```js
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
```

- [ ] **Step 2: Manual verification against the emulator**

```bash
npm run emulators
```

In another terminal, create a placeholder service account file (the emulator doesn't validate its contents, but `firebase-admin` requires the file to exist and be parseable JSON with the expected fields):

```bash
cat > scripts/serviceAccountKey.json <<'EOF'
{
  "type": "service_account",
  "project_id": "apartment-site",
  "private_key_id": "test",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----\n",
  "client_email": "test@apartment-site.iam.gserviceaccount.com",
  "client_id": "0",
  "token_uri": "https://oauth2.googleapis.com/token"
}
EOF
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/create-realtor.mjs realtor@example.com "Test Realtor"
```

Expected: console output confirms the account was created; check the Emulator UI to confirm both the Auth user and the `realtors/{uid}` Firestore doc exist. Delete the placeholder `scripts/serviceAccountKey.json` afterward (it's gitignored, but no need to leave it around).

- [ ] **Step 3: Commit**

```bash
git add scripts/create-realtor.mjs
git commit -m "Add realtor account provisioning script"
```

---

### Task 11: CI, Deployment, and Docs

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `public/404.html`
- Create: `DEPLOY.md`

**Interfaces:**
- Consumes: `npm test`, `npm run test:rules`, `npm run build` scripts from Task 1's `package.json`.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run test:rules
```

- [ ] **Step 2: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 3: Create `public/404.html`**

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <script>
    var path = window.location.pathname;
    var base = '/Apartment';
    var redirectPath = path.replace(base, '') || '/';
    window.location.replace(base + '/?p=' + encodeURIComponent(redirectPath));
  </script>
</head>
<body></body>
</html>
```

- [ ] **Step 4: Create `DEPLOY.md`**

```markdown
# Deploying

## First-time setup

1. Create a Firebase project (Firebase Console -> Add project). Enable:
   - Authentication -> Sign-in method -> Email/Password
   - Firestore Database
   - Storage
2. Deploy the security rules: `firebase deploy --only firestore:rules,storage:rules --project <your-project-id>`
3. In the Firebase Console, manually create the first admin:
   - Authentication -> Add user (email/password)
   - Firestore -> create a document at `admins/<that user's UID>` with no fields
4. Copy the web app config (Project Settings -> General -> Your apps -> SDK setup and configuration) into `src/firebase.js`, replacing the placeholder `firebaseConfig`.
5. Update `.firebaserc` and the `--project` flags in `package.json` scripts to your real project id, if different from `apartment-site`.
6. Confirm `vite.config.js`'s `base` matches your GitHub repo name exactly (e.g. `/Apartment/`).

## Enable GitHub Pages

1. Repo Settings -> Pages -> Source: GitHub Actions.
2. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.
3. Site will be live at `https://<username>.github.io/Apartment/`.

## After deploying

Add the GitHub Pages domain to Firebase: Authentication -> Settings -> Authorized domains -> Add domain -> `<username>.github.io`.

## Adding a realtor

```bash
node scripts/create-realtor.mjs realtor@example.com "Realtor Name"
```

This requires `scripts/serviceAccountKey.json` (Project Settings -> Service Accounts -> Generate new private key), which is gitignored and must never be committed.

## Moving to Cloudflare later

The build output (`dist/`) is a plain static bundle. To move: point Cloudflare Pages at this repo with build command `npm run build` and output directory `dist`, then add the Cloudflare Pages domain to Firebase's authorized domains the same way as above.
```

- [ ] **Step 5: Verify the production build succeeds**

```bash
npm run build
```

Expected: `dist/` is created with no errors.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml public/404.html DEPLOY.md
git commit -m "Add CI, GitHub Pages deployment, and deploy docs"
```

---

## Self-Review Notes

- **Spec coverage:** Public tier (Tasks 5-6), realtor tier (Task 7), admin tier (Tasks 7-9), account provisioning (Task 10), security rules for both Firestore and Storage (Tasks 2-3), deployment path (Task 11) — every spec section maps to at least one task.
- **No separate "admin library" collection**, per spec — Task 9's `DocumentManagerPage` writes to the single `documents` collection with a `visibility` field; Task 7's `AdminLibraryPage` just queries `visibility == 'admin'`.
- **Type/shape consistency checked:** `documents` doc fields (`title`, `category`, `visibility`, `storagePath`, `uploadedAt`, `uploadedBy`) are identical across Task 2's rules tests, Task 7's queries, and Task 9's writes. `gallery` doc fields (`storagePath`, `caption`, `order`) are identical across Task 2, Task 6, and Task 8. `content/site` fields (`heroTitle`, `heroSubtitle`, `description`, `amenities`, `contactInfo`) are identical across Task 2, Task 5, Task 6, and Task 8.
- **Out of scope items** (multi-property, contact form, self-registration, WYSIWYG, Cloud Functions) are not present in any task.
