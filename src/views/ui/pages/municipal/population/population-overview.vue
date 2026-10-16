<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

interface BarangayStat {
  id: number
  name: string
  population: number
  households: number
  malePct: number // share of population that is male, 0-1
  sectors: { seniors: number; pwd: number; soloParents: number; fourPs: number; osy: number }
  updatedDaysAgo: number
}

// TODO: replace with API call (e.g. GET /api/municipal/population/overview).
// The API should return aggregated counts only, never individual resident rows.
const barangays: BarangayStat[] = [
  { id: 1, name: 'Alacan', population: 4120, households: 1010, malePct: 0.51, sectors: { seniors: 520, pwd: 96, soloParents: 88, fourPs: 140, osy: 61 }, updatedDaysAgo: 12 },
  { id: 2, name: 'Angio', population: 2860, households: 702, malePct: 0.49, sectors: { seniors: 402, pwd: 71, soloParents: 54, fourPs: 118, osy: 38 }, updatedDaysAgo: 77 },
  { id: 3, name: 'Bolasi', population: 3540, households: 884, malePct: 0.5, sectors: { seniors: 460, pwd: 82, soloParents: 77, fourPs: 131, osy: 49 }, updatedDaysAgo: 18 },
  { id: 4, name: 'Cayanga', population: 5210, households: 1288, malePct: 0.5, sectors: { seniors: 640, pwd: 121, soloParents: 112, fourPs: 176, osy: 83 }, updatedDaysAgo: 40 },
  { id: 5, name: 'Longos', population: 2395, households: 590, malePct: 0.48, sectors: { seniors: 355, pwd: 58, soloParents: 41, fourPs: 99, osy: 30 }, updatedDaysAgo: 109 },
  { id: 6, name: 'Mabilao', population: 6480, households: 1604, malePct: 0.51, sectors: { seniors: 760, pwd: 148, soloParents: 139, fourPs: 205, osy: 102 }, updatedDaysAgo: 2 },
  { id: 7, name: 'Nibaliw Central', population: 3975, households: 981, malePct: 0.49, sectors: { seniors: 518, pwd: 90, soloParents: 84, fourPs: 150, osy: 57 }, updatedDaysAgo: 157 },
  { id: 8, name: 'Rabon', population: 1830, households: 451, malePct: 0.5, sectors: { seniors: 262, pwd: 44, soloParents: 33, fourPs: 72, osy: 25 }, updatedDaysAgo: 95 },
]

// Mock age distribution (both sexes, relative weights). Replace with real age-sex counts from the API.
const ageGroups = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75+']
const ageWeights = [8, 8.5, 8.5, 9, 8.5, 8, 7.5, 7, 6.5, 5.5, 5, 4.5, 4, 3, 2.2, 3.8]
const weightTotal = ageWeights.reduce((a, b) => a + b, 0)

// Scope: one barangay or the whole municipality
const scopeId = ref<number | 'all'>('all')
const scoped = computed(() => (scopeId.value === 'all' ? barangays : barangays.filter((b) => b.id === scopeId.value)))
const scopeLabel = computed(() =>
  scopeId.value === 'all' ? 'All barangays' : (barangays.find((b) => b.id === scopeId.value)?.name ?? ''),
)

const sum = (fn: (b: BarangayStat) => number) => scoped.value.reduce((t, b) => t + fn(b), 0)
const totalPop = computed(() => sum((b) => b.population))
const totalHH = computed(() => sum((b) => b.households))
const avgHH = computed(() => (totalHH.value ? totalPop.value / totalHH.value : 0))
const totalMale = computed(() => Math.round(sum((b) => b.population * b.malePct)))
const totalFemale = computed(() => totalPop.value - totalMale.value)

const n = (v: number) => v.toLocaleString('en-PH')
const pct = (v: number, d = 1) => (totalPop.value ? ((v / totalPop.value) * 100).toFixed(d) : '0.0') + '%'

// Age-sex pyramid
const pyramid = computed(() =>
  ageGroups.map((label, i) => {
    let male = 0
    let female = 0
    for (const b of scoped.value) {
      const groupTotal = (b.population * ageWeights[i]) / weightTotal
      // Mock: women make up a slightly larger share in older groups.
      const mShare = Math.max(0.35, b.malePct - i * 0.004)
      male += groupTotal * mShare
      female += groupTotal * (1 - mShare)
    }
    return { label, male: Math.round(male), female: Math.round(female) }
  }),
)
const pyramidMax = computed(() => Math.max(1, ...pyramid.value.flatMap((r) => [r.male, r.female])))

