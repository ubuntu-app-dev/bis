<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import HouseholdDrawer from '@/components/layout/secretary/household-drawer.vue'
import { createSampleHouseholds, toRow, type HouseholdRow } from '@/data/households'

const rowsAll = ref<HouseholdRow[]>(createSampleHouseholds().map(toRow))

/* --------------------------------- Summary -------------------------------- */
const activeRows = computed(() => rowsAll.value.filter((r) => r.status === 'Active'))
const summary = computed(() => {
  const active = activeRows.value
  const members = active.reduce((sum, r) => sum + r.memberCount, 0)
  return [
    { label: 'Active households', value: active.length.toLocaleString() },
    { label: 'Total members', value: members.toLocaleString() },
    { label: 'Avg. household size', value: active.length ? (members / active.length).toFixed(1) : '0' },
    { label: '4Ps households', value: active.filter((r) => r.is4Ps).length.toLocaleString() },
  ]
})

/* --------------------------------- Filters -------------------------------- */
type QuickKey = 'all' | '4ps' | 'indigent' | 'pwd' | 'senior' | 'informal'

const quickFilters: { key: QuickKey; label: string; test: (r: HouseholdRow) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: '4ps', label: '4Ps', test: (r) => r.is4Ps },
  { key: 'indigent', label: 'Indigent', test: (r) => r.isIndigent },
  { key: 'pwd', label: 'With PWD', test: (r) => r.hasPwdMember },
  { key: 'senior', label: 'With senior', test: (r) => r.hasSeniorMember },
  { key: 'informal', label: 'Informal settlers', test: (r) => r.tenure === 'Informal settler' },
]

const DEFAULT_STATUS = 'Active'

const search = ref('')
const purok = ref('all')
const tenure = ref('all')
const size = ref('all')
const status = ref(DEFAULT_STATUS)
const quick = ref<QuickKey>('all')

const purokOptions = [
  { value: 'all', label: 'All puroks' },
  ...Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `Purok ${i + 1}` })),
]
const tenureOptions = [
  { value: 'all', label: 'Any tenure' },
  ...['Owned', 'Rented', 'Informal settler', 'Living with relatives'].map((v) => ({ value: v, label: v })),
]
const sizeOptions = [
  { value: 'all', label: 'Any size' },
  { value: 'small', label: '1–3 members' },
  { value: 'medium', label: '4–6 members' },
  { value: 'large', label: '7+ members' },
]
const statusOptions = [
  { value: 'all', label: 'Any status' },
  ...['Active', 'Transferred', 'Dissolved'].map((v) => ({ value: v, label: v })),
]

function matchesSize(count: number) {
  if (size.value === 'small') return count <= 3
  if (size.value === 'medium') return count >= 4 && count <= 6
  if (size.value === 'large') return count >= 7
  return true
}

const hasActiveFilters = computed(
  () =>
    search.value.trim() !== '' ||
    purok.value !== 'all' ||
    tenure.value !== 'all' ||
    size.value !== 'all' ||
    status.value !== DEFAULT_STATUS ||
    quick.value !== 'all',
)

function clearFilters() {
  search.value = ''
  purok.value = 'all'
  tenure.value = 'all'
  size.value = 'all'
  status.value = DEFAULT_STATUS
  quick.value = 'all'
}

// Everything except the quick tabs, so each tab can show how many households it would give.
const baseFiltered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rowsAll.value.filter(
    (r) =>
      (!q || r.haystack.includes(q)) &&
      (purok.value === 'all' || String(r.purok) === purok.value) &&
      (tenure.value === 'all' || r.tenure === tenure.value) &&
      matchesSize(r.memberCount) &&
      (status.value === 'all' || r.status === status.value),
  )
})

const quickCounts = computed(() =>
  Object.fromEntries(quickFilters.map((f) => [f.key, baseFiltered.value.filter(f.test).length])),
)

/* --------------------------------- Sorting -------------------------------- */
type SortKey = 'household' | 'head' | 'purok' | 'members'
const sortKey = ref<SortKey>('household')
const sortDir = ref<'asc' | 'desc'>('asc')

function sortBy(key: SortKey) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function ariaSort(key: SortKey) {
  if (sortKey.value !== key) return 'none'
  return sortDir.value === 'asc' ? 'ascending' : 'descending'
}

const sorted = computed(() => {
  const test = quickFilters.find((f) => f.key === quick.value)!.test
  const dir = sortDir.value === 'asc' ? 1 : -1
  const byNo = (a: HouseholdRow, b: HouseholdRow) =>
    a.householdNo.localeCompare(b.householdNo, undefined, { numeric: true })
  return baseFiltered.value.filter(test).sort((a, b) => {
    switch (sortKey.value) {
      case 'head':
        return a.headName.localeCompare(b.headName, 'en') * dir
      case 'purok':
        return (a.purok - b.purok || byNo(a, b)) * dir
      case 'members':
        return (a.memberCount - b.memberCount || byNo(a, b)) * dir
      default:
        return byNo(a, b) * dir
    }
  })
})

