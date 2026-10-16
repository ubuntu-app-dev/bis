<script setup lang="ts">
import { computed, ref } from 'vue'

type Dataset = 'Profile' | 'Population' | 'Households' | 'Sectors' | 'Officials'
type Freshness = 'current' | 'soon' | 'overdue'

// An update is expected at least once every UPDATE_CYCLE_DAYS.
// It shows "due soon" during the last WARN_DAYS before the deadline.
const UPDATE_CYCLE_DAYS = 90
const WARN_DAYS = 14

const datasets: Dataset[] = ['Profile', 'Population', 'Households', 'Sectors', 'Officials']

interface Row {
  barangay: string
  secretary: string
  // days since each dataset was last updated (derive from a real timestamp in the API)
  age: Record<Dataset, number>
  remindedOn?: string
}

// TODO: replace with API call (e.g. GET /api/municipal/data-updates)
const rows = ref<Row[]>([
  { barangay: 'Alacan', secretary: 'Liza M. Ventura', age: { Profile: 12, Population: 20, Households: 34, Sectors: 41, Officials: 12 } },
  { barangay: 'Angio', secretary: 'Marites C. Soriano', age: { Profile: 77, Population: 102, Households: 88, Sectors: 140, Officials: 60 } },
  { barangay: 'Bolasi', secretary: 'Gina R. Bautista', age: { Profile: 18, Population: 18, Households: 30, Sectors: 52, Officials: 18 } },
  { barangay: 'Cayanga', secretary: 'Arnel T. Manuel', age: { Profile: 40, Population: 45, Households: 80, Sectors: 45, Officials: 15 } },
  { barangay: 'Longos', secretary: 'Cynthia A. Lopez', age: { Profile: 109, Population: 118, Households: 125, Sectors: 118, Officials: 108 } },
  { barangay: 'Mabilao', secretary: 'Rowena E. Padilla', age: { Profile: 2, Population: 14, Households: 14, Sectors: 30, Officials: 28 } },
  { barangay: 'Nibaliw Central', secretary: 'Maricel V. Domingo', age: { Profile: 157, Population: 60, Households: 72, Sectors: 60, Officials: 157 } },
  { barangay: 'Rabon', secretary: 'No secretary on record', age: { Profile: 95, Population: 95, Households: 95, Sectors: 95, Officials: 75 } },
])

function freshness(days: number): Freshness {
  if (days > UPDATE_CYCLE_DAYS) return 'overdue'
  if (days > UPDATE_CYCLE_DAYS - WARN_DAYS) return 'soon'
  return 'current'
}
const rank: Record<Freshness, number> = { current: 0, soon: 1, overdue: 2 }

function overall(r: Row): Freshness {
  return datasets.reduce<Freshness>((worst, d) => {
    const f = freshness(r.age[d])
    return rank[f] > rank[worst] ? f : worst
  }, 'current')
}
const overdueCount = (r: Row) => datasets.filter((d) => freshness(r.age[d]) === 'overdue').length

const labels: Record<Freshness, string> = {
  current: 'Up to date',
  soon: 'Due soon',
  overdue: 'Overdue',
}
const cellClass: Record<Freshness, string> = {
  current: 'bg-emerald-50 text-emerald-800',
  soon: 'bg-amber-50 text-amber-900',
  overdue: 'bg-red-50 text-red-800',
}
const badgeClass: Record<Freshness, string> = {
  current: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  soon: 'bg-amber-50 text-amber-900 ring-amber-200',
  overdue: 'bg-red-50 text-red-800 ring-red-200',
}

const search = ref('')
const statusFilter = ref<'all' | Freshness>('all')

const summary = computed(() => {
  const s = { current: 0, soon: 0, overdue: 0 }
  rows.value.forEach((r) => s[overall(r)]++)
  return s
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value
    .filter((r) => (statusFilter.value === 'all' ? true : overall(r) === statusFilter.value))
    .filter((r) => !q || r.barangay.toLowerCase().includes(q) || r.secretary.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => rank[overall(b)] - rank[overall(a)] || overdueCount(b) - overdueCount(a) || a.barangay.localeCompare(b.barangay))
})

const toast = ref('')
function remind(r: Row) {
  r.remindedOn = new Date().toISOString().slice(0, 10)
  toast.value = `Reminder sent to ${r.barangay}`
  setTimeout(() => (toast.value = ''), 2500)
  // TODO: POST /api/municipal/data-updates/:barangay/remind
}
const remindAllLate = () => rows.value.filter((r) => overall(r) === 'overdue').forEach(remind)

const ageText = (d: number) => (d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`)
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Data update tracker</h1>
        <p class="mt-1 text-sm text-slate-600">
          Each dataset should be updated at least every {{ UPDATE_CYCLE_DAYS }} days. Barangays with the oldest data are listed first.
        </p>
      </div>
      <button
        type="button"
        class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="!summary.overdue"
        @click="remindAllLate"
      >
        Remind all overdue ({{ summary.overdue }})
      </button>
    </header>

    <!-- Summary as filters -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <button
        v-for="key in (['overdue', 'soon', 'current'] as Freshness[])"
        :key="key"
        type="button"
        class="rounded-lg border bg-white p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        :class="statusFilter === key ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'"
        :aria-pressed="statusFilter === key"
        @click="statusFilter = statusFilter === key ? 'all' : key"
      >
        <p class="text-xs text-slate-500">{{ labels[key] }}</p>
        <p class="mt-1 text-2xl font-semibold text-slate-900">
          {{ summary[key] }}
          <span class="text-sm font-normal text-slate-500">of {{ rows.length }} barangays</span>
        </p>
      </button>
    </div>

    <label class="block max-w-sm text-xs font-medium text-slate-600">
      Search
      <input
        v-model="search"
        type="search"
        placeholder="Barangay or secretary"
        class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
      />
    </label>

    <!-- Matrix -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Barangay</th>
              <th v-for="d in datasets" :key="d" scope="col" class="px-3 py-3">{{ d }}</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="r in visible" :key="r.barangay">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-900">{{ r.barangay }}</p>
                <p class="text-xs text-slate-500">{{ r.secretary }}</p>
              </td>
              <td v-for="d in datasets" :key="d" class="px-2 py-2">
                <div class="whitespace-nowrap rounded-md px-2 py-1.5 text-xs" :class="cellClass[freshness(r.age[d])]">
                  <span class="font-medium">{{ ageText(r.age[d]) }}</span>
                  <span class="sr-only"> ({{ labels[freshness(r.age[d])] }})</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" :class="badgeClass[overall(r)]">
                  {{ overall(r) === 'overdue' ? `${overdueCount(r)} overdue` : labels[overall(r)] }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <template v-if="overall(r) !== 'current'">
                  <button
                    type="button"
                    class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    @click="remind(r)"
                  >
                    Send reminder
                  </button>
                  <p v-if="r.remindedOn" class="mt-1 text-xs text-slate-500">Last sent {{ fmt(r.remindedOn) }}</p>
                </template>
              </td>
            </tr>
            <tr v-if="!visible.length">
              <td :colspan="datasets.length + 3" class="px-4 py-10 text-center text-sm text-slate-600">
                No barangays match this view.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p
      v-if="toast"
      role="status"
      class="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
    >
      {{ toast }}
    </p>
  </div>
</template>