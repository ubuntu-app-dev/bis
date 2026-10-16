<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import AnimalRecordPaper from '@/components/layout/secretary/animal-record-paper.vue'
import { useAnimals } from '@/data/animals'

const route = useRoute()
const { getById, vaccinationsOf } = useAnimals()

const animal = computed(() => getById(String(route.params.id)))
const vaccinations = computed(() => (animal.value ? vaccinationsOf(animal.value.id) : []))

function print() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <template v-if="animal">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <RouterLink
            to="/secretary/animals/registry"
            class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            <BisIcon name="chevronLeft" :size="14" />
            Back to registry
          </RouterLink>
          <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Animal registration record</h1>
          <p class="mt-0.5 text-[13px] text-slate-500">
            <span class="tabular-nums">{{ animal.id }}</span> · {{ animal.name || animal.species }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="print"
        >
          <BisIcon name="download" :size="16" />
          Print record
        </button>
      </div>

      <!-- On-screen preview. Scrolls sideways on small screens instead of shrinking the sheet. -->
      <div class="overflow-x-auto rounded-xl bg-slate-100 p-4 sm:p-8">
        <AnimalRecordPaper :animal="animal" :vaccinations="vaccinations" />
      </div>

      <!-- Print-only copy placed directly in <body>; #app is hidden while printing. -->
      <Teleport to="body">
        <div class="print-only"><AnimalRecordPaper :animal="animal" :vaccinations="vaccinations" /></div>
      </Teleport>
    </template>

    <div v-else class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <BisIcon name="search" :size="20" />
      </div>
      <p class="mt-3 text-[14px] font-medium text-bis-900">This record can’t be printed</p>
      <p class="mt-0.5 text-[13px] text-slate-500">The animal was not found. It may have been removed.</p>
      <RouterLink
        to="/secretary/animals/registry"
        class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Go to registry
      </RouterLink>
    </div>
  </div>
</template>

<!--
  Same rules as the certificate print page. If you'd rather keep them in one place,
  move this block into a global stylesheet and delete it from both pages.
-->
<style>
.print-only {
  display: none;
}

@media print {
  @page {
    size: A4;
    margin: 0;
  }
  /* '#app' is the default Vite mount point. Change it if yours is different. */
  #app {
    display: none !important;
  }
  .print-only {
    display: block;
  }
  body {
    background: #fff;
  }
}
</style>