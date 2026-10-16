<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import MunicipalSidebar from '@/components/sidebar/municipal/municipal.vue'
// Reuses the secretary header (adjust the path if yours lives elsewhere).
import AppHeader from '@/components/header/secretary/header.vue'
import { useSecretaryLayout } from '@/composables/useSecretaryLayout'
import { useAuthStore } from '@/stores/auth'

const municipalName = 'San Fabian'

const currentUser = computed(() => {
  const name = auth.user?.name ?? 'Secretary'
  return {
    name,
    role: 'Secretary',
    office: 'Barangay Hall',
    initials: name
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  }
})

const router = useRouter()
const auth = useAuthStore()
const { isDesktop, isMobileOpen, isSidebarVisible, syncViewport, closeMobile } =
  useSecretaryLayout()

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})
onBeforeUnmount(() => window.removeEventListener('resize', syncViewport))

const name = computed(() => auth.user?.name ?? 'Municipal Officer')
const initials = computed(
  () =>
    name.value
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'M',
)

const sidebarUser = computed(() => ({
  name: name.value,
  office: 'Municipal Office',
  initials: initials.value,
}))


function signOut() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <MunicipalSidebar :user="sidebarUser" @sign-out="signOut" />

    <!-- Mobile drawer backdrop -->
    <div
      v-if="!isDesktop && isMobileOpen"
      class="fixed inset-0 z-40 bg-slate-900/40"
      aria-hidden="true"
      @click="closeMobile"
    />

    <div
      :class="[
        'transition-[padding] duration-300 ease-out',
        isDesktop && isSidebarVisible ? 'lg:pl-64' : '',
      ]"
    >
      <AppHeader :barangay-name="municipalName" :user="currentUser" />
      <main class="p-4 lg:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>