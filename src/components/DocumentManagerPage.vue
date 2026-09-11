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
  await deleteDoc(doc(db, 'documents', docItem.id))
  await deleteObject(storageRef(storage, docItem.storagePath))
  await loadDocuments()
}
</script>