/* -------------------------------- Pagination ------------------------------- */
const pageSize = ref(10)
const page = ref(1)
const pageSizeOptions = ['10', '25', '50'].map((v) => ({ value: v, label: `${v} per page` }))

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

watch([search, purok, tenure, size, status, quick, pageSize], () => {
  page.value = 1
})

/* -------------------------------- Selection -------------------------------- */
const selected = ref(new Set<string>())

const pageIds = computed(() => pageRows.value.map((r) => r.id))
const allPageSelected = computed(() => pageIds.value.length > 0 && pageIds.value.every((id) => selected.value.has(id)))
const somePageSelected = computed(() => pageIds.value.some((id) => selected.value.has(id)))

function toggleAllOnPage(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  for (const id of pageIds.value) {
    if (checked) selected.value.add(id)
    else selected.value.delete(id)
  }
}

function toggleOne(id: string) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
}

/* ---------------------------------- Drawer --------------------------------- */
const activeId = ref<string | null>(null)
const activeRow = computed(() => rowsAll.value.find((r) => r.id === activeId.value) ?? null)

/* -------------------------------- Export CSV ------------------------------- */
// Guards against spreadsheet formula injection and escapes quotes.
function cell(value: string | number | boolean) {
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function exportCsv(selectedOnly = false) {
  // TODO: record this export in your audit log (who exported what, and when).
  const list = selectedOnly ? rowsAll.value.filter((r) => selected.value.has(r.id)) : sorted.value
  const header = [
    'Household ID', 'Household no.', 'Head last name', 'Head first name', 'Head middle name', 'Purok', 'Address',
    'Members', 'Tenure', '4Ps', 'Indigent', 'With PWD member', 'With senior member', 'Date registered', 'Status',
  ]
  const lines = list.map((r) => [
    r.id, r.householdNo, r.headLastName, r.headFirstName, r.headMiddleName, r.purok, r.address,
    r.memberCount, r.tenure, r.is4Ps ? 'Yes' : 'No', r.isIndigent ? 'Yes' : 'No',
    r.hasPwdMember ? 'Yes' : 'No', r.hasSeniorMember ? 'Yes' : 'No', r.dateRegistered, r.status,
  ])
  const csv = [header, ...lines].map((row) => row.map(cell).join(',')).join('\r\n')

  // ﻿ makes Excel read names with Ñ correctly
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `household-masterlist-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const statusDot: Record<string, string> = {
  Active: 'bg-emerald-500',
  Transferred: 'bg-amber-500',
  Dissolved: 'bg-slate-400',
}

const sortableCols: { key: SortKey; label: string; cls: string }[] = [
  { key: 'household', label: 'Household', cls: '' },
  { key: 'head', label: 'Head of household', cls: '' },
  { key: 'purok', label: 'Purok', cls: '' },
  { key: 'members', label: 'Members', cls: '' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Household records</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">Registry of households and their members in the barangay</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          title="Exports every household matching the current filters"
          @click="exportCsv(false)"
        >
          <BisIcon name="download" :size="16" />
          Export CSV
        </button>
        <RouterLink
          to="/secretary/households/new"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          <BisIcon name="plus" :size="16" :stroke-width="2.25" />
          Add household
        </RouterLink>
      </div>
    </div>

    <!-- Summary (active households only) -->
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div v-for="s in summary" :key="s.label" class="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <dt class="text-[12px] text-slate-500">{{ s.label }}</dt>
        <dd class="mt-1 text-[22px] font-medium leading-7 tabular-nums tracking-[-0.01em] text-bis-900">{{ s.value }}</dd>
      </div>
    </dl>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <!-- Quick filters -->
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
          <span
            :class="[
              'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
              quick === f.key ? 'bg-bis-50 text-bis-700' : 'bg-slate-100 text-slate-500',
            ]"
          >
            {{ quickCounts[f.key] }}
          </span>
          <span v-if="quick === f.key" class="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-bis-600" />
        </button>
      </div>

      <!-- Search + filters -->
      <div class="flex flex-wrap items-center gap-2 px-4 py-3">
        <div class="relative min-w-[14rem] flex-1">
          <label for="household-search" class="sr-only">Search households</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="household-search"
            v-model="search"
            type="search"
            placeholder="Search household no., head of household or address"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>
        <FilterSelect v-model="purok" label="Filter by purok" :options="purokOptions" />
        <FilterSelect v-model="tenure" label="Filter by tenure" :options="tenureOptions" />
        <FilterSelect v-model="size" label="Filter by household size" :options="sizeOptions" />
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

      <!-- Selection bar -->
      <div v-if="selected.size" class="flex items-center gap-4 border-y border-bis-100 bg-bis-50 px-4 py-2 text-[13px] text-bis-700">
        <span class="font-medium tabular-nums">{{ selected.size }} selected</span>
        <button type="button" class="font-medium hover:underline" @click="exportCsv(true)">Export selected</button>
        <button type="button" class="ml-auto font-medium hover:underline" @click="selected.clear()">Clear selection</button>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full min-w-[48rem] text-left text-[13px]">
          <thead>
            <tr class="border-y border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
              <th scope="col" class="w-10 py-2.5 pl-4 pr-1">
                <input
                  type="checkbox"
                  class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600"
                  :checked="allPageSelected"
                  :indeterminate="somePageSelected && !allPageSelected"
                  :disabled="!pageRows.length"
                  aria-label="Select all households on this page"
                  @change="toggleAllOnPage"
                />
              </th>

              <th
                v-for="col in sortableCols"
                :key="col.key"
                scope="col"
                :aria-sort="ariaSort(col.key)"
                :class="['px-3 py-2.5', col.key === 'purok' ? 'hidden sm:table-cell' : '']"
              >
                <button
                  type="button"
                  class="group inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click="sortBy(col.key)"
                >
                  {{ col.label }}
                  <BisIcon
                    :name="sortKey === col.key ? 'chevronDown' : 'sort'"
                    :size="14"
                    :class="[
                      sortKey === col.key ? 'text-bis-600' : 'text-slate-300 group-hover:text-slate-400',
                      sortKey === col.key && sortDir === 'asc' ? 'rotate-180' : '',
                    ]"
                  />
                </button>
              </th>

              <th scope="col" class="hidden px-3 py-2.5 lg:table-cell">Tenure</th>
              <th scope="col" class="hidden px-3 py-2.5 md:table-cell">Classification</th>
              <th scope="col" class="px-3 py-2.5">Status</th>
              <th scope="col" class="w-12 py-2.5 pl-1 pr-4"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in pageRows"
              :key="row.id"
              :class="[
                'cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50',
                selected.has(row.id) ? 'bg-bis-50/60 hover:bg-bis-50' : '',
              ]"
              @click="activeId = row.id"
            >
              <td class="py-2.5 pl-4 pr-1" @click.stop>
                <input
                  type="checkbox"
                  class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600"
                  :checked="selected.has(row.id)"
                  :aria-label="`Select household ${row.householdNo}`"
                  @change="toggleOne(row.id)"
                />
              </td>

              <td class="px-3 py-2.5">
                <button
                  type="button"
                  class="font-medium tabular-nums text-slate-900 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click.stop="activeId = row.id"
                >
                  {{ row.householdNo }}
                </button>
                <p class="text-[12px] tabular-nums text-slate-400">{{ row.id }}</p>
              </td>

              <td class="px-3 py-2.5">
                <div class="flex items-center gap-3">
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-50 text-[11px] font-medium text-bis-700" aria-hidden="true">
                    {{ row.initials }}
                  </span>
                  <div class="min-w-0">
                    <p class="max-w-[14rem] truncate font-medium text-slate-900">{{ row.headName }}</p>
                    <p class="max-w-[14rem] truncate text-[12px] text-slate-400">{{ row.address }}</p>
                  </div>
                </div>
              </td>

              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 sm:table-cell">Purok {{ row.purok }}</td>

              <td class="px-3 py-2.5 tabular-nums text-slate-700">{{ row.memberCount }}</td>

              <td class="hidden whitespace-nowrap px-3 py-2.5 text-slate-700 lg:table-cell">{{ row.tenure }}</td>

              <td class="hidden px-3 py-2.5 md:table-cell">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="tag in row.tags.slice(0, 2)"
                    :key="tag.key"
                    :class="['rounded-md px-1.5 py-0.5 text-[11px] font-medium', tag.class]"
                  >
                    {{ tag.label }}
                  </span>
                  <span
                    v-if="row.tags.length > 2"
                    class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                    :title="row.tags.slice(2).map((t) => t.label).join(', ')"
                  >
                    +{{ row.tags.length - 2 }}
                  </span>
                  <span v-if="!row.tags.length" class="text-slate-300">—</span>
                </div>
              </td>

              <td class="whitespace-nowrap px-3 py-2.5">
                <span class="inline-flex items-center gap-1.5 text-slate-700">
                  <span :class="['size-1.5 rounded-full', statusDot[row.status]]" />
                  {{ row.status }}
                </span>
              </td>

              <td class="py-2.5 pl-1 pr-4 text-right" @click.stop>
                <RouterLink
                  :to="`/secretary/households/${row.id}/edit`"
                  class="inline-flex h-8 items-center rounded-lg px-2.5 text-[12px] font-medium text-bis-600 transition-colors hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  :aria-label="`Edit household ${row.householdNo}`"
                >
                  Edit
                </RouterLink>
              </td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="9" class="px-6 py-16 text-center">
                <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
                  <BisIcon name="search" :size="20" />
                </div>
                <p class="mt-3 text-[14px] font-medium text-bis-900">No households match these filters</p>
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
            households
          </p>
          <FilterSelect
            :model-value="String(pageSize)"
            label="Rows per page"
            :options="pageSizeOptions"
            @update:model-value="pageSize = Number($event)"
          />
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

    <HouseholdDrawer :row="activeRow" @close="activeId = null" />
  </div>
</template>