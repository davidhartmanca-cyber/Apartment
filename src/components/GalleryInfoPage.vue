<template>
  <section>
    <h2>Gallery</h2>
    <div class="gallery-grid">
      <img v-for="photo in photos" :key="photo.id" :src="photo.url" :alt="photo.caption" />
    </div>

    <h2>About This Property</h2>
    <p>{{ content?.description }}</p>

    <h3>Amenities</h3>
    <ul>
      <li v-for="amenity in content?.amenities ?? []" :key="amenity">{{ amenity }}</li>
    </ul>

    <h3>Contact</h3>
    <p v-if="content?.contactInfo">
      {{ content.contactInfo.phone }} · {{ content.contactInfo.email }} · {{ content.contactInfo.address }}
    </p>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase.js'

const content = ref(null)
const photos = ref([])

onMounted(async () => {
  try {
    const contentSnap = await getDoc(doc(db, 'content', 'site'))
    content.value = contentSnap.exists() ? contentSnap.data() : {}

    const gallerySnap = await getDocs(query(collection(db, 'gallery'), orderBy('order')))
    photos.value = await Promise.all(
      gallerySnap.docs.map(async (d) => {
        const data = d.data()
        const url = await getDownloadURL(storageRef(storage, data.storagePath))
        return { id: d.id, caption: data.caption ?? '', url }
      })
    )
  } catch (error) {
    console.error('Error loading gallery or content data:', error)
  }
})
</script>
