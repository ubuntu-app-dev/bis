<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import { getBarangays, type BarangayRecord } from '@/data/m/barangayData'
import {
  addAuditEvent,
  categoryLabels,
  getAuditEvents,
  type AuditCategory,
  type AuditEvent,
  type AuditOutcome,
} from '@/data/m/auditData'

const PAGE_SIZE = 10

const events = ref<AuditEvent[]>([])
const barangays = ref<BarangayRecord[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [e, b] = await Promise.all([getAuditEvents(), getBarangays()])
    events.value = e
    barangays.value = b
  } catch {
    error.value = 'Could not load the audit trail. Check your connection and reload the page.'
  } finally {
    loading.value = false
  }
})

// ---------- Filters ----------
const query = ref('')
const category = ref<'all' | AuditCategory>('all')
const barangayId = ref('all')
const period = ref<'1' | '7' | '30' | 'all'>('7')
const page = ref(1)

watch([query, category, barangayId, period], () => {
  page.value = 1
  expanded.value = null
})

const hasFilters = computed(
  () => !!query.value.trim() || category.value !== 'all' || barangayId.value !== 'all' || period.value !== '7',
)

function clearFilters() {
  query.value = ''
  category.value = 'all'
  barangayId.value = 'all'
  period.value = '7'
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const since = period.value === 'all' ? 0 : Date.now() - Number(period.value) * 86_400_000
  return events.value.filter(
    (e) =>
      e.at >= since &&
      (category.value === 'all' || e.category === category.value) &&
      (barangayId.value === 'all' || e.barangayId === barangayId.value) &&
      (!q || `${e.actorName} ${e.action} ${e.target} ${e.barangayName ?? ''}`.toLowerCase().includes(q)),
  )
})

const count = (c: AuditCategory) => filtered.value.filter((e) => e.category === c).length
const summary = computed(() => [
  { label: 'Events', value: filtered.value.length, note: 'In the selected period' },
  { label: 'Record changes', value: count('record-change'), note: 'Residents and households' },
  { label: 'Administrative actions', value: count('admin'), note: 'Accounts and roles' },
  { label: 'Record access', value: count('record-access'), note: `${filtered.value.filter((e) => e.outcome === 'denied').length} blocked attempts` },
])

// ---------- Paging ----------
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const from = computed(() => (filtered.value.length ? (page.value - 1) * PAGE_SIZE + 1 : 0))
const to = computed(() => Math.min(page.value * PAGE_SIZE, filtered.value.length))

function go(n: number) {
  page.value = Math.min(pageCount.value, Math.max(1, n))
  expanded.value = null
}

// ---------- Row details ----------
const expanded = ref<string | null>(null)
const hasDetails = (e: AuditEvent) => !!(e.note || e.changes?.length)
const toggle = (id: string) => (expanded.value = expanded.value === id ? null : id)

// ---------- Export ----------
const exporting = ref(false)

