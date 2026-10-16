<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import {
  certTypeList,
  certTypes,
  shortDate,
  useCertificates,
  type CertificateRequest,
  type RequestStatus,
} from '@/data/certifications'

// 'queue'   -> /secretary/certifications/requests (everything, grouped by status)
// 'records' -> /secretary/certifications/records  (only issued certificates, grouped by type)
const props = defineProps<{ mode: 'queue' | 'records' }>()

const { items, reject } = useCertificates()

/* --------------------------------- Filters -------------------------------- */
const search = ref('')
const typeFilter = ref('all')
const activeTab = ref('all')

const baseRows = computed(() => (props.mode === 'records' ? items.filter((r) => r.controlNo) : items))

type Tab = { key: string; label: string; test: (r: CertificateRequest) => boolean }

const tabs = computed<Tab[]>(() => {
  const all: Tab = { key: 'all', label: 'All', test: () => true }

  if (props.mode === 'records') {
    return [
      all,
      ...certTypeList.map((t) => ({ key: t.key, label: t.title, test: (r: CertificateRequest) => r.type === t.key })),
    ]
  }

  const statuses: RequestStatus[] = ['Pending', 'Approved', 'Released', 'Rejected']
  return [
    all,
    ...statuses.map((s) => ({ key: s, label: s, test: (r: CertificateRequest) => r.status === s })),
  ]
})

// const tabs = computed(() => {
//   if (props.mode === 'records') {
//     return [
//       { key: 'all', label: 'All', test: (r: CertificateRequest) => true },
//       ...certTypeList.map((t) => ({ key: t.key, label: t.title, test: (r: CertificateRequest) => r.type === t.key })),
//     ]
//   }
//   const statuses: RequestStatus[] = ['Pending', 'Approved', 'Released', 'Rejected']
//   return [
//     { key: 'all', label: 'All', test: (r: CertificateRequest) => true },
//     ...statuses.map((s) => ({ key: s, label: s, test: (r: CertificateRequest) => r.status === s })),
//   ]
// })

const typeOptions = [
  { value: 'all', label: 'All certificates' },
  ...certTypeList.map((t) => ({ value: t.key, label: t.title })),
]

// Search + type filter first, so each tab can show how many rows it would give.
const searched = computed(() => {
  const q = search.value.trim().toLowerCase()
  return baseRows.value.filter(
    (r) =>
      (typeFilter.value === 'all' || r.type === typeFilter.value) &&
      (!q || `${r.resident.name} ${r.resident.id} ${r.id} ${r.controlNo ?? ''} ${r.purpose}`.toLowerCase().includes(q)),
  )
})

const tabCounts = computed(() => Object.fromEntries(tabs.value.map((t) => [t.key, searched.value.filter(t.test).length])))

const rows = computed(() => {
  const test = tabs.value.find((t) => t.key === activeTab.value)?.test ?? (() => true)
  return searched.value
    .filter(test)
    .slice()
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
})

watch(
  () => props.mode,
  () => {
    activeTab.value = 'all'
    typeFilter.value = 'all'
    search.value = ''
  },
)

const hasActiveFilters = computed(() => search.value.trim() !== '' || typeFilter.value !== 'all')
function clearFilters() {
  search.value = ''
  typeFilter.value = 'all'
}

const statusDot: Record<RequestStatus, string> = {
  Pending: 'bg-amber-500',
  Approved: 'bg-sky-500',
  Released: 'bg-emerald-500',
  Rejected: 'bg-red-500',
}

/* ------------------------------ Reject dialog ------------------------------ */
const rejecting = ref<CertificateRequest | null>(null)
const reason = ref('')
const reasonInput = ref<HTMLTextAreaElement | null>(null)

async function openReject(r: CertificateRequest) {
  rejecting.value = r
  reason.value = ''
  await nextTick()
  reasonInput.value?.focus()
}

function confirmReject() {
  if (!rejecting.value || !reason.value.trim()) return
  reject(rejecting.value.id, reason.value.trim())
  rejecting.value = null
}

