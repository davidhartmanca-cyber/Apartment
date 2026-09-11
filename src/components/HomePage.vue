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
