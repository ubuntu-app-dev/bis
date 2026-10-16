<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

interface BarangayAge {
  id: number
  name: string
  population: number
  malePct: number
  updatedDaysAgo: number
}

// TODO: replace with API call (e.g. GET /api/municipal/population/age-sex).
// Expect male and female counts per 5-year age group for each barangay, as submitted by the secretary.
const barangays: BarangayAge[] = [
  { id: 1, name: 'Alacan', population: 4120, malePct: 0.51, updatedDaysAgo: 12 },
  { id: 2, name: 'Angio', population: 2860, malePct: 0.49, updatedDaysAgo: 77 },
  { id: 3, name: 'Bolasi', population: 3540, malePct: 0.5, updatedDaysAgo: 18 },
  { id: 4, name: 'Cayanga', population: 5210, malePct: 0.5, updatedDaysAgo: 40 },
  { id: 5, name: 'Longos', population: 2395, malePct: 0.48, updatedDaysAgo: 109 },
  { id: 6, name: 'Mabilao', population: 6480, malePct: 0.51, updatedDaysAgo: 2 },
  { id: 7, name: 'Nibaliw Central', population: 3975, malePct: 0.49, updatedDaysAgo: 157 },
  { id: 8, name: 'Rabon', population: 1830, malePct: 0.5, updatedDaysAgo: 95 },
]

const ageGroups = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75 and over']
const weights = [8, 8.5, 8.5, 9, 8.5, 8, 7.5, 7, 6.5, 5.5, 5, 4.5, 4, 3, 2.2, 3.8]
const weightTotal = weights.reduce((a, b) => a + b, 0)

// Mock counts per barangay. Remove once the API returns real age-sex counts.
const data = barangays.map((b) => {
  const male: number[] = []
  const female: number[] = []
  ageGroups.forEach((_, i) => {
    const group = (b.population * weights[i]) / weightTotal
    const share = Math.max(0.35, b.malePct - i * 0.004)
    male.push(Math.round(group * share))
    female.push(Math.round(group * (1 - share)))
  })
  return { ...b, male, female }
})
type Row = (typeof data)[number]

// Standard bands (0-14, 15-64, 65+) used for the dependency ratio
const bandRanges: [string, number, number][] = [
  ['Under 15', 0, 3],
  ['15 to 64', 3, 14],
  ['65 and over', 13, 16],
]
const range = (arr: number[], from: number, to: number) => arr.slice(from, to).reduce((a, b) => a + b, 0)
function bands(r: { male: number[]; female: number[] }) {
  const young = range(r.male, 0, 3) + range(r.female, 0, 3)
  const working = range(r.male, 3, 13) + range(r.female, 3, 13)
  const old = range(r.male, 13, 16) + range(r.female, 13, 16)
  return { young, working, old }
}
const sumArr = (a: number[]) => a.reduce((x, y) => x + y, 0)
const sexRatio = (m: number, f: number) => (f ? (m / f) * 100 : 0)
const depRatio = (b: { young: number; working: number; old: number }) => (b.working ? ((b.young + b.old) / b.working) * 100 : 0)

// Scope
const scopeId = ref<number | 'all'>('all')
const scoped = computed(() => (scopeId.value === 'all' ? data : data.filter((b) => b.id === scopeId.value)))
const scopeLabel = computed(() => (scopeId.value === 'all' ? 'All barangays' : (data.find((b) => b.id === scopeId.value)?.name ?? '')))

const scopeMale = computed(() => ageGroups.map((_, i) => scoped.value.reduce((t, b) => t + b.male[i], 0)))
const scopeFemale = computed(() => ageGroups.map((_, i) => scoped.value.reduce((t, b) => t + b.female[i], 0)))
const totalMale = computed(() => sumArr(scopeMale.value))
const totalFemale = computed(() => sumArr(scopeFemale.value))
const total = computed(() => totalMale.value + totalFemale.value)
const scopeBands = computed(() => bands({ male: scopeMale.value, female: scopeFemale.value }))
const maxGroup = computed(() => Math.max(1, ...ageGroups.map((_, i) => scopeMale.value[i] + scopeFemale.value[i])))

const ageRows = computed(() =>
  ageGroups.map((label, i) => ({
    label,
    male: scopeMale.value[i],
    female: scopeFemale.value[i],
    total: scopeMale.value[i] + scopeFemale.value[i],
  })),
)

// Barangay comparison
const barangayRows = computed(() =>
  data.map((b: Row) => {
    const bd = bands(b)
    const m = sumArr(b.male)
    const f = sumArr(b.female)
    return { id: b.id, name: b.name, ...bd, male: m, female: f, total: m + f, sexRatio: sexRatio(m, f), dep: depRatio(bd), updatedDaysAgo: b.updatedDaysAgo }
  }),
)
const allRow = computed(() => {
  const bd = {
    young: barangayRows.value.reduce((t, r) => t + r.young, 0),
    working: barangayRows.value.reduce((t, r) => t + r.working, 0),
    old: barangayRows.value.reduce((t, r) => t + r.old, 0),
  }
  const m = barangayRows.value.reduce((t, r) => t + r.male, 0)
  const f = barangayRows.value.reduce((t, r) => t + r.female, 0)
  return { ...bd, male: m, female: f, total: m + f, sexRatio: sexRatio(m, f), dep: depRatio(bd) }
})

const n = (v: number) => v.toLocaleString('en-PH')
const pct = (v: number, base: number, d = 1) => (base ? ((v / base) * 100).toFixed(d) : '0.0') + '%'

