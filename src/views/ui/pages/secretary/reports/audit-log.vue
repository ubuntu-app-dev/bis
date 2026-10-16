<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import AuditDrawer from '@/components/layout/secretary/report/audit-drawer.vue'
import { auditModules, entryDate, formatWhen, logAudit, useAudit, type AuditEntry } from '@/data/audit'
import { isoDate } from '@/data/animals'
import { downloadCsv, type CsvCell } from '@/utils/csv'

const { entries, users } = useAudit()

/* --------------------------------- Filters -------------------------------- */
type QuickKey = 'all' | 'sensitive' | 'exports' | 'signins'

const quickFilters: { key: QuickKey; label: string; test: (e: AuditEntry) => boolean }[] = [
  { key: 'all', label: 'All activity', test: () => true },
  { key: 'sensitive', label: 'Confidential records', test: (e) => !!e.sensitive },
  { key: 'exports', label: 'Exports and prints', test: (e) => /export|print/i.test(e.action) },
  { key: 'signins', label: 'Sign-ins', test: (e) => /^sign(ed)?\s+(in|out)/i.test(e.action) },
]

const search = ref('')
const moduleFilter = ref('all')
const userFilter = ref('all')
const period = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const quick = ref<QuickKey>('all')

const moduleOptions = computed(() => [{ value: 'all', label: 'All modules' }, ...auditModules.map((m) => ({ value: m, label: m }))])
const userOptions = computed(() => [{ value: 'all', label: 'All users' }, ...users.value.map((u) => ({ value: u, label: u }))])
const periodOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom dates' },
]

const hasActiveFilters = computed(
  () =>
    search.value.trim() !== '' ||
    moduleFilter.value !== 'all' ||
    userFilter.value !== 'all' ||
    period.value !== 'all' ||
    quick.value !== 'all',
)

function clearFilters() {
  search.value = ''
  moduleFilter.value = 'all'
  userFilter.value = 'all'
  period.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  quick.value = 'all'
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoDate(d)
}

const dateRange = computed<{ from: string; to: string } | null>(() => {
  switch (period.value) {
    case 'today':
      return { from: isoDate(), to: isoDate() }
    case '7d':
      return { from: daysAgo(6), to: isoDate() }
    case '30d':
      return { from: daysAgo(29), to: isoDate() }
    case 'custom':
      return { from: dateFrom.value || '0000-01-01', to: dateTo.value || '9999-12-31' }
    default:
      return null
  }
})

const rangeError = computed(() =>
  period.value === 'custom' && dateFrom.value && dateTo.value && dateFrom.value > dateTo.value ? 'The start date is after the end date.' : '',
)

const indexed = computed(() =>
  entries.value.map((e) => ({
    e,
    hay: [e.id, e.user, e.role, e.module, e.action, e.target ?? '', e.detail ?? ''].join(' ').toLowerCase(),
  })),
)

// Everything except the quick tabs, so each tab can show how many entries it would give.
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const r = dateRange.value
  return indexed.value
    .filter(({ e, hay }) => {
      if (q && !hay.includes(q)) return false
      if (moduleFilter.value !== 'all' && e.module !== moduleFilter.value) return false
      if (userFilter.value !== 'all' && e.user !== userFilter.value) return false
      if (r) {
        const day = entryDate(e)
        if (day < r.from || day > r.to) return false
      }
      return true
    })
    .map(({ e }) => e)
})

const quickCounts = computed(() => Object.fromEntries(quickFilters.map((f) => [f.key, baseFiltered.value.filter(f.test).length])))

/* --------------------------------- Sorting -------------------------------- */
const sortDir = ref<'desc' | 'asc'>('desc') // newest first

const sorted = computed(() => {
  const test = quickFilters.find((f) => f.key === quick.value)!.test
  const list = baseFiltered.value.filter(test) // `entries` is newest first already
  return sortDir.value === 'desc' ? list : [...list].reverse()
})

/* -------------------------------- Pagination ------------------------------- */
const pageSize = ref(25)
const page = ref(1)
const pageSizeOptions = ['10', '25', '50', '100'].map((v) => ({ value: v, label: `${v} per page` }))

const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)))
const pageRows = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
const rangeFrom = computed(() => (sorted.value.length ? (page.value - 1) * pageSize.value + 1 : 0))
const rangeTo = computed(() => Math.min(sorted.value.length, page.value * pageSize.value))

const pageItems = computed<(number | '…')[]>(() => {
  const total = totalPages.value
  const cur = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | '…')[] = [1]
  if (cur > 3) items.push('…')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) items.push(p)
  if (cur < total - 2) items.push('…')
  items.push(total)
  return items
})

watch([search, moduleFilter, userFilter, period, dateFrom, dateTo, quick, pageSize, sortDir], () => {
  page.value = 1
})

// New events are added while the page is open; never leave the reader on a page that no longer exists.
watch(totalPages, (n) => {
  if (page.value > n) page.value = n
})

/* ---------------------------------- Drawer --------------------------------- */
const activeId = ref<string | null>(null)
const activeEntry = computed(() => entries.value.find((e) => e.id === activeId.value) ?? null)

