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
  try {
    const snap = await getDocs(query(collection(db, 'documents'), where('visibility', '==', 'admin')))
    documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Failed to load admin documents:', error)
  }
})
</script>
