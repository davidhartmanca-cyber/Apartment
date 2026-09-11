<template>
  <section>
    <h2>Edit Site Content</h2>
    <form @submit.prevent="save">
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
      <button type="submit" :disabled="saving">Save</button>
      <p v-if="saved">Saved.</p>
    </form>

    <h2>Gallery</h2>
    <ul>
      <li v-for="(photo, index) in photos" :key="photo.id">
        {{ photo.caption }}
        <button type="button" @click="moveUp(index)" :disabled="index === 0">Up</button>
        <button type="button" @click="moveDown(index)" :disabled="index === photos.length - 1">Down</button>
        <button type="button" @click="deletePhoto(photo)">Delete</button>
      </li>
    </ul>
    <form @submit.prevent="addPhoto">
      <input type="file" accept="image/*" @change="onFileChange" required />
      <input v-model="newCaption" placeholder="Caption" />
      <button type="submit" :disabled="uploading">Add Photo</button>
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

const photos = ref([])
const newFile = ref(null)
const newCaption = ref('')
const uploading = ref(false)

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
  saving.value = true
  saved.value = false
  const amenities = amenitiesText.value.split('\n').map((s) => s.trim()).filter(Boolean)
  await setDoc(doc(db, 'content', 'site'), { ...form, amenities }, { merge: true })
  saving.value = false
  saved.value = true
}

function onFileChange(event) {
  newFile.value = event.target.files[0] ?? null
}

async function addPhoto() {
  if (!newFile.value) return
  uploading.value = true
  const path = `gallery/${Date.now()}-${newFile.value.name}`
  await uploadBytes(storageRef(storage, path), newFile.value)
  const order = photos.value.length ? Math.max(...photos.value.map((p) => p.order)) + 1 : 1
  await addDoc(collection(db, 'gallery'), { storagePath: path, caption: newCaption.value, order })
  newFile.value = null
  newCaption.value = ''
  uploading.value = false
  await loadPhotos()
}

async function deletePhoto(photo) {
  await deleteDoc(doc(db, 'gallery', photo.id))
  await deleteObject(storageRef(storage, photo.storagePath))
  await loadPhotos()
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
  const a = photos.value[i]
  const b = photos.value[j]
  await updateDoc(doc(db, 'gallery', a.id), { order: b.order })
  await updateDoc(doc(db, 'gallery', b.id), { order: a.order })
  await loadPhotos()
}
</script>
