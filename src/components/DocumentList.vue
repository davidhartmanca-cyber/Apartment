<template>
  <div>
    <label class="category-filter">
      Category
      <select v-model="category">
        <option value="all">All</option>
        <option value="floorplan">Floor Plans</option>
        <option value="pricing">Pricing / Availability</option>
        <option value="lease">Lease / Legal</option>
      </select>
    </label>
    <p v-if="!filtered.length" class="muted">No documents yet.</p>
    <ul v-else class="list-plain doc-list">
      <li v-for="docItem in filtered" :key="docItem.id" class="card doc-row">
        <a href="#" class="doc-title" @click.prevent="download(docItem)">{{ docItem.title }}</a>
        <span class="badge">{{ docItem.category }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getBlob, ref as storageRef } from 'firebase/storage'
import { storage } from '../firebase.js'
import { filterByCategory } from '../documentAccess.js'

const props = defineProps({
  documents: { type: Array, required: true },
})

const category = ref('all')
const filtered = computed(() => filterByCategory(props.documents, category.value))

async function download(docItem) {
  try {
    const blob = await getBlob(storageRef(storage, docItem.storagePath))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = docItem.title || 'document'
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Download failed:', error)
  }
}
</script>

<style scoped>
.category-filter {
  max-width: 260px;
  margin-bottom: 1.25rem;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
}

.doc-title {
  color: var(--color-primary-dark);
  font-weight: 600;
  text-decoration: none;
}

.doc-title:hover {
  text-decoration: underline;
}
</style>