const pendingCount = computed(() => items.filter((r) => r.status === 'Pending').length)
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
          {{ mode === 'queue' ? 'Certificate requests' : 'Issued records' }}
        </h1>
        <p class="mt-0.5 text-[13px] text-slate-500">
          <template v-if="mode === 'queue'">
            {{ pendingCount }} {{ pendingCount === 1 ? 'request is' : 'requests are' }} waiting for review
          </template>
          <template v-else>Every certificate that has been issued, with its control number</template>
        </p>
      </div>

      <RouterLink
        to="/secretary/certifications/clearance"
        class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="plus" :size="16" :stroke-width="2.25" />
        Issue certificate
      </RouterLink>
    </div>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <!-- Tabs -->
      <div class="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          :aria-pressed="activeTab === t.key"
          :class="[
            'relative flex shrink-0 items-center gap-2 px-3 py-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bis-600',
            activeTab === t.key ? 'text-bis-700' : 'text-slate-500 hover:text-slate-900',
          ]"
          @click="activeTab = t.key"
        >
          {{ t.label }}
          <span
            :class="[
              'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
              activeTab === t.key ? 'bg-bis-50 text-bis-700' : 'bg-slate-100 text-slate-500',
            ]"
          >
            {{ tabCounts[t.key] }}
          </span>
          <span v-if="activeTab === t.key" class="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-bis-600" />
        </button>
      </div>

      <!-- Search + filters -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3">
        <div class="relative min-w-[14rem] flex-1">
          <label for="request-search" class="sr-only">Search certificates</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="request-search"
            v-model="search"
            type="search"
            placeholder="Search resident, control no. or purpose"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-if="mode === 'queue'" v-model="typeFilter" label="Filter by certificate" :options="typeOptions" />
        <button
          v-if="hasActiveFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-bis-600 transition-colors hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
          @click="clearFilters"
        >
          <BisIcon name="x" :size="14" :stroke-width="2.25" />
          Clear filters
        </button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[44rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" class="py-2.5 pl-4 pr-3">Resident</th>
              <th scope="col" class="px-3 py-2.5">Certificate</th>
              <th scope="col" class="hidden px-3 py-2.5 lg:table-cell">Purpose</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Date</th>
              <th scope="col" class="px-3 py-2.5">Status</th>
              <th scope="col" class="py-2.5 pl-3 pr-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              <td class="py-2.5 pl-4 pr-3">
                <p class="max-w-[16rem] truncate font-medium text-slate-900">{{ r.resident.name }}</p>
                <p class="text-[12px] tabular-nums text-slate-400">{{ r.resident.id }}</p>
              </td>

              <td class="px-3 py-2.5">
                <p class="text-slate-700">{{ certTypes[r.type].title }}</p>
                <p class="text-[12px] tabular-nums text-slate-400">{{ r.controlNo ?? r.id }}</p>
              </td>

              <td class="hidden px-3 py-2.5 text-slate-700 lg:table-cell">{{ r.purpose }}</td>

              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 md:table-cell">
                {{ shortDate(r.requestedAt) }}
                <p class="text-[12px] text-slate-400">{{ r.source }}</p>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-slate-700">
                  <span :class="['size-1.5 rounded-full', statusDot[r.status]]" />
                  {{ r.status }}
                </span>
                <p v-if="r.status === 'Rejected' && r.rejectReason" class="max-w-[14rem] truncate text-[12px] text-slate-400" :title="r.rejectReason">
                  {{ r.rejectReason }}
                </p>
              </td>

              <td class="whitespace-nowrap py-2.5 pl-3 pr-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <template v-if="r.status === 'Pending'">
                    <RouterLink
                      :to="{ path: `/secretary/certifications/${r.type}`, query: { request: r.id } }"
                      class="inline-flex h-8 items-center rounded-lg bg-bis-600 px-3 text-[12px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                    >
                      Review
                    </RouterLink>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center rounded-lg px-3 text-[12px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
                      @click="openReject(r)"
                    >
                      Reject
                    </button>
                  </template>
                  <RouterLink
                    v-else-if="r.status !== 'Rejected'"
                    :to="`/secretary/certifications/print/${r.id}`"
                    class="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  >
                    {{ r.status === 'Approved' ? 'Print' : 'Reprint' }}
                  </RouterLink>
                  <span v-else class="px-3 text-slate-300">—</span>
                </div>
              </td>
            </tr>

            <tr v-if="!rows.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">
                  {{ hasActiveFilters ? 'No certificates match these filters' : 'Nothing here yet' }}
                </p>
                <p class="mt-0.5 text-[13px] text-slate-500">
                  {{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'New requests and issued certificates will show up in this list.' }}
                </p>
                <button
                  v-if="hasActiveFilters"
                  type="button"
                  class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  @click="clearFilters"
                >
                  Clear filters
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Reject dialog -->
    <div v-if="rejecting" class="fixed inset-0 z-[60] grid place-items-center p-4" @keydown.esc="rejecting = null">
      <div class="absolute inset-0 bg-slate-900/30" aria-hidden="true" @click="rejecting = null" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        class="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id="reject-title" class="text-[16px] font-medium text-bis-900">Reject this request?</h2>
        <p class="mt-1 text-[13px] text-slate-500">
          {{ rejecting.resident.name }} asked for a {{ certTypes[rejecting.type].title.toLowerCase() }}. They will see your reason.
        </p>
        <label for="reject-reason" class="mt-4 block text-[12px] font-medium text-slate-600">Reason</label>
        <textarea
          id="reject-reason"
          ref="reasonInput"
          v-model="reason"
          rows="3"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          placeholder="For example: unsettled blotter record, please see the Punong Barangay."
        />
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="rejecting = null"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!reason.trim()"
            class="inline-flex h-9 items-center rounded-lg bg-red-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            @click="confirmReject"
          >
            Reject request
          </button>
        </div>
      </div>
    </div>
  </div>
</template>