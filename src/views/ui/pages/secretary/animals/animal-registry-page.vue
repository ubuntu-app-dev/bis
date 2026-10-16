<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import AnimalDrawer from '@/components/layout/secretary/animal-drawer.vue'
import { animalStatusDot, speciesList, useAnimals, vaccDot, type AnimalRow, type VaccStatus } from '@/data/animals'

const { rows: allRows } = useAnimals()

/* --------------------------------- Filters -------------------------------- */
// The three group tabs don't overlap: a stray dog is under Strays, not under Pets.
type Tab = { key: string; label: string; test: (r: AnimalRow) => boolean }
const tabs: Tab[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'pet', label: 'Pets', test: (r) => r.category === 'Pet' && r.ownerType !== 'Stray' },
  { key: 'livestock', label: 'Livestock', test: (r) => r.category === 'Livestock' && r.ownerType !== 'Stray' },
  { key: 'stray', label: 'Strays', test: (r) => r.ownerType === 'Stray' },
]

const DEFAULT_STATUS = 'Active'

const search = ref('')
const species = ref('all')
const vacc = ref('all')
const status = ref(DEFAULT_STATUS)
const activeTab = ref('all')

const speciesOptions = [{ value: 'all', label: 'All species' }, ...speciesList.map((s) => ({ value: s.key, label: s.key }))]
const vaccStatuses: VaccStatus[] = ['Up to date', 'Due soon', 'Overdue', 'Partial', 'Not vaccinated']
const vaccOptions = [{ value: 'all', label: 'Any vaccination' }, ...vaccStatuses.map((v) => ({ value: v, label: v }))]
const statusOptions = [
  { value: 'all', label: 'Any status' },
  ...['Active', 'Transferred', 'Missing', 'Deceased'].map((v) => ({ value: v, label: v })),
]

const hasActiveFilters = computed(
  () =>
    search.value.trim() !== '' ||
    species.value !== 'all' ||
    vacc.value !== 'all' ||
    status.value !== DEFAULT_STATUS ||
    activeTab.value !== 'all',
)

function clearFilters() {
  search.value = ''
  species.value = 'all'
  vacc.value = 'all'
  status.value = DEFAULT_STATUS
  activeTab.value = 'all'
}

// Everything except the tabs, so each tab can show how many records it would give.
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allRows.value.filter(
    (r) =>
      (!q || r.haystack.includes(q)) &&
      (species.value === 'all' || r.species === species.value) &&
      (vacc.value === 'all' || r.vaccStatus === vacc.value) &&
      (status.value === 'all' || r.status === status.value),
  )
})

const tabCounts = computed(() => Object.fromEntries(tabs.map((t) => [t.key, baseFiltered.value.filter(t.test).length])))

const filtered = computed(() => {
  const test = tabs.find((t) => t.key === activeTab.value)?.test ?? (() => true)
  return baseFiltered.value.filter(test)
})

/* One-line summary for the page header (active animals only) */
const activeRows = computed(() => allRows.value.filter((r) => r.status === 'Active'))
const totalHeads = computed(() => activeRows.value.reduce((sum, r) => sum + r.count, 0))
const overdueCount = computed(() => activeRows.value.filter((r) => r.vaccStatus === 'Overdue').length)

/* ------------------------------- Pagination ------------------------------- */
const pageSize = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const rangeFrom = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const rangeTo = computed(() => Math.min(filtered.value.length, page.value * pageSize))

watch([search, species, vacc, status, activeTab], () => {
  page.value = 1
})

/* --------------------------------- Drawer --------------------------------- */
// /secretary/animals/registry?open=AN-0001 opens that record (used by links from other pages).
const route = useRoute()
const activeId = ref<string | null>(typeof route.query.open === 'string' ? route.query.open : null)
const activeRow = computed(() => allRows.value.find((r) => r.id === activeId.value) ?? null)
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Animal registry</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">
          <span class="tabular-nums">{{ activeRows.length }}</span> records ·
          <span class="tabular-nums">{{ totalHeads }}</span> animals ·
          <span :class="overdueCount ? 'font-medium text-red-700' : ''">
            <span class="tabular-nums">{{ overdueCount }}</span> overdue for vaccination
          </span>
        </p>
      </div>

      <RouterLink
        to="/secretary/animals/registry/new"
        class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="plus" :size="16" :stroke-width="2.25" />
        Register animal
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
          <label for="animal-search" class="sr-only">Search animals</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="animal-search"
            v-model="search"
            type="search"
            placeholder="Search name, species, tag no. or owner"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="species" label="Filter by species" :options="speciesOptions" />
        <FilterSelect v-model="vacc" label="Filter by vaccination" :options="vaccOptions" />
        <FilterSelect v-model="status" label="Filter by status" :options="statusOptions" />
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
              <th scope="col" class="py-2.5 pl-4 pr-3">Animal</th>
              <th scope="col" class="px-3 py-2.5">Owner</th>
              <th scope="col" class="px-3 py-2.5">Qty</th>
              <th scope="col" class="hidden px-3 py-2.5 lg:table-cell">Sex</th>
              <th scope="col" class="hidden px-3 py-2.5 lg:table-cell">Age</th>
              <th scope="col" class="px-3 py-2.5">Vaccination</th>
              <th scope="col" class="px-3 py-2.5 pr-4">Status</th>
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
                <div class="flex items-center gap-3">
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-50 text-[12px] font-medium text-bis-700" aria-hidden="true">
                    {{ row.species[0] }}
                  </span>
                  <div class="min-w-0">
                    <button
                      type="button"
                      class="block max-w-[14rem] truncate text-left font-medium text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                      @click.stop="activeId = row.id"
                    >
                      {{ row.title }}
                    </button>
                    <p class="text-[12px] text-slate-400">
                      {{ row.subtitle }} · <span class="tabular-nums">{{ row.id }}</span>
                    </p>
                  </div>
                </div>
              </td>

              <td class="px-3 py-2.5">
                <p :class="['max-w-[13rem] truncate', row.ownerType === 'Stray' ? 'italic text-slate-500' : 'text-slate-700']">{{ row.ownerLabel }}</p>
                <p class="max-w-[13rem] truncate text-[12px] text-slate-400">{{ row.ownerPlace }}</p>
              </td>

              <td class="px-3 py-2.5 tabular-nums text-slate-700">{{ row.count }}</td>
              <td class="hidden px-3 py-2.5 text-slate-700 lg:table-cell">{{ row.sex }}</td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 lg:table-cell">{{ row.ageLabel }}</td>

              <td class="whitespace-nowrap px-3 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-slate-700">
                  <span :class="['size-1.5 rounded-full', vaccDot[row.vaccStatus]]" />
                  {{ row.vaccStatus }}
                </span>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5 pr-4">
                <span class="inline-flex items-center gap-1.5 text-slate-700">
                  <span :class="['size-1.5 rounded-full', animalStatusDot[row.status]]" />
                  {{ row.status }}
                </span>
              </td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">
                  {{ hasActiveFilters ? 'No animals match these filters' : 'No animals registered yet' }}
                </p>
                <p class="mt-0.5 text-[13px] text-slate-500">
                  {{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'Register a pet, a group of livestock, or a stray to get started.' }}
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
          records
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

    <AnimalDrawer :row="activeRow" @close="activeId = null" />
  </div>
</template>