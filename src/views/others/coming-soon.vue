<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const title = computed(() => (route.meta.title as string | undefined) ?? 'This')

async function signOut() {
  auth.logout()
  await router.push('/login')
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-50 px-6">
    <div class="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
      <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
        Signed in as {{ auth.user?.name }}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{{ title }} section</h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-500">
        Sign-in works for this account, but its pages aren't built yet. Replace this route in
        <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs">router/index.ts</code> when you build it.
      </p>
      <button
        type="button"
        class="mt-8 w-full rounded-2xl bg-rose-50 py-3.5 text-xs font-bold uppercase tracking-[0.25em] text-rose-600 transition-colors hover:bg-rose-100"
        @click="signOut"
      >
        Sign out
      </button>
    </div>
  </main>
</template>