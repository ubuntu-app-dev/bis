<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import type { BisIconName } from '@/icons/bisIcons'
import {
  getMunicipalDashboard,
  type ActivityItem,
  type BarangaySummary,
} from '@/data/m/dashboardData'

const barangays = ref<BarangaySummary[]>([])
const activity = ref<ActivityItem[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const data = await getMunicipalDashboard()
    barangays.value = data.barangays
    activity.value = data.activity
  } catch {
    error.value = 'Could not load the municipal overview. Check your connection and reload the page.'
  } finally {
    loading.value = false
  }
})

const number = new Intl.NumberFormat('en-PH')
const fmt = (n: number) => number.format(n)
const today = new Intl.DateTimeFormat('en-PH', { day: 'numeric', month: 'long', year: 'numeric' }).format(
  new Date(),
)

// ---------- Totals ----------
const sum = (pick: (b: BarangaySummary) => number) =>
  barangays.value.reduce((total, b) => total + pick(b), 0)

const totalPopulation = computed(() => sum((b) => b.population))
const totalHouseholds = computed(() => sum((b) => b.households))
const totalCertificates = computed(() => sum((b) => b.certificatesThisMonth))
const totalOpenCases = computed(() => sum((b) => b.openCases))

type Freshness = 'current' | 'due' | 'overdue'
const freshness = (b: BarangaySummary): Freshness =>
  b.recordsUpdatedDaysAgo <= 7 ? 'current' : b.recordsUpdatedDaysAgo <= 30 ? 'due' : 'overdue'

const currentCount = computed(() => barangays.value.filter((b) => freshness(b) === 'current').length)

const kpis = computed<{ label: string; value: string; note: string; icon: BisIconName }[]>(() => [
  { label: 'Population', value: fmt(totalPopulation.value), note: `Across ${barangays.value.length} barangays`, icon: 'users' },
  { label: 'Households', value: fmt(totalHouseholds.value), note: `${(totalPopulation.value / (totalHouseholds.value || 1)).toFixed(1)} people per household`, icon: 'home' },
  { label: 'Records up to date', value: `${currentCount.value} of ${barangays.value.length}`, note: 'Updated within the last 7 days', icon: 'clock' },
  { label: 'Certificates this month', value: fmt(totalCertificates.value), note: 'Issued by all barangays', icon: 'certificate' },
  { label: 'Open cases', value: fmt(totalOpenCases.value), note: 'Blotter and VAWC combined', icon: 'scale' },
])

// ---------- Population bars ----------
const byPopulation = computed(() => [...barangays.value].sort((a, b) => b.population - a.population))
const maxPopulation = computed(() => byPopulation.value[0]?.population || 1)

// ---------- Age and sex ----------
const weighted = (pct: (b: BarangaySummary) => number) =>
  Math.round(sum((b) => (b.population * pct(b)) / 100))

const ageGroups = computed(() => {
  const total = totalPopulation.value || 1
  const children = weighted((b) => b.childrenPct)
  const seniors = weighted((b) => b.seniorsPct)
  const adults = totalPopulation.value - children - seniors
  return [
    { label: 'Under 18', count: children, bar: 'bg-bis-600', pct: (children / total) * 100 },
    { label: '18 to 59', count: adults, bar: 'bg-slate-700', pct: (adults / total) * 100 },
    { label: '60 and over', count: seniors, bar: 'bg-amber-500', pct: (seniors / total) * 100 },
  ]
})

const sexSplit = computed(() => {
  const total = totalPopulation.value || 1
  const male = weighted((b) => b.malePct)
  const female = totalPopulation.value - male
  return [
    { label: 'Male', count: male, bar: 'bg-bis-600', pct: (male / total) * 100 },
    { label: 'Female', count: female, bar: 'bg-slate-400', pct: (female / total) * 100 },
  ]
})

// ---------- Table: search + sort ----------
type SortKey = 'name' | 'population' | 'households' | 'seniors' | 'certificates' | 'cases' | 'updated'
const query = ref('')
const sortKey = ref<SortKey>('population')
const sortDir = ref<'asc' | 'desc'>('desc')

const sortValue = (b: BarangaySummary, key: SortKey): string | number => {
  switch (key) {
    case 'name': return b.name
    case 'population': return b.population
    case 'households': return b.households
    case 'seniors': return b.seniorsPct
    case 'certificates': return b.certificatesThisMonth
    case 'cases': return b.openCases
    case 'updated': return b.recordsUpdatedDaysAgo
  }
}

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  const dir = sortDir.value === 'asc' ? 1 : -1
  return barangays.value
    .filter((b) => !q || b.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const x = sortValue(a, sortKey.value)
      const y = sortValue(b, sortKey.value)
      return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir
    })
})

const columns: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Barangay', align: 'left' },
  { key: 'population', label: 'Population', align: 'right' },
  { key: 'households', label: 'Households', align: 'right' },
  { key: 'seniors', label: 'Seniors', align: 'right' },
  { key: 'certificates', label: 'Certificates', align: 'right' },
  { key: 'cases', label: 'Open cases', align: 'right' },
  { key: 'updated', label: 'Records', align: 'left' },
]

