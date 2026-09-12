<template>
  <header>
    <nav>
      <a href="#" @click.prevent="currentPage = 'home'" :class="{ active: currentPage === 'home' }">Home</a>
      <a href="#" @click.prevent="currentPage = 'gallery'" :class="{ active: currentPage === 'gallery' }">Gallery &amp; Info</a>
      <a v-if="role === 'realtor' || role === 'admin'" href="#" @click.prevent="currentPage = 'realtor-library'" :class="{ active: currentPage === 'realtor-library' }">Document Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'admin-library'" :class="{ active: currentPage === 'admin-library' }">Admin Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'content-editor'" :class="{ active: currentPage === 'content-editor' }">Edit Content</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'document-manager'" :class="{ active: currentPage === 'document-manager' }">Manage Documents</a>
      <a v-if="!user" href="#" @click.prevent="currentPage = 'login'" :class="{ active: currentPage === 'login' }">Login</a>
      <a v-if="user" href="#" @click.prevent="handleLogout">Logout</a>
    </nav>
  </header>

  <main>
    <p v-if="roleMessage">{{ roleMessage }}</p>
    <HomePage v-if="currentPage === 'home'" />
    <GalleryInfoPage v-else-if="currentPage === 'gallery'" />
    <LoginForm v-else-if="currentPage === 'login'" />
    <RealtorLibraryPage v-else-if="currentPage === 'realtor-library'" />
    <AdminLibraryPage v-else-if="currentPage === 'admin-library'" />
    <ContentEditorPage v-else-if="currentPage === 'content-editor'" />
    <DocumentManagerPage v-else-if="currentPage === 'document-manager'" />
    <p v-else>Coming soon.</p>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { resolveRole } from './auth.js'
import HomePage from './components/HomePage.vue'
import GalleryInfoPage from './components/GalleryInfoPage.vue'
import LoginForm from './components/LoginForm.vue'
import RealtorLibraryPage from './components/RealtorLibraryPage.vue'
import AdminLibraryPage from './components/AdminLibraryPage.vue'
import ContentEditorPage from './components/ContentEditorPage.vue'
import DocumentManagerPage from './components/DocumentManagerPage.vue'

const currentPage = ref('home')
const user = ref(null)
const role = ref(null)
const roleMessage = ref('')

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    user.value = firebaseUser
    if (!firebaseUser) {
      role.value = null
      roleMessage.value = ''
      return
    }
    const uid = firebaseUser.uid
    const [adminSnap, realtorSnap] = await Promise.all([
      getDoc(doc(db, 'admins', uid)),
      getDoc(doc(db, 'realtors', uid)),
    ])
    // Ignore stale response if auth state has changed since this callback started
    if (auth.currentUser?.uid !== uid) return
    const resolvedRole = resolveRole(adminSnap.exists(), realtorSnap.exists())
    role.value = resolvedRole
    // A signed-in user with no admin/realtor marker doc (revoked realtor, or
    // an admin account created in the Console before its marker doc exists)
    // would otherwise be stuck on the login page with no explanation, since
    // `role` may already have been `null` before this resolution and a plain
    // `watch(role, ...)` below would not fire for a null-to-null "change".
    // Handle it here, where we know a fresh resolution just happened.
    if (!resolvedRole && currentPage.value === 'login') {
      roleMessage.value = 'Your account is not yet assigned a role. Contact an administrator for access.'
      currentPage.value = 'home'
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Once login resolves a role, leave the login page automatically.
watch(role, (newRole) => {
  if (currentPage.value === 'login' && newRole) {
    roleMessage.value = ''
    currentPage.value = newRole === 'admin' ? 'admin-library' : 'realtor-library'
  }
})

async function handleLogout() {
  await signOut(auth)
  currentPage.value = 'home'
  roleMessage.value = ''
}
</script>
