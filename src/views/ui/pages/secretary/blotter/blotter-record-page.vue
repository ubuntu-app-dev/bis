<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import BlotterDrawer from '@/components/layout/secretary/blotter/blotter-drawer.vue'
import { formatDate } from '@/data/animals'
import { CLOSED_STATUSES, OPEN_STATUSES, blotterStatusDot, incidentTypes, useBlotter, type BlotterRow } from '@/data/blotter'

const { rows: allRows } = useBlotter()

/* --------------------------------- Filters -------------------------------- */
type Tab = { key: string; label: string; test: (r: BlotterRow) => boolean }
const tabs: Tab[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'open', label: 'Open', test: (r) => OPEN_STATUSES.includes(r.status) },
  {
    key: 'deadline',
    label: 'Deadline near',
    test: (r) => r.status !== 'Settled' && (r.deadline?.state === 'Due soon' || r.deadline?.state === 'Overdue'),
  },
  { key: 'settled', label: 'Settled', test: (r) => r.status === 'Settled' },
  { key: 'closed', label: 'Closed', test: (r) => CLOSED_STATUSES.includes(r.status) },
]

const search = ref('')
const type = ref('all')
const activeTab = ref('all')

const typeOptions = [{ value: 'all', label: 'All incident types' }, ...incidentTypes.map((t) => ({ value: t, label: t }))]

const hasActiveFilters = computed(() => search.value.trim() !== '' || type.value !== 'all' || activeTab.value !== 'all')

function clearFilters() {
  search.value = ''
  type.value = 'all'
  activeTab.value = 'all'
}

// Everything except the tabs, so each tab can show how many entries it would give.
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allRows.value.filter((r) => (!q || r.haystack.includes(q)) && (type.value === 'all' || r.incidentType === type.value))
})

const tabCounts = computed(() => Object.fromEntries(tabs.map((t) => [t.key, baseFiltered.value.filter(t.test).length])))

const filtered = computed(() => {
  const test = tabs.find((t) => t.key === activeTab.value)?.test ?? (() => true)
  return baseFiltered.value
    .filter(test)
    .slice()
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt) || b.id.localeCompare(a.id))
})

const openCount = computed(() => allRows.value.filter((r) => OPEN_STATUSES.includes(r.status)).length)
const overdueCount = computed(() => allRows.value.filter((r) => r.status !== 'Settled' && r.deadline?.state === 'Overdue').length)

/* ------------------------------- Pagination ------------------------------- */
const pageSize = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const rangeFrom = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const rangeTo = computed(() => Math.min(filtered.value.length, page.value * pageSize))

watch([search, type, activeTab], () => {
  page.value = 1
})

/* --------------------------------- Drawer --------------------------------- */
const activeId = ref<string | null>(null)
const activeRow = computed(() => allRows.value.find((r) => r.id === activeId.value) ?? null)

function deadlineClass(r: BlotterRow) {
  if (r.status === 'Settled') return 'text-slate-500'
  if (r.deadline?.state === 'Overdue') return 'font-medium text-red-700'
  if (r.deadline?.state === 'Due soon') return 'font-medium text-amber-700'
  return 'text-slate-700'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Blotter records</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">
          <span class="tabular-nums">{{ openCount }}</span> open {{ openCount === 1 ? 'entry' : 'entries' }} ·
          <span :class="overdueCount ? 'font-medium text-red-700' : ''">
            <span class="tabular-nums">{{ overdueCount }}</span> past {{ overdueCount === 1 ? 'its' : 'their' }} deadline
          </span>
        </p>
      </div>

      <RouterLink
        to="/secretary/cases/blotter/new"
        class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="plus" :size="16" :stroke-width="2.25" />
        New blotter entry
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
              activeTab === t.key ? 'bg-bis-50 text-bis-700' : t.key === 'deadline' && tabCounts[t.key] ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500',
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
          <label for="blotter-search" class="sr-only">Search blotter</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="blotter-search"
            v-model="search"
            type="search"
            placeholder="Search name, entry no., place or incident"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="type" label="Filter by incident type" :options="typeOptions" />
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

      <!-- Table. People under 18 appear as initials here; the drawer shows full names. -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[46rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" class="py-2.5 pl-4 pr-3">Entry</th>
              <th scope="col" class="px-3 py-2.5">Complainant</th>
              <th scope="col" class="px-3 py-2.5">Respondent</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Reported</th>
              <th scope="col" class="px-3 py-2.5">Status</th>
              <th scope="col" class="px-3 py-2.5 pr-4">Deadline</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in pageRows"
              :key="row.id"
              class="cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50"
              @click="activeId = row.id"
            >
              <td class="py-2.5 pl-4 pr-3">
                <button
                  type="button"
                  class="block max-w-[14rem] truncate text-left font-medium text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click.stop="activeId = row.id"
                >
                  {{ row.incidentType }}
                </button>
                <p class="text-[12px] text-slate-400">
                  <span class="tabular-nums">{{ row.id }}</span>
                  <span v-if="row.hasMinor" class="ml-1.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Minor involved</span>
                </p>
              </td>

              <td class="px-3 py-2.5"><p class="max-w-[13rem] truncate text-slate-700">{{ row.complainantLabel }}</p></td>
              <td class="px-3 py-2.5"><p class="max-w-[13rem] truncate text-slate-700">{{ row.respondentLabel }}</p></td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 md:table-cell">{{ formatDate(row.reportedAt) }}</td>

              <td class="whitespace-nowrap px-3 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-slate-700">
                  <span :class="['size-1.5 rounded-full', blotterStatusDot[row.status]]" />
                  {{ row.status }}
                </span>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5 pr-4">
                <span v-if="row.deadline" :class="deadlineClass(row)">{{ row.deadline.text }}</span>
                <span v-else class="text-slate-300">—</span>
              </td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">
                  {{ hasActiveFilters ? 'No entries match these filters' : 'The blotter is empty' }}
                </p>
                <p class="mt-0.5 text-[13px] text-slate-500">
                  {{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'New blotter entries will show up here.' }}
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

      <!-- Pagination -->
      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
        <p class="text-[12px] text-slate-500">
          Showing
          <span class="font-medium tabular-nums text-slate-700">{{ rangeFrom }}–{{ rangeTo }}</span>
          of
          <span class="font-medium tabular-nums text-slate-700">{{ filtered.length }}</span>
          entries
        </p>

        <nav class="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            :disabled="page === 1"
            @click="page--"
          >
            <BisIcon name="chevronLeft" :size="16" />
            <span class="sr-only">Previous page</span>
          </button>
          <span class="px-2 text-[12px] tabular-nums text-slate-600">Page {{ page }} of {{ totalPages }}</span>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            :disabled="page === totalPages"
            @click="page++"
          >
            <BisIcon name="chevronRight" :size="16" />
            <span class="sr-only">Next page</span>
          </button>
        </nav>
      </footer>
    </section>

    <BlotterDrawer :row="activeRow" @close="activeId = null" />
  </div>
</template>
