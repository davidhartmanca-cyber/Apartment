<template>
  <section class="page">
    <h2 class="section-title">Realtor Access</h2>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    <p v-if="notice" class="success-text">{{ notice }}</p>

    <div v-if="granted" class="card granted-card">
      <h3>Access granted to {{ granted.name }}</h3>
      <p class="muted">This password is shown only once. Copy it (or the ready-made email) and send it to {{ granted.email }}.</p>
      <p class="password-row">
        <code class="password">{{ granted.password }}</code>
        <button type="button" class="btn btn-outline btn-small" @click="copy(granted.password, 'password')">
          {{ copied === 'password' ? 'Copied' : 'Copy password' }}
        </button>
        <button type="button" class="btn btn-outline btn-small" @click="copy(granted.inviteText, 'email')">
          {{ copied === 'email' ? 'Copied' : 'Copy email text' }}
        </button>
      </p>
      <button type="button" class="btn btn-primary btn-small" @click="granted = null">Done</button>
    </div>

    <h3>Pending requests</h3>
    <p v-if="!requests.length" class="muted">No pending requests.</p>
    <ul v-else class="list-plain access-list">
      <li v-for="req in requests" :key="req.id" class="card access-row">
        <span>
          <strong>{{ req.name }}</strong>
          <span class="muted"> {{ req.email }}</span>
        </span>
        <span class="row-actions">
          <button type="button" class="btn btn-primary btn-small" @click="grant(req)" :disabled="busy">Grant</button>
          <button type="button" class="btn btn-outline btn-small" @click="decline(req)" :disabled="busy">Decline</button>
        </span>
      </li>
    </ul>

    <h3 class="realtors-title">Realtors</h3>
    <p v-if="!realtors.length" class="muted">No realtors yet.</p>
    <ul v-else class="list-plain access-list">
      <li v-for="realtor in realtors" :key="realtor.id" class="card access-row">
        <span>
          <strong>{{ realtor.name || realtor.email }}</strong>
          <span class="muted"> {{ realtor.email }}</span>
          <span v-if="realtor.active === false" class="badge">Revoked</span>
        </span>
        <span class="row-actions">
          <button v-if="realtor.active === false" type="button" class="btn btn-outline btn-small" @click="reactivate(realtor)" :disabled="busy">Restore access</button>
          <button v-else type="button" class="btn btn-outline btn-small" @click="revoke(realtor)" :disabled="busy">Revoke</button>
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { db, auth, getAccountCreationAuth } from '../firebase.js'
import { generatePassword, buildInviteEmail } from '../realtorAccess.js'

const requests = ref([])
const realtors = ref([])
const busy = ref(false)
const errorMessage = ref('')
const notice = ref('')
const granted = ref(null)
const copied = ref('')

const siteUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

onMounted(async () => {
  try {
    await load()
  } catch (error) {
    console.error('Failed to load realtor access data:', error)
  }
})

async function load() {
  const [requestSnap, realtorSnap] = await Promise.all([
    getDocs(collection(db, 'accessRequests')),
    getDocs(collection(db, 'realtors')),
  ])
  requests.value = requestSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.requestedAt?.toMillis?.() ?? 0) - (b.requestedAt?.toMillis?.() ?? 0))
  realtors.value = realtorSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || a.email || '').localeCompare(b.name || b.email || ''))
}

async function withBusy(fn) {
  busy.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    await fn()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.userMessage ?? 'Something went wrong. Please try again.'
  } finally {
    busy.value = false
  }
}

async function grant(req) {
  await withBusy(async () => {
    const existing = realtors.value.find((r) => r.email === req.email)
    if (existing) {
      // Their login already exists (the client SDK can't set another user's
      // password), so restore access and let them pick a new password.
      if (existing.active === false) await restoreAndSendReset(existing)
      else notice.value = `${req.email} already has realtor access.`
      await deleteDoc(doc(db, 'accessRequests', req.id))
      await load()
      return
    }

    const password = generatePassword()
    const accountAuth = getAccountCreationAuth()
    let uid
    try {
      const credential = await createUserWithEmailAndPassword(accountAuth, req.email, password)
      uid = credential.user.uid
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        error.userMessage = `A login already exists for ${req.email} but it is not a realtor account, so it can't be granted from here. Contact your developer to link it.`
      }
      throw error
    } finally {
      await signOut(accountAuth)
    }

    await setDoc(doc(db, 'realtors', uid), {
      name: req.name,
      email: req.email,
      active: true,
      addedAt: serverTimestamp(),
    })
    await deleteDoc(doc(db, 'accessRequests', req.id))
    granted.value = {
      name: req.name,
      email: req.email,
      password,
      inviteText: buildInviteEmail({ name: req.name, email: req.email, password, siteUrl }),
    }
    copied.value = ''
    await load()
  })
}

async function decline(req) {
  if (!window.confirm(`Decline the access request from ${req.email}?`)) return
  await withBusy(async () => {
    await deleteDoc(doc(db, 'accessRequests', req.id))
    await load()
  })
}

async function revoke(realtor) {
  if (!window.confirm(`Revoke realtor access for ${realtor.email}? They will no longer see the document library.`)) return
  await withBusy(async () => {
    await updateDoc(doc(db, 'realtors', realtor.id), { active: false })
    await load()
  })
}

async function reactivate(realtor) {
  await withBusy(async () => {
    await restoreAndSendReset(realtor)
    await load()
  })
}

async function restoreAndSendReset(realtor) {
  await updateDoc(doc(db, 'realtors', realtor.id), { active: true })
  await sendPasswordResetEmail(auth, realtor.email)
  notice.value = `Access restored for ${realtor.email}. A password-reset email has been sent so they can set a new password.`
}

async function copy(text, which) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
  } catch (error) {
    console.error('Copy failed:', error)
    errorMessage.value = 'Could not copy automatically. Select the text and copy it by hand.'
  }
}
</script>

<style scoped>
.granted-card {
  max-width: 640px;
  margin-bottom: 2rem;
  border-left: 4px solid var(--color-primary);
}

.granted-card h3 {
  margin-top: 0;
}

.password-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.password {
  font-size: 1.15rem;
  letter-spacing: 0.08em;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  user-select: all;
}

.access-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 2rem;
  max-width: 720px;
}

.access-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.8rem 1.1rem;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.realtors-title {
  margin-top: 1rem;
}
</style>