/* -------------------------------- Export CSV ------------------------------- */
function exportCsv() {
  const list = sorted.value
  const rows: CsvCell[][] = [
    ['Event ID', 'Date and time (local)', 'Timestamp (UTC)', 'User', 'Role', 'Module', 'Action', 'Record', 'Details', 'Confidential'],
    ...list.map((e) => [e.id, formatWhen(e.at), e.at, e.user, e.role, e.module, e.action, e.target ?? '', e.detail ?? '', e.sensitive ? 'Yes' : 'No']),
  ]
  downloadCsv(`audit-log-${isoDate()}.csv`, rows)
  // Logged after the rows are built, so the export does not list its own entry.
  logAudit({ module: 'Audit', action: 'Exported audit log', detail: `${list.length} entries`, sensitive: list.some((e) => e.sensitive) })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Audit log</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">Who did what, and when. Entries are read-only and cannot be edited or deleted.</p>
      </div>

      <button
        type="button"
        :disabled="!sorted.length"
        class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        title="Exports every entry matching the current filters"
        @click="exportCsv"
      >
        <BisIcon name="download" :size="16" />
        Export CSV
      </button>
    </div>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <!-- Quick filters (each shows how many entries it would give) -->
      <div class="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
        <button
          v-for="f in quickFilters"
          :key="f.key"
          type="button"
          :aria-pressed="quick === f.key"
          :class="[
            'relative flex shrink-0 items-center gap-2 px-3 py-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-bis-600',
            quick === f.key ? 'text-bis-700' : 'text-slate-500 hover:text-slate-900',
          ]"
          @click="quick = f.key"
        >
          {{ f.label }}
          <span :class="['rounded-md px-1.5 py-0.5 text-[11px] tabular-nums', quick === f.key ? 'bg-bis-50 text-bis-700' : 'bg-slate-100 text-slate-500']">
            {{ quickCounts[f.key] }}
          </span>
          <span v-if="quick === f.key" class="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-bis-600" />
        </button>
      </div>

      <!-- Search + filters -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3">
        <div class="relative min-w-[14rem] flex-1">
          <label for="audit-search" class="sr-only">Search the audit log</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="audit-search"
            v-model="search"
            type="search"
            placeholder="Search user, action, record or details"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="moduleFilter" label="Filter by module" :options="moduleOptions" />
        <FilterSelect v-model="userFilter" label="Filter by user" :options="userOptions" />
        <FilterSelect v-model="period" label="Filter by date" :options="periodOptions" />
        <template v-if="period === 'custom'">
          <input
            v-model="dateFrom"
            type="date"
            aria-label="From date"
            class="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
          <input
            v-model="dateTo"
            type="date"
            aria-label="To date"
            class="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-800 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </template>
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
      <p v-if="rangeError" role="alert" class="px-4 pb-3 text-[12px] text-red-600">{{ rangeError }}</p>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" :aria-sort="sortDir === 'desc' ? 'descending' : 'ascending'" class="py-2.5 pl-4 pr-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'"
                >
                  When
                  <BisIcon name="chevronDown" :size="14" :class="['text-bis-600', sortDir === 'asc' ? 'rotate-180' : '']" />
                  <span class="sr-only">{{ sortDir === 'desc' ? '(newest first)' : '(oldest first)' }}</span>
                </button>
              </th>
              <th scope="col" class="px-3 py-2.5">User</th>
              <th scope="col" class="px-3 py-2.5">Module</th>
              <th scope="col" class="px-3 py-2.5">Action</th>
              <th scope="col" class="px-3 py-2.5">Record</th>
              <th scope="col" class="hidden px-3 py-2.5 pr-4 lg:table-cell">Details</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="e in pageRows"
              :key="e.id"
              :class="[
                'cursor-pointer border-b border-slate-100 transition-colors last:border-b-0',
                e.sensitive ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50',
              ]"
              @click="activeId = e.id"
            >
              <td class="whitespace-nowrap py-2.5 pl-4 pr-3">
                <button
                  type="button"
                  class="block text-left font-medium text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click.stop="activeId = e.id"
                >
                  {{ formatWhen(e.at) }}
                </button>
                <p class="text-[12px] tabular-nums text-slate-400">{{ e.id }}</p>
              </td>
              <td class="px-3 py-2.5">
                <p class="font-medium text-slate-900">{{ e.user }}</p>
                <p class="text-[12px] text-slate-400">{{ e.role }}</p>
              </td>
              <td class="px-3 py-2.5">
                <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{{ e.module }}</span>
              </td>
              <td class="px-3 py-2.5 text-slate-700">
                {{ e.action }}
                <span v-if="e.sensitive" class="ml-1.5 whitespace-nowrap rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">Confidential</span>
              </td>
              <td class="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-700">{{ e.target ?? '—' }}</td>
              <td class="hidden px-3 py-2.5 pr-4 text-slate-500 lg:table-cell">
                <div class="max-w-[18rem] truncate" :title="e.detail">{{ e.detail ?? '—' }}</div>
              </td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="6" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">No activity matches these filters</p>
                <p class="mt-0.5 text-[13px] text-slate-500">Check the spelling, or widen the filters.</p>
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
        <div class="flex items-center gap-3 text-[12px] text-slate-500">
          <p>
            Showing
            <span class="font-medium tabular-nums text-slate-700">{{ rangeFrom }}–{{ rangeTo }}</span>
            of
            <span class="font-medium tabular-nums text-slate-700">{{ sorted.length }}</span>
            entries
          </p>
          <FilterSelect :model-value="String(pageSize)" label="Rows per page" :options="pageSizeOptions" @update:model-value="pageSize = Number($event)" />
        </div>

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

          <template v-for="(item, i) in pageItems" :key="`${item}-${i}`">
            <span v-if="item === '…'" class="px-1 text-slate-400" aria-hidden="true">…</span>
            <button
              v-else
              type="button"
              :aria-current="item === page ? 'page' : undefined"
              :class="[
                'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] font-medium tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600',
                item === page ? 'bg-bis-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              ]"
              @click="page = item"
            >
              {{ item }}
            </button>
          </template>

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

    <AuditDrawer :entry="activeEntry" @close="activeId = null" />
  </div>
</template>