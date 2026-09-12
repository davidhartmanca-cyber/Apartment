<template>
  <section class="page">
    <h2 class="section-title">Edit Site Content</h2>
    <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    <form class="card form-block" @submit.prevent="save">
      <label>Hero Title <input v-model="form.heroTitle" /></label>
      <label>Hero Subtitle <input v-model="form.heroSubtitle" /></label>
      <label>Description <textarea v-model="form.description"></textarea></label>
      <label>
        Amenities (one per line)
        <textarea v-model="amenitiesText"></textarea>
      </label>
      <label>Contact Phone <input v-model="form.contactInfo.phone" /></label>
      <label>Contact Email <input v-model="form.contactInfo.email" /></label>
      <label>Contact Address <input v-model="form.contactInfo.address" /></label>
      <button type="submit" class="btn btn-primary" :disabled="saving">Save</button>
      <p v-if="saved" class="success-text">Saved.</p>
    </form>

    <h2 class="section-title gallery-title">Gallery</h2>
    <ul class="list-plain photo-list">
      <li v-for="(photo, index) in photos" :key="photo.id" class="card photo-row">
        <span class="photo-caption">{{ photo.caption }}</span>
        <span class="photo-actions">
          <button type="button" class="btn btn-outline btn-small" @click="moveUp(index)" :disabled="index === 0 || photoBusy">Up</button>
          <button type="button" class="btn btn-outline btn-small" @click="moveDown(index)" :disabled="index === photos.length - 1 || photoBusy">Down</button>
          <button type="button" class="btn btn-outline btn-small" @click="deletePhoto(photo)" :disabled="photoBusy">Delete</button>
        </span>
      </li>
    </ul>
    <form class="card form-block add-photo-form" @submit.prevent="addPhoto">
      <input type="file" accept="image/*" @change="onFileChange" required />
      <input v-model="newCaption" placeholder="Caption" />
      <button type="submit" class="btn btn-primary" :disabled="uploading">Add Photo</button>
    </form>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  doc, getDoc, setDoc, collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, deleteObject } from 'firebase/storage'
import { db, storage } from '../firebase.js'

const form = reactive({
  heroTitle: '',
  heroSubtitle: '',
  description: '',
  contactInfo: { phone: '', email: '', address: '' },
})
const amenitiesText = ref('')
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')

const photos = ref([])
const newFile = ref(null)
const newCaption = ref('')
const uploading = ref(false)
const photoBusy = ref(false)

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
    const snap = await getDoc(doc(db, 'content', 'site'))
    if (snap.exists()) {
      const data = snap.data()
      Object.assign(form, data, { contactInfo: { ...form.contactInfo, ...data.contactInfo } })
      amenitiesText.value = (data.amenities ?? []).join('\n')
    }
    await loadPhotos()
  } catch (error) {
    console.error('Error loading content and gallery:', error)
  }
})

async function loadPhotos() {
  const snap = await getDocs(query(collection(db, 'gallery'), orderBy('order')))
  photos.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

async function save() {
  await withBusy(saving, async () => {
    saved.value = false
    const amenities = amenitiesText.value.split('\n').map((s) => s.trim()).filter(Boolean)
    await setDoc(doc(db, 'content', 'site'), { ...form, amenities }, { merge: true })
    saved.value = true
  })
}

function onFileChange(event) {
  newFile.value = event.target.files[0] ?? null
}

async function addPhoto() {
  if (!newFile.value) return
  await withBusy(uploading, async () => {
    const path = `gallery/${Date.now()}-${newFile.value.name}`
    await uploadBytes(storageRef(storage, path), newFile.value)
    const order = photos.value.length ? Math.max(...photos.value.map((p) => p.order)) + 1 : 1
    await addDoc(collection(db, 'gallery'), { storagePath: path, caption: newCaption.value, order })
    newFile.value = null
    newCaption.value = ''
    await loadPhotos()
  })
}

async function deletePhoto(photo) {
  await withBusy(photoBusy, async () => {
    await deleteDoc(doc(db, 'gallery', photo.id))
    await deleteObject(storageRef(storage, photo.storagePath))
    await loadPhotos()
  })
}

async function moveUp(index) {
  if (index === 0) return
  await swapOrder(index, index - 1)
}

async function moveDown(index) {
  if (index === photos.value.length - 1) return
  await swapOrder(index, index + 1)
}

async function swapOrder(i, j) {
  await withBusy(photoBusy, async () => {
    const a = photos.value[i]
    const b = photos.value[j]
    await updateDoc(doc(db, 'gallery', a.id), { order: b.order })
    await updateDoc(doc(db, 'gallery', b.id), { order: a.order })
    await loadPhotos()
  })
}
</script>

<style scoped>
.form-block {
  max-width: 480px;
  margin-bottom: 2rem;
}

.form-block button {
  margin-top: 0.25rem;
}

.gallery-title {
  margin-top: 1rem;
}

.photo-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
  max-width: 560px;
}

.photo-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1.1rem;
  gap: 1rem;
}

.photo-caption {
  color: var(--color-text);
}

.photo-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}

.add-photo-form {
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
</style>
