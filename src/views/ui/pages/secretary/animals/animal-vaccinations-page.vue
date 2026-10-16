<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import VaccinationDialog from '@/components/layout/secretary/animal-vaccination-dialog.vue'
import { formatDate, speciesByKey, speciesList, useAnimals, vaccDot, type VaccStatus } from '@/data/animals'

const route = useRoute()
const router = useRouter()
const { rows, vaccinations } = useAnimals()

/* --------------------------------- Filters -------------------------------- */
type TabKey = 'needs' | 'history'
const activeTab = ref<TabKey>('needs')
const search = ref('')
const species = ref('all')
const statusFilter = ref('all')

const NEEDS: VaccStatus[] = ['Overdue', 'Partial', 'Due soon', 'Not vaccinated']
const rank: Record<VaccStatus, number> = { Overdue: 0, Partial: 1, 'Due soon': 2, 'Not vaccinated': 3, 'Up to date': 4 }

const speciesOptions = [{ value: 'all', label: 'All species' }, ...speciesList.map((s) => ({ value: s.key, label: s.key }))]
const statusOptions = [{ value: 'all', label: 'Any status' }, ...NEEDS.map((v) => ({ value: v, label: v }))]

const hasActiveFilters = computed(
  () => search.value.trim() !== '' || species.value !== 'all' || (activeTab.value === 'needs' && statusFilter.value !== 'all'),
)
function clearFilters() {
  search.value = ''
  species.value = 'all'
  statusFilter.value = 'all'
}

/*
 * Needs vaccination: active animals that have an owner and a species with a vaccine schedule.
 * Strays and "other" species are left out so the list only holds animals you can act on.
 */
const needsPool = computed(() =>
  rows.value.filter(
    (r) =>
      r.status === 'Active' &&
      r.ownerType !== 'Stray' &&
      (speciesByKey[r.species]?.vaccines.length ?? 0) > 0 &&
      NEEDS.includes(r.vaccStatus),
  ),
)

function matchesBasics(haystack: string) {
  const q = search.value.trim().toLowerCase()
  return !q || haystack.includes(q)
}

const needsBase = computed(() => needsPool.value.filter((r) => matchesBasics(r.haystack) && (species.value === 'all' || r.species === species.value)))

const needsRows = computed(() =>
  needsBase.value
    .filter((r) => statusFilter.value === 'all' || r.vaccStatus === statusFilter.value)
    .slice()
    .sort((a, b) => rank[a.vaccStatus] - rank[b.vaccStatus] || (a.nextDueAt ?? '').localeCompare(b.nextDueAt ?? '')),
)

const rowById = computed(() => new Map(rows.value.map((r) => [r.id, r])))

const historyRows = computed(() =>
  vaccinations.value
    .map((v) => ({ v, animal: rowById.value.get(v.animalId) }))
    .filter(
      ({ v, animal }) =>
        matchesBasics(`${animal?.haystack ?? v.animalId.toLowerCase()} ${v.vaccine.toLowerCase()} ${v.administeredBy.toLowerCase()}`) &&
        (species.value === 'all' || animal?.species === species.value),
    ),
)

const summary = computed(() =>
  NEEDS.map((s) => ({ status: s, n: needsPool.value.filter((r) => r.vaccStatus === s).length })).filter((x) => x.n > 0),
)

/* ------------------------------- Pagination ------------------------------- */
const pageSize = 10
const page = ref(1)
const currentLength = computed(() => (activeTab.value === 'needs' ? needsRows.value.length : historyRows.value.length))
const totalPages = computed(() => Math.max(1, Math.ceil(currentLength.value / pageSize)))
const from = computed(() => (page.value - 1) * pageSize)
const needsPage = computed(() => needsRows.value.slice(from.value, from.value + pageSize))
const historyPage = computed(() => historyRows.value.slice(from.value, from.value + pageSize))
const rangeFrom = computed(() => (currentLength.value ? from.value + 1 : 0))
const rangeTo = computed(() => Math.min(currentLength.value, from.value + pageSize))

watch([search, species, statusFilter, activeTab], () => {
  page.value = 1
})

/* ---------------------------------- Dialog --------------------------------- */
const dialogOpen = ref(false)
const dialogAnimalId = ref<string | null>(null)
const notice = ref('')

function openDialog(animalId: string | null = null) {
  dialogAnimalId.value = animalId
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
  // Drop ?animal= so refreshing the page doesn't reopen the dialog.
  if (route.query.animal) router.replace({ query: {} })
}

// The animal drawer links here with ?animal=AN-0001.
onMounted(() => {
  if (typeof route.query.animal === 'string') openDialog(route.query.animal)
})

