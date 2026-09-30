<template>
  <section class="page">
    <h2 class="section-title">Realtors</h2>
    <p class="intro muted">Realtors can sign in to view floor plans, pricing and leasing documents. New here? Request access and we'll send you a login.</p>
    <div class="realtor-panels">
      <LoginForm />

      <form class="card request-card" @submit.prevent="submitRequest">
        <h2>Request access</h2>
        <template v-if="submitted">
          <p class="success-text">Request received. We'll email you at {{ submittedEmail }} once your access is approved.</p>
        </template>
        <template v-else>
          <label>
            Name
            <input v-model="name" :maxlength="MAX_NAME_LENGTH" autocomplete="name" required />
          </label>
          <label>
            Email
            <input v-model="email" type="email" :maxlength="MAX_EMAIL_LENGTH" autocomplete="email" required />
          </label>
          <button type="submit" class="btn btn-outline" :disabled="submitting">Request access</button>
          <p v-if="error" class="error-text">{{ error }}</p>
        </template>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { normalizeAccessRequest, MAX_NAME_LENGTH, MAX_EMAIL_LENGTH } from '../realtorAccess.js'
import LoginForm from './LoginForm.vue'

const name = ref('')
const email = ref('')
const submitting = ref(false)
const submitted = ref(false)
const submittedEmail = ref('')
const error = ref('')

async function submitRequest() {
  error.value = ''
  const request = normalizeAccessRequest({ name: name.value, email: email.value })
  if (!request.ok) {
    error.value = request.error
    return
  }
  submitting.value = true
  try {
    await setDoc(doc(db, 'accessRequests', request.email), {
      name: request.name,
      email: request.email,
      requestedAt: serverTimestamp(),
    })
    showSubmitted(request.email)
  } catch (err) {
    // The rules deny a second request for the same email (it would be an
    // overwrite). The input was already validated above, so treat a denial as
    // "we already have your request" rather than an error.
    if (err?.code === 'permission-denied') {
      showSubmitted(request.email)
    } else {
      console.error('Access request failed:', err)
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

function showSubmitted(address) {
  submittedEmail.value = address
  submitted.value = true
}
</script>

<style scoped>
.intro {
  max-width: 640px;
  margin-bottom: 1.75rem;
}

.realtor-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 360px));
  gap: 1.5rem;
}

.request-card h2 {
  margin-bottom: 1.25rem;
}

.request-card button {
  width: 100%;
  justify-content: center;
  margin-top: 0.5rem;
}
</style>