const ageBands = computed(() => {
  const sumRange = (from: number, to: number) =>
    pyramid.value.slice(from, to).reduce((t, r) => t + r.male + r.female, 0)
  return [
    { label: 'Children (0-14)', value: sumRange(0, 3) },
    { label: 'Working age (15-59)', value: sumRange(3, 12) },
    { label: 'Seniors (60+)', value: sumRange(12, 16) },
  ]
})

// Sectors (aggregated)
const sectorRows = computed(() => [
  { label: 'Senior citizens', value: sum((b) => b.sectors.seniors), base: 'population' },
  { label: 'Persons with disability', value: sum((b) => b.sectors.pwd), base: 'population' },
  { label: 'Solo parents', value: sum((b) => b.sectors.soloParents), base: 'population' },
  { label: 'Out-of-school youth', value: sum((b) => b.sectors.osy), base: 'population' },
  { label: '4Ps households', value: sum((b) => b.sectors.fourPs), base: 'households' },
])
const sectorPct = (r: { value: number; base: string }) => {
  const base = r.base === 'households' ? totalHH.value : totalPop.value
  return base ? (r.value / base) * 100 : 0
}

// Barangay table (always shows every barangay)
type SortKey = 'name' | 'population' | 'households' | 'avg'
const sortKey = ref<SortKey>('population')
const sortDir = ref<'asc' | 'desc'>('desc')
function sortBy(k: SortKey) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = k
    sortDir.value = k === 'name' ? 'asc' : 'desc'
  }
}
const tableRows = computed(() => {
  const dir = sortDir.value === 'asc' ? 1 : -1
  const val = (b: BarangayStat) =>
    sortKey.value === 'name' ? b.name : sortKey.value === 'avg' ? b.population / b.households : b[sortKey.value]
  return barangays.slice().sort((a, b) => {
    const x = val(a)
    const y = val(b)
    return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * dir
  })
})
const largest = Math.max(...barangays.map((b) => b.population))
const ariaSort = (k: SortKey) => (sortKey.value === k ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none')

// Data currency (matches the 90-day cycle used in the update tracker)
const staleCount = computed(() => barangays.filter((b) => b.updatedDaysAgo > 90).length)
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Population overview</h1>
        <p class="mt-1 text-sm text-slate-600">
          Aggregated figures from barangay submissions. No individual resident is shown on this page.
        </p>
      </div>
      <label class="text-xs font-medium text-slate-600">
        Showing
        <select
          v-model="scopeId"
          class="mt-1 block w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="all">All barangays</option>
          <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </header>

    <!-- Data currency notice -->
    <p
      v-if="staleCount && scopeId === 'all'"
      class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {{ staleCount }} {{ staleCount === 1 ? 'barangay has' : 'barangays have' }} not updated data in over 90 days, so
      these totals may be out of date.
      <RouterLink :to="{ name: 'municipal.barangays.updates' }" class="font-medium underline">
        See the update tracker
      </RouterLink>
    </p>

    <!-- Headline figures -->
    <dl class="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
      <div class="p-4">
        <dt class="text-xs text-slate-500">Total population ({{ scopeLabel }})</dt>
        <dd class="mt-1 text-3xl font-semibold text-slate-900">{{ n(totalPop) }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Households</dt>
        <dd class="mt-1 text-3xl font-semibold text-slate-900">{{ n(totalHH) }}</dd>
        <dd class="text-xs text-slate-500">{{ avgHH.toFixed(1) }} persons per household</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Male</dt>
        <dd class="mt-1 text-3xl font-semibold text-slate-900">{{ n(totalMale) }}</dd>
        <dd class="text-xs text-slate-500">{{ pct(totalMale) }} of population</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Female</dt>
        <dd class="mt-1 text-3xl font-semibold text-slate-900">{{ n(totalFemale) }}</dd>
        <dd class="text-xs text-slate-500">{{ pct(totalFemale) }} of population</dd>
      </div>
    </dl>

    <div class="grid gap-6 xl:grid-cols-5">
      <!-- Age-sex pyramid -->
      <section class="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-3" aria-labelledby="pyr-h">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 id="pyr-h" class="text-sm font-semibold text-slate-900">Age and sex</h2>
          <div class="flex items-center gap-4 text-xs text-slate-600">
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-blue-600" />Male</span>
            <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-teal-500" />Female</span>
          </div>
        </div>

        <ul class="mt-4 space-y-1">
          <li
            v-for="r in pyramid.slice().reverse()"
            :key="r.label"
            class="grid grid-cols-[3.5rem_1fr_1fr] items-center gap-2 text-xs"
          >
            <span class="text-right text-slate-500">{{ r.label }}</span>
            <div class="flex items-center justify-end gap-1.5" :title="`Male ${n(r.male)}`">
              <span class="tabular-nums text-slate-600">{{ n(r.male) }}</span>
              <div class="h-4 rounded-l bg-blue-600" :style="{ width: (r.male / pyramidMax) * 70 + '%' }" />
            </div>
            <div class="flex items-center gap-1.5" :title="`Female ${n(r.female)}`">
              <div class="h-4 rounded-r bg-teal-500" :style="{ width: (r.female / pyramidMax) * 70 + '%' }" />
              <span class="tabular-nums text-slate-600">{{ n(r.female) }}</span>
            </div>
          </li>
        </ul>

        <dl class="mt-5 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 text-sm">
          <div v-for="b in ageBands" :key="b.label">
            <dt class="text-xs text-slate-500">{{ b.label }}</dt>
            <dd class="font-semibold text-slate-900">{{ pct(b.value, 0) }}</dd>
            <dd class="text-xs text-slate-500">{{ n(b.value) }}</dd>
          </div>
        </dl>
      </section>

      <!-- Sectors -->
      <section class="rounded-lg border border-slate-200 bg-white p-5 xl:col-span-2" aria-labelledby="sec-h">
        <h2 id="sec-h" class="text-sm font-semibold text-slate-900">Sectors</h2>
        <p class="mt-1 text-xs text-slate-500">Percent of population, except 4Ps (percent of households).</p>
        <ul class="mt-4 space-y-4">
          <li v-for="s in sectorRows" :key="s.label">
            <div class="flex items-baseline justify-between text-sm">
              <span class="text-slate-800">{{ s.label }}</span>
              <span class="tabular-nums text-slate-900">
                <span class="font-semibold">{{ n(s.value) }}</span>
                <span class="ml-1.5 text-xs text-slate-500">{{ sectorPct(s).toFixed(1) }}%</span>
              </span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-blue-600" :style="{ width: Math.min(100, sectorPct(s) * 3) + '%' }" />
            </div>
          </li>
        </ul>
        <RouterLink
          to="/municipal/population/sectors"
          class="mt-5 inline-block text-sm font-medium text-blue-700 hover:underline"
        >
          Sector breakdown by barangay
        </RouterLink>
      </section>
    </div>

    <!-- Barangay table -->
    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="tbl-h">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id="tbl-h" class="text-sm font-semibold text-slate-900">Population by barangay</h2>
        <p class="text-xs text-slate-500">Select a row to focus the figures above.</p>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th v-for="c in ([['name', 'Barangay'], ['population', 'Population'], ['households', 'Households'], ['avg', 'Avg. household size']] as [SortKey, string][])"
                  :key="c[0]" scope="col" class="px-4 py-3" :aria-sort="ariaSort(c[0])">
                <button type="button" class="font-medium hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" @click="sortBy(c[0])">
                  {{ c[1] }}
                  <span v-if="sortKey === c[0]" aria-hidden="true">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </button>
              </th>
              <th scope="col" class="px-4 py-3">Data updated</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Profile</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="b in tableRows"
              :key="b.id"
              class="cursor-pointer hover:bg-slate-50"
              :class="scopeId === b.id ? 'bg-blue-50/60' : ''"
              @click="scopeId = scopeId === b.id ? 'all' : b.id"
            >
              <td class="px-4 py-3 font-medium text-slate-900">{{ b.name }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <span class="w-14 tabular-nums text-slate-900">{{ n(b.population) }}</span>
                  <div class="hidden h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 sm:block" aria-hidden="true">
                    <div class="h-full rounded-full bg-blue-600" :style="{ width: (b.population / largest) * 100 + '%' }" />
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 tabular-nums text-slate-700">{{ n(b.households) }}</td>
              <td class="px-4 py-3 tabular-nums text-slate-700">{{ (b.population / b.households).toFixed(1) }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="b.updatedDaysAgo > 90 ? 'font-medium text-red-700' : 'text-slate-600'">
                  {{ b.updatedDaysAgo }} days ago
                </span>
              </td>
              <td class="px-4 py-3 text-right" @click.stop>
                <RouterLink
                  :to="{ name: 'municipal.barangay.details', params: { id: b.id } }"
                  class="text-sm font-medium text-blue-700 hover:underline"
                >
                  View profile
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="text-sm text-slate-600">
      Need a specific resident's record? Individual records need a stated purpose.
      <RouterLink :to="{ name: 'municipal.population.access' }" class="font-medium text-blue-700 hover:underline">
        Go to resident record access
      </RouterLink>
    </p>
  </div>
</template>