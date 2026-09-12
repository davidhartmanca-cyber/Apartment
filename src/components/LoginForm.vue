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
    console.error(err)
    error.value = 'Invalid email or password.'
  } finally {
    submitting.value = false
  }
}
</script>