const statusClass: Record<VaccStatus, string> = {
  Overdue: 'text-red-700',
  Partial: 'text-slate-700',
  'Due soon': 'text-slate-700',
  'Not vaccinated': 'text-slate-700',
  'Up to date': 'text-slate-700',
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Vaccinations</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">
          <template v-if="summary.length">
            <template v-for="(s, i) in summary" :key="s.status">
              <span v-if="i > 0"> · </span>
              <span :class="s.status === 'Overdue' ? 'font-medium text-red-700' : ''"><span class="tabular-nums">{{ s.n }}</span> {{ s.status.toLowerCase() }}</span>
            </template>
          </template>
          <template v-else>Every registered animal is up to date</template>
        </p>
      </div>

      <div class="flex items-center gap-2">
        <RouterLink
          to="/secretary/animals/vaccinations/drive"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          Vaccination drive
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="openDialog()"
        >
          <BisIcon name="plus" :size="16" :stroke-width="2.25" />
          Record vaccination
        </button>
      </div>
    </div>

    <p v-if="notice" role="status" class="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-800">
      {{ notice }}
      <button type="button" class="shrink-0 font-medium hover:underline" @click="notice = ''">Dismiss</button>
    </p>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <!-- Tabs -->
      <div class="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
        <button
          v-for="t in [
            { key: 'needs' as TabKey, label: 'Needs vaccination', n: needsBase.length },
            { key: 'history' as TabKey, label: 'History', n: historyRows.length },
          ]"
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
          <span :class="['rounded-md px-1.5 py-0.5 text-[11px] tabular-nums', activeTab === t.key ? 'bg-bis-50 text-bis-700' : 'bg-slate-100 text-slate-500']">{{ t.n }}</span>
          <span v-if="activeTab === t.key" class="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-bis-600" />
        </button>
      </div>

      <!-- Search + filters -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3">
        <div class="relative min-w-[14rem] flex-1">
          <label for="vx-search" class="sr-only">Search vaccinations</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="vx-search"
            v-model="search"
            type="search"
            placeholder="Search animal, owner or vaccine"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="species" label="Filter by species" :options="speciesOptions" />
        <FilterSelect v-if="activeTab === 'needs'" v-model="statusFilter" label="Filter by status" :options="statusOptions" />
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

      <!-- Needs vaccination -->
      <div v-if="activeTab === 'needs'" class="overflow-x-auto">
        <table class="w-full min-w-[44rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" class="py-2.5 pl-4 pr-3">Animal</th>
              <th scope="col" class="px-3 py-2.5">Owner</th>
              <th scope="col" class="px-3 py-2.5">Status</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Last vaccinated</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Next due</th>
              <th scope="col" class="py-2.5 pl-3 pr-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in needsPage" :key="r.id" class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              <td class="py-2.5 pl-4 pr-3">
                <p class="max-w-[14rem] truncate font-medium text-slate-900">{{ r.title }}</p>
                <p class="text-[12px] text-slate-400">{{ r.subtitle }} · <span class="tabular-nums">{{ r.id }}</span></p>
              </td>
              <td class="px-3 py-2.5">
                <p class="max-w-[13rem] truncate text-slate-700">{{ r.ownerLabel }}</p>
                <p class="max-w-[13rem] truncate text-[12px] text-slate-400">{{ r.ownerPlace }}</p>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5">
                <span :class="['inline-flex items-center gap-1.5', statusClass[r.vaccStatus]]">
                  <span :class="['size-1.5 rounded-full', vaccDot[r.vaccStatus]]" />
                  {{ r.vaccStatus }}
                </span>
              </td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 md:table-cell">{{ r.lastVaccinatedAt ? formatDate(r.lastVaccinatedAt) : '—' }}</td>
              <td :class="['hidden whitespace-nowrap px-3 py-2.5 md:table-cell', r.vaccStatus === 'Overdue' ? 'font-medium text-red-700' : 'text-slate-700']">
                {{ r.nextDueAt ? formatDate(r.nextDueAt) : '—' }}
              </td>
              <td class="whitespace-nowrap py-2.5 pl-3 pr-4 text-right">
                <button
                  type="button"
                  class="inline-flex h-8 items-center rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  @click="openDialog(r.id)"
                >
                  Record
                </button>
              </td>
            </tr>

            <tr v-if="!needsPage.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">{{ hasActiveFilters ? 'No animals match these filters' : 'Nothing is due' }}</p>
                <p class="mt-0.5 text-[13px] text-slate-500">
                  {{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'Animals that are overdue, due soon, or not yet vaccinated will show up here.' }}
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

      <!-- History -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[44rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" class="py-2.5 pl-4 pr-3">Date</th>
              <th scope="col" class="px-3 py-2.5">Animal</th>
              <th scope="col" class="px-3 py-2.5">Vaccine</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Given</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Next due</th>
              <th scope="col" class="px-3 py-2.5 pr-4">Administered by</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="{ v, animal } in historyPage" :key="v.id" class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
              <td class="whitespace-nowrap py-2.5 pl-4 pr-3 text-slate-700">{{ formatDate(v.date) }}</td>
              <td class="px-3 py-2.5">
                <p class="max-w-[14rem] truncate font-medium text-slate-900">{{ animal?.title ?? 'Removed record' }}</p>
                <p class="text-[12px] text-slate-400"><span class="tabular-nums">{{ v.animalId }}</span><template v-if="animal"> · {{ animal.ownerLabel }}</template></p>
              </td>
              <td class="px-3 py-2.5 text-slate-700">{{ v.vaccine }}</td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700 md:table-cell">
                {{ v.count }}<template v-if="animal && animal.count > 1"> of {{ animal.count }}</template>
              </td>
              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 md:table-cell">{{ v.nextDue ? formatDate(v.nextDue) : '—' }}</td>
              <td class="px-3 py-2.5 pr-4 text-slate-700">{{ v.administeredBy }}</td>
            </tr>

            <tr v-if="!historyPage.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">{{ hasActiveFilters ? 'No vaccinations match these filters' : 'No vaccinations recorded yet' }}</p>
                <p class="mt-0.5 text-[13px] text-slate-500">{{ hasActiveFilters ? 'Check the spelling, or widen the filters.' : 'Recorded vaccinations will show up here.' }}</p>
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
          <span class="font-medium tabular-nums text-slate-700">{{ currentLength }}</span>
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

    <VaccinationDialog :open="dialogOpen" :animal-id="dialogAnimalId" @close="closeDialog" @saved="notice = $event" />
  </div>
</template>