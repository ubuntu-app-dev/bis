<script setup lang="ts">
// Roboto, self-hosted (npm install @fontsource-variable/roboto). Loads only with this section.
import '@fontsource-variable/roboto'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import SecretarySidebar from '@/components/sidebar/secretary/secretary.vue'
import SecretaryHeader from '@/components/header/secretary/header.vue'
import { useSecretaryLayout } from '@/composables/useSecretaryLayout'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { isDesktop, isMobileOpen, isSidebarVisible, syncViewport, closeMobile } = useSecretaryLayout()

// TODO: load the barangay name from your API / settings.
const barangayName = 'Rabon'

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

async function handleSignOut() {
  auth.logout()
  await router.push('/login')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMobile()
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="min-h-screen bg-bis-canvas font-bis text-[13px] leading-5 text-slate-700 antialiased">
    <SecretarySidebar :user="currentUser" @sign-out="handleSignOut" />

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="!isDesktop && isMobileOpen"
        class="fixed inset-0 z-40 bg-slate-900/40"
        aria-hidden="true"
        @click="closeMobile"
      />
    </Transition>

    <div :class="['transition-[padding] duration-300 ease-out', isSidebarVisible ? 'lg:pl-64' : 'lg:pl-0']">
      <SecretaryHeader :barangay-name="barangayName" :user="currentUser" />

      <main class="px-4 py-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-[1400px]">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>