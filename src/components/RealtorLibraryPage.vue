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
  try {
    // Must filter server-side by visibility=='realtor': a realtor's Firestore
    // rules only allow reading docs with this visibility, so an unfiltered
    // query would be denied outright when a realtor (not admin) runs it.
    const snap = await getDocs(query(collection(db, 'documents'), where('visibility', '==', 'realtor')))
    documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (error) {
    console.error('Failed to load realtor documents:', error)
  }
})
</script>
