<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import {
  freshnessOf,
  getBarangays,
  type AccountStatus,
  type BarangayRecord,
  type Freshness,
} from '@/data/m/barangayData'

const barangays = ref<BarangayRecord[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    barangays.value = await getBarangays()
  } catch {
    error.value = 'Could not load the barangay list. Check your connection and reload the page.'
  } finally {
    loading.value = false
  }
})

const fmt = (n: number) => new Intl.NumberFormat('en-PH').format(n)

// ---------- Summary ----------
const activeCount = computed(() => barangays.value.filter((b) => b.accountStatus === 'active').length)
const averageCompleteness = computed(() =>
  barangays.value.length
    ? Math.round(barangays.value.reduce((t, b) => t + b.completeness, 0) / barangays.value.length)
    : 0,
)
const totalPending = computed(() => barangays.value.reduce((t, b) => t + b.pendingReviews, 0))
const needUpdate = computed(
  () => barangays.value.filter((b) => freshnessOf(b.recordsUpdatedDaysAgo) !== 'current').length,
)

const summary = computed(() => [
  { label: 'Registered barangays', value: String(barangays.value.length), note: `${activeCount.value} with active accounts` },
  { label: 'Average completeness', value: `${averageCompleteness.value}%`, note: 'Of required profile fields' },
  { label: 'Waiting for review', value: String(totalPending.value), note: 'Submitted profiles and reports' },
  { label: 'Records need an update', value: String(needUpdate.value), note: 'Not updated in the last 7 days' },
])

// ---------- Filters ----------
const query = ref('')
const accountFilter = ref<'all' | AccountStatus>('all')
const recordsFilter = ref<'all' | Freshness>('all')

const hasFilters = computed(
  () => !!query.value.trim() || accountFilter.value !== 'all' || recordsFilter.value !== 'all',
)

function clearFilters() {
  query.value = ''
  accountFilter.value = 'all'
  recordsFilter.value = 'all'
}

// ---------- Sorting ----------
type SortKey = 'name' | 'population' | 'completeness' | 'updated' | 'pending'
const sortKey = ref<SortKey>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

function sortValue(b: BarangayRecord, key: SortKey): string | number {
  switch (key) {
    case 'name': return b.name
    case 'population': return b.population
    case 'completeness': return b.completeness
    case 'updated': return b.recordsUpdatedDaysAgo
    case 'pending': return b.pendingReviews
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
    .filter((b) => !q || b.name.toLowerCase().includes(q) || b.captain.toLowerCase().includes(q))
    .filter((b) => accountFilter.value === 'all' || b.accountStatus === accountFilter.value)
    .filter((b) => recordsFilter.value === 'all' || freshnessOf(b.recordsUpdatedDaysAgo) === recordsFilter.value)
    .sort((a, b) => {
      const x = sortValue(a, sortKey.value)
      const y = sortValue(b, sortKey.value)
      return (typeof x === 'string' ? x.localeCompare(y as string) : x - (y as number)) * dir
    })
})

const columns: { key: SortKey | null; label: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Barangay', align: 'left' },
  { key: null, label: 'Contact', align: 'left' },
  { key: 'population', label: 'Population', align: 'right' },
  { key: 'completeness', label: 'Completeness', align: 'left' },
  { key: 'updated', label: 'Records', align: 'left' },
  { key: null, label: 'Account', align: 'left' },
  { key: 'pending', label: 'To review', align: 'right' },
]

