<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import BiteDrawer from '@/components/layout/secretary/bite-drawer.vue'
import { formatDate, speciesList } from '@/data/animals'
import { biteCategories, categoryChip, observationDot, useBites, type BiteRow } from '@/data/bites'

const { rows: allRows } = useBites()

/* --------------------------------- Filters -------------------------------- */
type Tab = { key: string; label: string; test: (r: BiteRow) => boolean }
const tabs: Tab[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'open', label: 'Open', test: (r) => r.status === 'Open' },
  { key: 'observing', label: 'Under observation', test: (r) => r.observationState === 'Under observation' && r.status === 'Open' },
  { key: 'update', label: 'Needs update', test: (r) => r.observationState === 'Needs update' && r.status === 'Open' },
  { key: 'closed', label: 'Closed', test: (r) => r.status === 'Closed' },
]

const search = ref('')
const category = ref('all')
const species = ref('all')
const activeTab = ref('all')

const categoryOptions = [{ value: 'all', label: 'Any category' }, ...biteCategories.map((c) => ({ value: c.key, label: c.label }))]
const speciesOptions = [{ value: 'all', label: 'All species' }, ...speciesList.map((s) => ({ value: s.key, label: s.key }))]

const hasActiveFilters = computed(
  () => search.value.trim() !== '' || category.value !== 'all' || species.value !== 'all' || activeTab.value !== 'all',
)

function clearFilters() {
  search.value = ''
  category.value = 'all'
  species.value = 'all'
  activeTab.value = 'all'
}

// Everything except the tabs, so each tab can show how many cases it would give.
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return allRows.value.filter(
    (r) =>
      (!q || r.haystack.includes(q)) &&
      (category.value === 'all' || r.category === category.value) &&
      (species.value === 'all' || r.species === species.value),
  )
})

const tabCounts = computed(() => Object.fromEntries(tabs.map((t) => [t.key, baseFiltered.value.filter(t.test).length])))

const filtered = computed(() => {
  const test = tabs.find((t) => t.key === activeTab.value)?.test ?? (() => true)
  return baseFiltered.value
    .filter(test)
    .slice()
    .sort((a, b) => b.incidentDate.localeCompare(a.incidentDate))
})

const openCount = computed(() => allRows.value.filter((r) => r.status === 'Open').length)
const needsUpdateCount = computed(() => allRows.value.filter((r) => r.status === 'Open' && r.observationState === 'Needs update').length)

/* ------------------------------- Pagination ------------------------------- */
const pageSize = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const rangeFrom = computed(() => (filtered.value.length ? (page.value - 1) * pageSize + 1 : 0))
const rangeTo = computed(() => Math.min(filtered.value.length, page.value * pageSize))

watch([search, category, species, activeTab], () => {
  page.value = 1
})

/* --------------------------------- Drawer --------------------------------- */
const activeId = ref<string | null>(null)
const activeRow = computed(() => allRows.value.find((r) => r.id === activeId.value) ?? null)
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Bite incidents</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">
          <span class="tabular-nums">{{ openCount }}</span> open {{ openCount === 1 ? 'case' : 'cases' }} ·
          <span :class="needsUpdateCount ? 'font-medium text-red-700' : ''">
            <span class="tabular-nums">{{ needsUpdateCount }}</span> {{ needsUpdateCount === 1 ? 'needs' : 'need' }} an observation update
          </span>
        </p>
      </div>

      <RouterLink
        to="/secretary/animals/bites/new"
        class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="plus" :size="16" :stroke-width="2.25" />
        Report bite incident
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
              activeTab === t.key ? 'bg-bis-50 text-bis-700' : t.key === 'update' && tabCounts[t.key] ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500',
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
          <label for="bite-search" class="sr-only">Search bite incidents</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="bite-search"
            v-model="search"
            type="search"
            placeholder="Search victim, animal, place or case no."
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="category" label="Filter by category" :options="categoryOptions" />
        <FilterSelect v-model="species" label="Filter by species" :options="speciesOptions" />
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
              <th scope="col" class="py-2.5 pl-4 pr-3">Victim</th>
              <th scope="col" class="px-3 py-2.5">Animal</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Date</th>
              <th scope="col" class="px-3 py-2.5">Category</th>
              <th scope="col" class="px-3 py-2.5">Observation</th>
              <th scope="col" class="px-3 py-2.5 pr-4">Case</th>
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
                  {{ row.victim.name }}
                </button>
                <p class="text-[12px] text-slate-400">
                  <span class="tabular-nums">{{ row.id }}</span><template v-if="row.victim.age !== undefined"> · {{ row.victim.age }} yrs</template>
                </p>
              </td>

              <td class="px-3 py-2.5">
                <p class="max-w-[13rem] truncate text-slate-700">{{ row.animalLabel }}</p>
                <p class="text-[12px] text-slate-400">{{ row.animalKind === 'Registered' ? 'In registry' : 'Not in registry' }}</p>
              </td>

              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 md:table-cell">{{ formatDate(row.incidentDate) }}</td>

              <td class="px-3 py-2.5">
                <span :class="['rounded-md px-1.5 py-0.5 text-[11px] font-medium', categoryChip[row.category]]">{{ row.category }}</span>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5">
                <span :class="['inline-flex items-center gap-1.5', row.observationState === 'Needs update' ? 'font-medium text-red-700' : 'text-slate-700']">
                  <span :class="['size-1.5 rounded-full', observationDot[row.observationState]]" />
                  {{ row.observationLabel }}
                </span>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5 pr-4 text-slate-700">{{ row.status }}</td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">
                  {{ hasActiveFilters ? 'No incidents match these filters' : 'No bite incidents reported' }}
                </p>
                <p class="mt-0.5 text-[13px] text-slate-500">
                  {{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'Reported cases will show up here.' }}
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
          incidents
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

    <BiteDrawer :row="activeRow" @close="activeId = null" />
  </div>
</template>