const statusStyle: Record<Freshness, { label: string; cls: string }> = {
  current: { label: 'Up to date', cls: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Update due', cls: 'bg-amber-50 text-amber-800' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
}

function updatedLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

// ---------- Needs attention ----------
const attention = computed(() => {
  const items: { id: string; name: string; reason: string; tone: 'red' | 'amber' }[] = []
  for (const b of barangays.value) {
    const f = freshness(b)
    if (f === 'overdue')
      items.push({ id: b.id, name: b.name, reason: `Records not updated in ${b.recordsUpdatedDaysAgo} days`, tone: 'red' })
    else if (f === 'due')
      items.push({ id: b.id, name: b.name, reason: `Records last updated ${b.recordsUpdatedDaysAgo} days ago`, tone: 'amber' })
    if (b.openCases >= 5)
      items.push({ id: b.id, name: b.name, reason: `${b.openCases} open cases`, tone: 'amber' })
  }
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'red' ? -1 : 1))
})

function timeAgo(minutes: number) {
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`
  return `${Math.round(minutes / 1440)} day${minutes >= 2880 ? 's' : ''} ago`
}

const card = 'rounded-xl border border-slate-200 bg-white'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <!-- Title -->
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Municipal overview</h1>
      <p class="mt-1 text-sm text-slate-600">
        Combined records from all barangays, as of {{ today }}.
      </p>
    </div>

    <p
      v-if="error"
      role="alert"
      class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <BisIcon name="alert" :size="18" class="mt-0.5" />
      {{ error }}
    </p>

    <!-- KPI strip: one panel with dividers instead of five separate cards -->
    <section aria-label="Key figures" :class="[card, 'grid grid-cols-2 lg:grid-cols-5']">
      <template v-if="loading">
        <div v-for="n in 5" :key="n" class="space-y-3 p-5">
          <div class="h-3 w-24 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div class="h-7 w-20 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div class="h-3 w-32 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </div>
      </template>
      <div
        v-for="(k, i) in loading ? [] : kpis"
        :key="k.label"
        :class="[
          'p-5',
          i > 0 ? 'border-t border-slate-200 lg:border-l lg:border-t-0' : '',
          i % 2 === 1 ? 'max-lg:border-l' : '',
        ]"
      >
        <div class="flex items-center gap-2 text-sm text-slate-600">
          <span class="grid size-7 place-items-center rounded-md bg-bis-50 text-bis-600">
            <BisIcon :name="k.icon" :size="16" />
          </span>
          {{ k.label }}
        </div>
        <p class="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{{ k.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ k.note }}</p>
      </div>
    </section>

    <!-- Population + demographics -->
    <div class="grid gap-6 lg:grid-cols-3">
      <section :class="[card, 'p-5 lg:col-span-2']" aria-labelledby="pop-title">
        <h2 id="pop-title" class="text-sm font-semibold text-slate-900">Population by barangay</h2>
        <p class="mt-0.5 text-xs text-slate-500">Largest to smallest, with share of the municipality</p>

        <ul class="mt-5 space-y-3">
          <li v-for="b in byPopulation" :key="b.id" class="grid grid-cols-[7.5rem_1fr_6.5rem] items-center gap-3 text-sm">
            <span class="truncate text-slate-700">{{ b.name }}</span>
            <span class="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span
                class="block h-full rounded-full bg-bis-600"
                :style="{ width: `${(b.population / maxPopulation) * 100}%` }"
              />
            </span>
            <span class="text-right tabular-nums text-slate-900">
              {{ fmt(b.population) }}
              <span class="text-xs text-slate-500">{{ ((b.population / totalPopulation) * 100).toFixed(0) }}%</span>
            </span>
          </li>
        </ul>
      </section>

      <section :class="[card, 'p-5']" aria-labelledby="demo-title">
        <h2 id="demo-title" class="text-sm font-semibold text-slate-900">Who lives here</h2>
        <p class="mt-0.5 text-xs text-slate-500">Municipality-wide, from resident records</p>

        <div class="mt-5 space-y-6">
          <div v-for="group in [{ title: 'Age', items: ageGroups }, { title: 'Sex', items: sexSplit }]" :key="group.title">
            <p class="mb-2 text-xs font-medium text-slate-600">{{ group.title }}</p>
            <div class="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span v-for="s in group.items" :key="s.label" :class="s.bar" :style="{ width: `${s.pct}%` }" />
            </div>
            <ul class="mt-3 space-y-1.5">
              <li v-for="s in group.items" :key="s.label" class="flex items-center gap-2 text-sm">
                <span :class="['size-2.5 rounded-sm', s.bar]" aria-hidden="true" />
                <span class="flex-1 text-slate-700">{{ s.label }}</span>
                <span class="tabular-nums text-slate-900">{{ fmt(s.count) }}</span>
                <span class="w-10 text-right text-xs tabular-nums text-slate-500">{{ s.pct.toFixed(0) }}%</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <!-- Barangay table -->
    <section :class="card" aria-labelledby="table-title">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="table-title" class="text-sm font-semibold text-slate-900">All barangays</h2>
          <p class="mt-0.5 text-xs text-slate-500">Select a barangay to open its profile</p>
        </div>
        <div class="relative w-full sm:w-64">
          <label for="barangay-filter" class="sr-only">Filter barangays by name</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="barangay-filter"
            v-model="query"
            type="search"
            placeholder="Filter by name"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-bis-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[46rem] text-sm">
          <caption class="sr-only">Barangay summary, sortable by column</caption>
          <thead>
            <tr class="border-b border-slate-200 text-xs text-slate-600">
              <th
                v-for="c in columns"
                :key="c.key"
                scope="col"
                :aria-sort="sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'"
                :class="['px-5 py-2.5 font-medium', c.align === 'right' ? 'text-right' : 'text-left']"
              >
                <button
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600',
                    sortKey === c.key ? 'text-slate-900' : '',
                  ]"
                  @click="sortBy(c.key)"
                >
                  {{ c.label }}
                  <BisIcon
                    name="sort"
                    :size="14"
                    :class="sortKey === c.key ? 'text-bis-600' : 'text-slate-400'"
                  />
                </button>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!loading && rows.length === 0">
              <td colspan="7" class="px-5 py-10 text-center text-slate-500">
                No barangay matches "{{ query }}". Try a shorter name.
              </td>
            </tr>
            <tr v-for="b in rows" :key="b.id" class="transition-colors hover:bg-slate-50">
              <td class="px-5 py-3">
                <RouterLink
                  :to="`/municipal/barangays/${b.id}`"
                  class="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                >
                  {{ b.name }}
                  <BisIcon name="chevronRight" :size="14" class="text-slate-400" />
                </RouterLink>
              </td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700">{{ fmt(b.population) }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700">{{ fmt(b.households) }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700">{{ b.seniorsPct }}%</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700">{{ fmt(b.certificatesThisMonth) }}</td>
              <td
                :class="[
                  'px-5 py-3 text-right tabular-nums',
                  b.openCases >= 5 ? 'font-medium text-red-700' : 'text-slate-700',
                ]"
              >
                {{ b.openCases }}
              </td>
              <td class="px-5 py-3">
                <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', statusStyle[freshness(b)].cls]">
                  {{ statusStyle[freshness(b)].label }}
                </span>
                <span class="ml-2 text-xs text-slate-500">{{ updatedLabel(b.recordsUpdatedDaysAgo) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Attention + activity -->
    <div class="grid gap-6 lg:grid-cols-2">
      <section :class="[card, 'p-5']" aria-labelledby="attention-title">
        <h2 id="attention-title" class="text-sm font-semibold text-slate-900">Needs attention</h2>
        <p class="mt-0.5 text-xs text-slate-500">Late record updates and barangays with many open cases</p>

        <p v-if="!loading && attention.length === 0" class="mt-5 text-sm text-slate-600">
          Every barangay is up to date and no barangay has 5 or more open cases.
        </p>
        <ul v-else class="mt-4 divide-y divide-slate-100">
          <li v-for="(a, i) in attention" :key="`${a.id}-${i}`">
            <RouterLink
              :to="`/municipal/barangays/${a.id}`"
              class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bis-600"
            >
              <span
                :class="[
                  'grid size-8 shrink-0 place-items-center rounded-full',
                  a.tone === 'red' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
                ]"
              >
                <BisIcon name="alert" :size="16" />
              </span>
              <span class="min-w-0 flex-1 leading-tight">
                <span class="block truncate text-sm font-medium text-slate-900">{{ a.name }}</span>
                <span class="block truncate text-xs text-slate-600">{{ a.reason }}</span>
              </span>
              <BisIcon name="chevronRight" :size="16" class="text-slate-400" />
            </RouterLink>
          </li>
        </ul>
      </section>

      <section :class="[card, 'p-5']" aria-labelledby="activity-title">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 id="activity-title" class="text-sm font-semibold text-slate-900">Recent activity</h2>
            <p class="mt-0.5 text-xs text-slate-500">Latest actions across barangays</p>
          </div>
          <RouterLink
            to="/municipal/access/audit"
            class="inline-flex items-center gap-1 rounded text-sm font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Audit trail
            <BisIcon name="arrowUpRight" :size="14" />
          </RouterLink>
        </div>

        <ol class="mt-4 divide-y divide-slate-100">
          <li v-for="a in activity" :key="a.id" class="flex items-start gap-3 py-2.5">
            <span class="mt-1.5 size-2 shrink-0 rounded-full bg-bis-600" aria-hidden="true" />
            <p class="min-w-0 flex-1 text-sm text-slate-700">
              <span class="font-medium text-slate-900">{{ a.barangay }}</span>
              {{ a.text }}
            </p>
            <span class="shrink-0 text-xs text-slate-500">{{ timeAgo(a.minutesAgo) }}</span>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>