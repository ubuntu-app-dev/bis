<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import CertificatePaper from '@/components/layout/secretary/certificate-paper.vue'
import { certTypes, useCertificates } from '@/data/certifications'

const route = useRoute()
const { getById, release } = useCertificates()

const request = computed(() => getById(String(route.params.id)))
// Only issued certificates have a control number; pending/rejected ones cannot be printed.
const printable = computed(() => (request.value?.controlNo ? request.value : null))

function print() {
  window.print()
}
</script>

<template>
  <div class="space-y-6">
    <template v-if="printable">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <RouterLink
            to="/secretary/certifications/records"
            class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            <BisIcon name="chevronLeft" :size="14" />
            Back to records
          </RouterLink>
          <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
            {{ certTypes[printable.type].title }}
          </h1>
          <p class="mt-0.5 text-[13px] text-slate-500">
            <span class="tabular-nums">{{ printable.controlNo }}</span> · {{ printable.resident.name }} ·
            {{ printable.status === 'Released' ? 'Already released' : 'Ready to print' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="printable.status === 'Approved'"
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="release(printable.id)"
          >
            Mark as released
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="print"
          >
            <BisIcon name="download" :size="16" />
            Print certificate
          </button>
        </div>
      </div>

      <!-- On-screen preview. Scrolls sideways on small screens instead of shrinking the sheet. -->
      <div class="overflow-x-auto rounded-xl bg-slate-100 p-4 sm:p-8">
        <CertificatePaper :request="printable" />
      </div>

      <!--
        A second copy goes straight into <body>. When printing, #app is hidden and only this copy shows,
        so the sidebar, header and page chrome can never leak onto the paper or create blank pages.
      -->
      <Teleport to="body">
        <div class="print-only"><CertificatePaper :request="printable" /></div>
      </Teleport>
    </template>

    <div v-else class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <BisIcon name="search" :size="20" />
      </div>
      <p class="mt-3 text-[14px] font-medium text-bis-900">This certificate can’t be printed</p>
      <p class="mt-0.5 text-[13px] text-slate-500">
        It was not found, or it has not been issued yet. Review the request first.
      </p>
      <RouterLink
        to="/secretary/certifications/requests"
        class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Go to requests
      </RouterLink>
    </div>
  </div>
</template>

<!-- Not scoped on purpose: the teleported copy lives outside this component's DOM. -->
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