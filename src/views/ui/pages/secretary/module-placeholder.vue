<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'

const route = useRoute()
const title = computed(() => (route.meta.title as string | undefined) ?? 'Module')
const description = computed(() => (route.meta.description as string | undefined) ?? '')
</script>

<template>
  <section>
    <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{{ title }}</h1>
    <p v-if="description" class="mt-1 text-slate-500">{{ description }}</p>

    <div
      class="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"
    >
      <div class="grid size-16 place-items-center rounded-2xl bg-bis-50 text-bis-600">
        <BisIcon name="grid" :size="28" />
      </div>
      <h2 class="mt-5 text-lg font-semibold text-slate-900">This module isn't built yet</h2>
      <p class="mt-1 max-w-md text-sm text-slate-500">
        The sidebar link and route for {{ title }} already work. Swap this placeholder for the real view in
        <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs">router/secretary.routes.ts</code>.
      </p>
    </div>
  </section>
</template>