// ---------- Styling helpers ----------
const recordsStyle: Record<Freshness, { label: string; cls: string }> = {
  current: { label: 'Up to date', cls: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Update due', cls: 'bg-amber-50 text-amber-800' },
  overdue: { label: 'Overdue', cls: 'bg-red-50 text-red-700' },
}
const accountStyle: Record<AccountStatus, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700' },
  suspended: { label: 'Suspended', cls: 'bg-red-50 text-red-700' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800' },
}
const completenessBar = (pct: number) =>
  pct >= 80 ? 'bg-bis-600' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

function updatedLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const card = 'rounded-xl border border-slate-200 bg-white'
const selectCls =
  'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">All barangays</h1>
      <p class="mt-1 text-sm text-slate-600">
        Registered barangays, their account status, and how complete and current their records are.
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

    <!-- Summary -->
    <section aria-label="Summary" :class="[card, 'grid grid-cols-2 lg:grid-cols-4']">
      <template v-if="loading">
        <div v-for="n in 4" :key="n" class="space-y-3 p-5">
          <div class="h-3 w-28 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div class="h-7 w-16 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
          <div class="h-3 w-32 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
        </div>
      </template>
      <div
        v-for="(s, i) in loading ? [] : summary"
        :key="s.label"
        :class="[
          'p-5',
          i > 0 ? 'border-t border-slate-200 lg:border-l lg:border-t-0' : '',
          i % 2 === 1 ? 'max-lg:border-l' : '',
          i === 1 ? 'max-lg:border-t-0' : '',
        ]"
      >
        <p class="text-sm text-slate-600">{{ s.label }}</p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{{ s.value }}</p>
        <p class="mt-1 text-xs text-slate-500">{{ s.note }}</p>
      </div>
    </section>

    <!-- Table -->
    <section :class="card" aria-label="Barangay list">
      <div class="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4">
        <div class="relative w-full sm:w-72">
          <label for="barangay-search" class="sr-only">Search by barangay or captain</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="barangay-search"
            v-model="query"
            type="search"
            placeholder="Search barangay or captain"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-bis-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>

        <div>
          <label for="account-filter" class="mb-1 block text-xs text-slate-600">Account</label>
          <select id="account-filter" v-model="accountFilter" :class="selectCls">
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label for="records-filter" class="mb-1 block text-xs text-slate-600">Records</label>
          <select id="records-filter" v-model="recordsFilter" :class="selectCls">
            <option value="all">All records</option>
            <option value="current">Up to date</option>
            <option value="due">Update due</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="clearFilters"
        >
          <BisIcon name="x" :size="14" />
          Clear filters
        </button>

        <p class="ml-auto self-center text-sm text-slate-600" aria-live="polite">
          {{ rows.length }} of {{ barangays.length }} barangays
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[60rem] text-sm">
          <caption class="sr-only">Barangays with contact, population, record completeness, update status and account status</caption>
          <thead>
            <tr class="border-b border-slate-200 text-xs text-slate-600">
              <th
                v-for="c in columns"
                :key="c.label"
                scope="col"
                :aria-sort="c.key && sortKey === c.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
                :class="['px-5 py-2.5 font-medium', c.align === 'right' ? 'text-right' : 'text-left']"
              >
                <button
                  v-if="c.key"
                  type="button"
                  :class="[
                    'inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600',
                    sortKey === c.key ? 'text-slate-900' : '',
                  ]"
                  @click="sortBy(c.key)"
                >
                  {{ c.label }}
                  <BisIcon name="sort" :size="14" :class="sortKey === c.key ? 'text-bis-600' : 'text-slate-400'" />
                </button>
                <template v-else>{{ c.label }}</template>
              </th>
              <th scope="col" class="px-5 py-2.5"><span class="sr-only">Open profile</span></th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <template v-if="loading">
              <tr v-for="n in 6" :key="n">
                <td v-for="m in 8" :key="m" class="px-5 py-4">
                  <div class="h-4 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                </td>
              </tr>
            </template>

            <tr v-else-if="rows.length === 0">
              <td colspan="8" class="px-5 py-12 text-center">
                <p class="font-medium text-slate-900">No barangays match these filters</p>
                <button
                  type="button"
                  class="mt-2 text-sm font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click="clearFilters"
                >
                  Clear filters
                </button>
              </td>
            </tr>

            <template v-else>
            <tr v-for="b in rows" :key="b.id" class="transition-colors hover:bg-slate-50">
              <td class="px-5 py-3">
                <RouterLink
                  :to="`/municipal/barangays/${b.id}`"
                  class="font-medium text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                >
                  {{ b.name }}
                </RouterLink>
                <p class="text-xs text-slate-500">Captain {{ b.captain }}</p>
              </td>
              <td class="px-5 py-3 tabular-nums text-slate-700">{{ b.contact }}</td>
              <td class="px-5 py-3 text-right tabular-nums text-slate-700">
                {{ fmt(b.population) }}
                <p class="text-xs text-slate-500">{{ fmt(b.households) }} households</p>
              </td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <span class="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <span :class="['block h-full rounded-full', completenessBar(b.completeness)]" :style="{ width: `${b.completeness}%` }" />
                  </span>
                  <span class="w-10 tabular-nums text-slate-700">{{ b.completeness }}%</span>
                </div>
              </td>
              <td class="px-5 py-3">
                <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', recordsStyle[freshnessOf(b.recordsUpdatedDaysAgo)].cls]">
                  {{ recordsStyle[freshnessOf(b.recordsUpdatedDaysAgo)].label }}
                </span>
                <p class="mt-0.5 text-xs text-slate-500">{{ updatedLabel(b.recordsUpdatedDaysAgo) }}</p>
              </td>
              <td class="px-5 py-3">
                <span :class="['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', accountStyle[b.accountStatus].cls]">
                  {{ accountStyle[b.accountStatus].label }}
                </span>
              </td>
              <td class="px-5 py-3 text-right tabular-nums">
                <RouterLink
                  v-if="b.pendingReviews > 0"
                  to="/municipal/barangays/submissions"
                  class="inline-flex min-w-7 justify-center rounded-full bg-bis-50 px-2 py-0.5 text-xs font-semibold text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                >
                  {{ b.pendingReviews }}
                </RouterLink>
                <span v-else class="text-slate-400">None</span>
              </td>
              <td class="px-3 py-3 text-right">
                <RouterLink
                  :to="`/municipal/barangays/${b.id}`"
                  class="inline-grid size-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                >
                  <BisIcon name="chevronRight" :size="16" />
                  <span class="sr-only">Open {{ b.name }} profile</span>
                </RouterLink>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>