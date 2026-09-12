<template>
  <section class="page">
    <h2 class="section-title">Gallery</h2>
    <div class="gallery-grid">
      <figure v-for="photo in displayPhotos" :key="photo.id" class="gallery-item">
        <img :src="photo.url" :alt="photo.caption" />
        <figcaption v-if="photo.caption">{{ photo.caption }}</figcaption>
      </figure>
    </div>

    <h2 class="section-title about-title">About This Property</h2>
    <p class="description">{{ content?.description }}</p>

    <h3>Amenities</h3>
    <ul class="amenities">
      <li v-for="amenity in content?.amenities ?? []" :key="amenity" class="badge">{{ amenity }}</li>
    </ul>

    <h3>Contact</h3>
    <p v-if="content?.contactInfo" class="card contact-card">
      <span>{{ content.contactInfo.phone }}</span>
      <span>{{ content.contactInfo.email }}</span>
      <span>{{ content.contactInfo.address }}</span>
    </p>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase.js'

// Shown only until an admin uploads real photos via the Content Editor, so a
// fresh deployment never shows an empty gallery grid.
const FALLBACK_PHOTOS = [
  { id: 'fallback-1', caption: 'Resident pool and courtyard', url: 'https://images.unsplash.com/photo-1580041065738-e72023775cdc?auto=format&fit=crop&w=900&q=75' },
  { id: 'fallback-2', caption: 'Bright, open living room', url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=75' },
  { id: 'fallback-3', caption: 'Modern kitchen', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=75' },
  { id: 'fallback-4', caption: 'Comfortable bedroom', url: 'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?auto=format&fit=crop&w=900&q=75' },
  { id: 'fallback-5', caption: 'Spacious living space', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=75' },
  { id: 'fallback-6', caption: 'Cozy common area', url: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=75' },
]

const content = ref(null)
const photos = ref([])
const displayPhotos = computed(() => (photos.value.length ? photos.value : FALLBACK_PHOTOS))

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

<style scoped>
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1.1rem;
  margin-bottom: 3rem;
}

.gallery-item {
  margin: 0;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  background: var(--color-surface);
}

.gallery-item img {
  display: block;
  width: 100%;
  height: 170px;
  object-fit: cover;
}

.gallery-item figcaption {
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.about-title {
  margin-top: 1rem;
}

.description {
  max-width: 720px;
}

.amenities {
  list-style: none;
  margin: 0 0 2.5rem;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.contact-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-width: 360px;
  margin: 0;
}
</style>
