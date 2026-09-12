<template>
  <div>
    <label>
      Category
      <select v-model="category">
        <option value="all">All</option>
        <option value="floorplan">Floor Plans</option>
        <option value="pricing">Pricing / Availability</option>
        <option value="lease">Lease / Legal</option>
      </select>
    </label>
    <ul>
      <li v-for="docItem in filtered" :key="docItem.id">
        <a href="#" @click.prevent="download(docItem)">{{ docItem.title }}</a>
        <span class="category-tag">{{ docItem.category }}</span>
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
