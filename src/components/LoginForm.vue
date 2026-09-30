<template>
  <form class="card login-card" @submit.prevent="handleSubmit">
    <h2>Log in</h2>
    <label>
      Email
      <input v-model="email" type="email" required />
    </label>
    <label>
      Password
      <input v-model="password" type="password" required />
    </label>
    <button type="submit" class="btn btn-primary" :disabled="submitting">Log in</button>
    <p v-if="error" class="error-text">{{ error }}</p>
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
    console.error(err)
    error.value = 'Invalid email or password.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 360px;
}

.login-card h2 {
  margin-bottom: 1.25rem;
}

.login-card button {
  width: 100%;
  justify-content: center;
  margin-top: 0.5rem;
}
</style>