// CSV export of what is on screen
function csvCell(v: string | number) {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function download(name: string, rows: (string | number)[][]) {
  const blob = new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
function exportAgeSex() {
  download(`age-sex-${scopeLabel.value.toLowerCase().replace(/\s+/g, '-')}.csv`, [
    ['Age group', 'Male', 'Female', 'Total'],
    ...ageRows.value.map((r) => [r.label, r.male, r.female, r.total]),
    ['Total', totalMale.value, totalFemale.value, total.value],
  ])
}
function exportBarangays() {
  download('age-sex-by-barangay.csv', [
    ['Barangay', 'Under 15', '15 to 64', '65 and over', 'Male', 'Female', 'Males per 100 females', 'Dependency ratio'],
    ...barangayRows.value.map((r) => [r.name, r.young, r.working, r.old, r.male, r.female, r.sexRatio.toFixed(1), r.dep.toFixed(1)]),
    ['All barangays', allRow.value.young, allRow.value.working, allRow.value.old, allRow.value.male, allRow.value.female, allRow.value.sexRatio.toFixed(1), allRow.value.dep.toFixed(1)],
  ])
}

const staleCount = data.filter((b) => b.updatedDaysAgo > 90).length
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Age and sex</h1>
        <p class="mt-1 text-sm text-slate-600">
          Population by 5-year age group and sex, as submitted by each barangay.
        </p>
      </div>
      <label class="text-xs font-medium text-slate-600">
        Showing
        <select
          v-model="scopeId"
          class="mt-1 block w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="all">All barangays</option>
          <option v-for="b in data" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </header>

    <p v-if="staleCount && scopeId === 'all'" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {{ staleCount }} {{ staleCount === 1 ? 'barangay has' : 'barangays have' }} not updated data in over 90 days.
      <RouterLink :to="{ name: 'municipal.barangays.updates' }" class="font-medium underline">See the update tracker</RouterLink>
    </p>

    <!-- Headline figures -->
    <dl class="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
      <div class="p-4">
        <dt class="text-xs text-slate-500">Population ({{ scopeLabel }})</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ n(total) }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Male / Female</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ n(totalMale) }} / {{ n(totalFemale) }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Males per 100 females</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ sexRatio(totalMale, totalFemale).toFixed(1) }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Dependency ratio</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ depRatio(scopeBands).toFixed(1) }}</dd>
        <dd class="text-xs text-slate-500">dependents per 100 aged 15 to 64</dd>
      </div>
    </dl>

    <!-- Age group table -->
    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="age-h">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <h2 id="age-h" class="text-sm font-semibold text-slate-900">Population by age group, {{ scopeLabel }}</h2>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          @click="exportAgeSex"
        >
          Export CSV
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Age group</th>
              <th scope="col" class="px-4 py-3 text-right">Male</th>
              <th scope="col" class="px-4 py-3 text-right">Female</th>
              <th scope="col" class="px-4 py-3 text-right">Total</th>
              <th scope="col" class="px-4 py-3">Share of population</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="r in ageRows" :key="r.label">
              <td class="px-4 py-2.5 font-medium text-slate-900">{{ r.label }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ n(r.male) }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ n(r.female) }}</td>
              <td class="px-4 py-2.5 text-right tabular-nums font-medium text-slate-900">{{ n(r.total) }}</td>
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-3">
                  <div class="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div class="h-full rounded-full bg-blue-600" :style="{ width: (r.total / maxGroup) * 100 + '%' }" />
                  </div>
                  <span class="w-12 text-xs tabular-nums text-slate-600">{{ pct(r.total, total) }}</span>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
            <tr>
              <th scope="row" class="px-4 py-3 text-left">Total</th>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(totalMale) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(totalFemale) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(total) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- Barangay comparison -->
    <section class="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="brgy-h">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="brgy-h" class="text-sm font-semibold text-slate-900">By barangay</h2>
          <p class="text-xs text-slate-500">Select a barangay to show its age groups above.</p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          @click="exportBarangays"
        >
          Export CSV
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Barangay</th>
              <th v-for="h in bandRanges" :key="h[0]" scope="col" class="px-4 py-3 text-right">{{ h[0] }}</th>
              <th scope="col" class="px-4 py-3 text-right">Male</th>
              <th scope="col" class="px-4 py-3 text-right">Female</th>
              <th scope="col" class="px-4 py-3 text-right">Males per 100 females</th>
              <th scope="col" class="px-4 py-3 text-right">Dependency ratio</th>
              <th scope="col" class="px-4 py-3">Data updated</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="r in barangayRows"
              :key="r.id"
              class="cursor-pointer hover:bg-slate-50"
              :class="scopeId === r.id ? 'bg-blue-50/60' : ''"
              @click="scopeId = scopeId === r.id ? 'all' : r.id"
            >
              <td class="px-4 py-3 font-medium text-slate-900">{{ r.name }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ n(r.young) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ n(r.working) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ n(r.old) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ n(r.male) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ n(r.female) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ r.sexRatio.toFixed(1) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ r.dep.toFixed(1) }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="r.updatedDaysAgo > 90 ? 'font-medium text-red-700' : 'text-slate-600'">{{ r.updatedDaysAgo }} days ago</span>
              </td>
            </tr>
          </tbody>
          <tfoot class="border-t border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900">
            <tr>
              <th scope="row" class="px-4 py-3 text-left">All barangays</th>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(allRow.young) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(allRow.working) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(allRow.old) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(allRow.male) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ n(allRow.female) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ allRow.sexRatio.toFixed(1) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ allRow.dep.toFixed(1) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>