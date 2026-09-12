<template>
  <section class="page">
    <h2 class="section-title">Manage Documents</h2>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    <form class="card form-block upload-form" @submit.prevent="upload">
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
      <button type="submit" class="btn btn-primary" :disabled="uploading">Upload</button>
    </form>

    <ul class="list-plain doc-manage-list">
      <li v-for="docItem in documents" :key="docItem.id" class="card doc-manage-row">
        <span>
          <strong>{{ docItem.title }}</strong>
          <span class="muted"> ({{ docItem.category }}, {{ docItem.visibility }})</span>
        </span>
        <button type="button" class="btn btn-outline btn-small" @click="remove(docItem)" :disabled="removing">Delete</button>
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
const removing = ref(false)
const documents = ref([])
const errorMessage = ref('')

async function withBusy(busyRef, fn) {
  busyRef.value = true
  errorMessage.value = ''
  try {
    await fn()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Something went wrong. Please try again.'
  } finally {
    busyRef.value = false
  }
}

onMounted(async () => {
  try {
    await loadDocuments()
  } catch (error) {
    console.error('Failed to load documents:', error)
  }
})

async function loadDocuments() {
  const snap = await getDocs(collection(db, 'documents'))
  documents.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

function onFileChange(event) {
  file.value = event.target.files[0] ?? null
}

async function upload() {
  if (!file.value) return
  await withBusy(uploading, async () => {
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
    await loadDocuments()
  })
}

async function remove(docItem) {
  await withBusy(removing, async () => {
    await deleteDoc(doc(db, 'documents', docItem.id))
    await deleteObject(storageRef(storage, docItem.storagePath))
    await loadDocuments()
  })
}
</script>

<style scoped>
.upload-form {
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-bottom: 2rem;
}

.doc-manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.doc-manage-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.2rem;
  gap: 1rem;
}
</style>
