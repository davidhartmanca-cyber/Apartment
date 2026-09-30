<template>
  <header>
    <nav>
      <a href="#" @click.prevent="currentPage = 'home'" :class="{ active: currentPage === 'home' }">Home</a>
      <a href="#" @click.prevent="currentPage = 'gallery'" :class="{ active: currentPage === 'gallery' }">Gallery &amp; Info</a>
      <a v-if="role === 'realtor' || role === 'admin'" href="#" @click.prevent="currentPage = 'realtor-library'" :class="{ active: currentPage === 'realtor-library' }">Document Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'admin-library'" :class="{ active: currentPage === 'admin-library' }">Admin Library</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'content-editor'" :class="{ active: currentPage === 'content-editor' }">Edit Content</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'document-manager'" :class="{ active: currentPage === 'document-manager' }">Manage Documents</a>
      <a v-if="role === 'admin'" href="#" @click.prevent="currentPage = 'realtor-access'" :class="{ active: currentPage === 'realtor-access' }">Realtor Access</a>
      <a v-if="!user" href="#" @click.prevent="currentPage = 'realtors'" :class="{ active: currentPage === 'realtors' }">Realtors</a>
      <a v-if="user" href="#" @click.prevent="handleLogout">Logout</a>
    </nav>
  </header>

  <main>
    <p v-if="roleMessage" class="page role-message">{{ roleMessage }}</p>
    <HomePage v-if="currentPage === 'home'" />
    <GalleryInfoPage v-else-if="currentPage === 'gallery'" />
    <RealtorsPage v-else-if="currentPage === 'realtors'" />
    <RealtorLibraryPage v-else-if="currentPage === 'realtor-library'" />
    <AdminLibraryPage v-else-if="currentPage === 'admin-library'" />
    <ContentEditorPage v-else-if="currentPage === 'content-editor'" />
    <DocumentManagerPage v-else-if="currentPage === 'document-manager'" />
    <RealtorAccessPage v-else-if="currentPage === 'realtor-access'" />
    <p v-else>Coming soon.</p>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { resolveRole, isActiveRealtorDoc } from './auth.js'
import HomePage from './components/HomePage.vue'
import GalleryInfoPage from './components/GalleryInfoPage.vue'
import RealtorsPage from './components/RealtorsPage.vue'
import RealtorLibraryPage from './components/RealtorLibraryPage.vue'
import AdminLibraryPage from './components/AdminLibraryPage.vue'
import ContentEditorPage from './components/ContentEditorPage.vue'
import DocumentManagerPage from './components/DocumentManagerPage.vue'
import RealtorAccessPage from './components/RealtorAccessPage.vue'

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
    const resolvedRole = resolveRole(adminSnap.exists(), isActiveRealtorDoc(realtorSnap.data()))
    role.value = resolvedRole
    // A signed-in user with no admin/realtor marker doc (revoked realtor, or
    // an admin account created in the Console before its marker doc exists)
    // would otherwise be stuck on the Realtors (sign-in) page with no explanation, since
    // `role` may already have been `null` before this resolution and a plain
    // `watch(role, ...)` below would not fire for a null-to-null "change".
    // Handle it here, where we know a fresh resolution just happened.
    if (!resolvedRole && currentPage.value === 'realtors') {
      roleMessage.value = realtorSnap.exists()
        ? 'Your realtor access has been revoked. Contact the property manager if you think this is a mistake.'
        : 'Your account is not yet assigned a role. Contact an administrator for access.'
      currentPage.value = 'home'
    }
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

// Once login resolves a role, leave the Realtors (sign-in) page automatically.
watch(role, (newRole) => {
  if (currentPage.value === 'realtors' && newRole) {
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

<style scoped>
header {
  background: var(--color-primary);
}

nav {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 0.15rem;
  padding: 0.85rem 1.5rem;
  flex-wrap: wrap;
}

nav a {
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  padding: 0.45rem 0.95rem;
  border-radius: 999px;
  font-size: 0.92rem;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}

nav a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

nav a.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.role-message {
  padding-top: 1.5rem;
  padding-bottom: 0;
  color: var(--color-text-light);
}
</style>