async function exportCsv() {
  exporting.value = true
  try {
    const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`
    const header = ['When', 'Who', 'Role', 'Type', 'Action', 'Target', 'Barangay', 'Result']
    const lines = filtered.value.map((e) =>
      [
        new Date(e.at).toISOString(),
        e.actorName,
        e.actorRole,
        categoryLabels[e.category],
        e.action,
        e.target,
        e.barangayName ?? '',
        e.outcome,
      ]
        .map(csvCell)
        .join(','),
    )
    const blob = new Blob(['\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    // Exporting is itself an auditable action.
    const logged = await addAuditEvent({
      actorName: 'Municipal Officer',
      actorRole: 'Municipal staff',
      category: 'report',
      action: 'Exported the audit trail to CSV',
      target: `${filtered.value.length} events`,
      outcome: 'success',
    })
    events.value = [logged, ...events.value]
  } finally {
    exporting.value = false
  }
}

// ---------- Display ----------
const categoryStyle: Record<AuditCategory, string> = {
  'record-change': 'bg-bis-50 text-bis-700',
  'record-access': 'bg-violet-50 text-violet-700',
  admin: 'bg-slate-100 text-slate-700',
  report: 'bg-sky-50 text-sky-800',
}
const outcomeStyle: Partial<Record<AuditOutcome, { label: string; cls: string }>> = {
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-700' },
  denied: { label: 'Blocked', cls: 'bg-red-50 text-red-700' },
}

const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function ago(ms: number) {
  const minutes = Math.max(1, Math.round((Date.now() - ms) / 60_000))
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const card = 'rounded-xl border border-slate-200 bg-white'
const selectCls =
  'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-colors focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const pagerBtn =
  'inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Audit trail</h1>
        <p class="mt-1 text-sm text-slate-600">
          Who changed records, opened resident data, or took administrative actions. Entries cannot be edited or
          deleted.
        </p>
      </div>
      <button
        type="button"
        :disabled="exporting || loading || filtered.length === 0"
        class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        @click="exportCsv"
      >
        <BisIcon name="download" :size="16" />
        Export CSV
      </button>
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
          <div class="h-7 w-12 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
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

    <!-- Log -->
    <section :class="card" aria-label="Audit events">
      <div class="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4">
        <div class="relative w-full sm:w-64">
          <label for="audit-search" class="sr-only">Search events</label>
          <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="audit-search"
            v-model="query"
            type="search"
            placeholder="Search person, action or target"
            autocomplete="off"
            class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-bis-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bis-600/20"
          />
        </div>

        <div>
          <label for="audit-period" class="mb-1 block text-xs text-slate-600">Period</label>
          <select id="audit-period" v-model="period" :class="selectCls">
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        <div>
          <label for="audit-type" class="mb-1 block text-xs text-slate-600">Type</label>
          <select id="audit-type" v-model="category" :class="selectCls">
            <option value="all">All types</option>
            <option v-for="(text, key) in categoryLabels" :key="key" :value="key">{{ text }}</option>
          </select>
        </div>

        <div>
          <label for="audit-barangay" class="mb-1 block text-xs text-slate-600">Barangay</label>
          <select id="audit-barangay" v-model="barangayId" :class="selectCls">
            <option value="all">All barangays</option>
            <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>

        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="clearFilters"
        >
          <BisIcon name="x" :size="14" />
          Reset filters
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[58rem] text-sm">
          <caption class="sr-only">Audit events, newest first</caption>
          <thead>
            <tr class="border-b border-slate-200 text-left text-xs text-slate-600">
              <th scope="col" class="px-5 py-2.5 font-medium">When</th>
              <th scope="col" class="px-5 py-2.5 font-medium">Who</th>
              <th scope="col" class="px-5 py-2.5 font-medium">Action</th>
              <th scope="col" class="px-5 py-2.5 font-medium">Type</th>
              <th scope="col" class="px-5 py-2.5 font-medium">Barangay</th>
              <th scope="col" class="px-3 py-2.5"><span class="sr-only">Details</span></th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <template v-if="loading">
              <tr v-for="n in 6" :key="n">
                <td v-for="m in 6" :key="m" class="px-5 py-4">
                  <div class="h-4 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                </td>
              </tr>
            </template>

            <tr v-else-if="filtered.length === 0">
              <td colspan="6" class="px-5 py-12 text-center">
                <p class="font-medium text-slate-900">No events match these filters</p>
                <p class="mt-1 text-sm text-slate-600">Try a longer period or a different type.</p>
                <button
                  type="button"
                  class="mt-2 text-sm font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  @click="clearFilters"
                >
                  Reset filters
                </button>
              </td>
            </tr>

            <template v-else>
              <template v-for="e in pageRows" :key="e.id">
                <tr class="align-top transition-colors hover:bg-slate-50">
                  <td class="whitespace-nowrap px-5 py-3">
                    <p class="text-slate-900">{{ dateTime.format(e.at) }}</p>
                    <p class="text-xs text-slate-500">{{ ago(e.at) }}</p>
                  </td>
                  <td class="px-5 py-3">
                    <p class="text-slate-900">{{ e.actorName }}</p>
                    <p class="text-xs text-slate-500">{{ e.actorRole }}</p>
                  </td>
                  <td class="px-5 py-3">
                    <p class="text-slate-900">
                      {{ e.action }}
                      <span
                        v-if="outcomeStyle[e.outcome]"
                        :class="['ml-1.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', outcomeStyle[e.outcome]?.cls]"
                      >
                        {{ outcomeStyle[e.outcome]?.label }}
                      </span>
                    </p>
                    <p class="text-xs text-slate-600">{{ e.target }}</p>
                  </td>
                  <td class="px-5 py-3">
                    <span :class="['inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', categoryStyle[e.category]]">
                      {{ categoryLabels[e.category] }}
                    </span>
                  </td>
                  <td class="px-5 py-3 text-slate-700">{{ e.barangayName ?? 'Municipality' }}</td>
                  <td class="px-3 py-3 text-right">
                    <button
                      v-if="hasDetails(e)"
                      type="button"
                      class="inline-grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                      :aria-expanded="expanded === e.id"
                      :aria-controls="`details-${e.id}`"
                      @click="toggle(e.id)"
                    >
                      <BisIcon
                        name="chevronDown"
                        :size="16"
                        :class="['transition-transform duration-150 motion-reduce:transition-none', expanded === e.id ? 'rotate-180' : '']"
                      />
                      <span class="sr-only">{{ expanded === e.id ? 'Hide' : 'Show' }} details</span>
                    </button>
                  </td>
                </tr>

                <tr v-if="expanded === e.id" :id="`details-${e.id}`" class="bg-slate-50">
                  <td colspan="6" class="px-5 py-4">
                    <div class="grid gap-4 text-sm sm:grid-cols-2">
                      <div v-if="e.changes?.length">
                        <p class="mb-2 text-xs font-medium text-slate-600">What changed</p>
                        <ul class="space-y-1.5">
                          <li v-for="c in e.changes" :key="c.field" class="flex flex-wrap items-center gap-x-2 text-slate-700">
                            <span class="font-medium text-slate-900">{{ c.field }}</span>
                            <span class="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700 line-through">{{ c.from }}</span>
                            <BisIcon name="arrowUpRight" :size="14" class="text-slate-400" />
                            <span class="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{{ c.to }}</span>
                          </li>
                        </ul>
                      </div>
                      <div v-if="e.note">
                        <p class="mb-2 text-xs font-medium text-slate-600">Note</p>
                        <p class="text-slate-700">{{ e.note }}</p>
                      </div>
                      <p class="text-xs text-slate-500 sm:col-span-2">Event {{ e.id }}</p>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pager -->
      <div
        v-if="!loading && filtered.length > 0"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"
      >
        <p class="text-sm text-slate-600" aria-live="polite">
          Showing {{ from }} to {{ to }} of {{ filtered.length }} events
        </p>
        <div class="flex items-center gap-2">
          <button type="button" :class="pagerBtn" :disabled="page === 1" @click="go(page - 1)">
            <BisIcon name="chevronLeft" :size="16" />
            Previous
          </button>
          <span class="px-1 text-sm tabular-nums text-slate-600">Page {{ page }} of {{ pageCount }}</span>
          <button type="button" :class="pagerBtn" :disabled="page === pageCount" @click="go(page + 1)">
            Next
            <BisIcon name="chevronRight" :size="16" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>