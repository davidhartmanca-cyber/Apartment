<template>
  <section v-if="content" class="hero">
    <div class="hero-inner">
      <h1>{{ content.heroTitle }}</h1>
      <p class="subtitle">{{ content.heroSubtitle }}</p>
      <p class="lead">{{ content.description }}</p>
    </div>
  </section>
  <p v-else class="page">Loading...</p>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

const content = ref(null)

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'content', 'site'))
    content.value = snap.exists() ? snap.data() : {}
  } catch (error) {
    console.error('Failed to fetch home page content:', error)
  }
})
</script>

<style scoped>
.hero {
  min-height: 78vh;
  display: flex;
  align-items: center;
  background:
    linear-gradient(180deg, rgba(20, 30, 24, 0.35) 0%, rgba(20, 30, 24, 0.72) 100%),
    url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1800&q=80') center/cover no-repeat;
  color: #fff;
}

.hero-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.hero h1 {
  color: #fff;
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  margin-bottom: 0.5rem;
}

.hero .subtitle {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.92);
  margin: 0 0 1.1rem;
}

.hero .lead {
  max-width: 600px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.02rem;
}
</style>
