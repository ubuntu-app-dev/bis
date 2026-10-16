<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import FilterSelect from '@/components/layout/secretary/filter-select.vue'
import { createSampleResidents, toRow, type ResidentRow } from '@/data/residents'
import { computeDemographics, niceMax, percent, type CountItem } from '@/utils/demographics'

const rowsAll = ref<ResidentRow[]>(createSampleResidents().map(toRow))

/* --------------------------------- Filters -------------------------------- */
const DEFAULT_STATUS = 'Active'
const purok = ref('all')
const status = ref(DEFAULT_STATUS)
const view = ref<'charts' | 'tables'>('charts')

const purokOptions = [
  { value: 'all', label: 'All puroks' },
  ...Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: `Purok ${i + 1}` })),
]
const statusOptions = [
  { value: 'all', label: 'Any status' },
  ...['Active', 'Transferred', 'Deceased'].map((v) => ({ value: v, label: v })),
]

const hasActiveFilters = computed(() => purok.value !== 'all' || status.value !== DEFAULT_STATUS)
function clearFilters() {
  purok.value = 'all'
  status.value = DEFAULT_STATUS
}

const filtered = computed(() =>
  rowsAll.value.filter(
    (r) => (purok.value === 'all' || String(r.purok) === purok.value) && (status.value === 'all' || r.status === status.value),
  ),
)

const d = computed(() => computeDemographics(filtered.value))

const scopeLabel = computed(() => {
  const who = status.value === 'all' ? 'All residents' : `${status.value} residents`
  return purok.value === 'all' ? `${who} · all puroks` : `${who} · Purok ${purok.value}`
})

/* ---------------------------------- Tooltip -------------------------------- */
interface TipLine {
  label: string
  value: string
  color?: string
}
const tip = reactive({ show: false, x: 0, y: 0, title: '', lines: [] as TipLine[] })

function openTip(e: MouseEvent | FocusEvent, title: string, lines: TipLine[]) {
  tip.title = title
  tip.lines = lines
  if (e instanceof MouseEvent) {
    tip.x = e.clientX
    tip.y = e.clientY
  } else {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    tip.x = r.left + r.width / 2
    tip.y = r.top + r.height / 2
  }
  tip.show = true
}
function closeTip() {
  tip.show = false
}
const tipStyle = computed(() => ({
  left: `${Math.max(8, Math.min(tip.x + 14, window.innerWidth - 230))}px`,
  top: `${Math.max(8, Math.min(tip.y + 16, window.innerHeight - 130))}px`,
}))

/* ------------------------------------ KPIs ---------------------------------- */
const fmt = (n: number) => n.toLocaleString()
const kpis = computed(() => {
  const x = d.value
  return [
    { label: 'Total residents', value: fmt(x.total), sub: `${fmt(x.male)} male · ${fmt(x.female)} female` },
    { label: 'Households', value: fmt(x.households), sub: x.households ? `Avg. ${x.avgHouseholdSize.toFixed(1)} members each` : '—' },
    { label: 'Median age', value: x.total ? String(x.medianAge) : '—', sub: x.total ? `Average ${x.meanAge.toFixed(1)} years` : '—' },
    { label: 'Registered voters', value: fmt(x.voters), sub: `${percent(x.voters, x.total)} of residents` },
    {
      label: 'Age dependency ratio',
      value: x.dependency.ratio === null ? '—' : String(x.dependency.ratio),
      sub: 'Per 100 residents aged 15–64',
    },
  ]
})

/* ---------------------------------- Pyramid --------------------------------- */
const axisMax = computed(() => niceMax(d.value.pyramid.max))
const pyramidRows = computed(() => [...d.value.pyramid.bands].reverse()) // oldest on top
const barWidth = (n: number) => `${(n / axisMax.value) * 100}%`
const barMin = (n: number) => (n > 0 ? '3px' : '0')

const largestBand = computed(() =>
  d.value.pyramid.bands.reduce((best, b) => (b.total > best.total ? b : best), d.value.pyramid.bands[0]),
)

function pyramidTip(e: MouseEvent | FocusEvent, b: (typeof pyramidRows.value)[number]) {
  openTip(e, `Age ${b.label}`, [
    { label: 'Male', value: fmt(b.male), color: 'var(--viz-male)' },
    { label: 'Female', value: fmt(b.female), color: 'var(--viz-female)' },
    { label: 'Total', value: `${fmt(b.total)} (${percent(b.total, d.value.total)})` },
  ])
}

/* -------------------------------- Bar cards --------------------------------- */
interface BarItem {
  key: string
  label: string
  count: number
  lines: TipLine[]
}
interface BarCard {
  id: string
  title: string
  note: string
  scale: number
  items: BarItem[]
  headers: string[]
  rows: string[][]
}

function simpleItems(items: CountItem[], total: number): BarItem[] {
  return items.map((i) => ({
    key: i.key,
    label: i.label,
    count: i.count,
    lines: [
      { label: 'Residents', value: fmt(i.count) },
      { label: 'Share', value: percent(i.count, total) },
    ],
  }))
}
function simpleRows(items: CountItem[], total: number) {
  return items.map((i) => [i.label, fmt(i.count), percent(i.count, total)])
}
function largest(items: { label: string; count: number }[]) {
  const top = items.reduce((b, i) => (i.count > b.count ? i : b), items[0])
  return top && top.count > 0 ? top : null
}

const barCards = computed<BarCard[]>(() => {
  const x = d.value
  const total = x.total
  const max = (items: { count: number }[]) => Math.max(1, ...items.map((i) => i.count))

  const civilTop = largest(x.byCivil)
  const purokItems: BarItem[] = x.byPurok.map((p) => ({
    key: String(p.purok),
    label: `Purok ${p.purok}`,
    count: p.total,
    lines: [
      { label: 'Male', value: fmt(p.male), color: 'var(--viz-male)' },
      { label: 'Female', value: fmt(p.female), color: 'var(--viz-female)' },
      { label: 'Total', value: `${fmt(p.total)} (${percent(p.total, total)})` },
    ],
  }))
  const purokTop = largest(purokItems)
  const sectors = [...x.sectors].sort((a, b) => b.count - a.count)

  return [
    {
      id: 'age',
      title: 'Age groups',
      note: 'Minors, working-age adults and senior citizens',
      scale: Math.max(1, total),
      items: simpleItems(x.ageGroups, total),
      headers: ['Age group', 'Residents', '% of residents'],
      rows: simpleRows(x.ageGroups, total),
    },
    {
      id: 'civil',
      title: 'Civil status',
      note: civilTop ? `Most common: ${civilTop.label}` : 'No data',
      scale: max(x.byCivil),
      items: simpleItems(x.byCivil, total),
      headers: ['Civil status', 'Residents', '% of residents'],
      rows: simpleRows(x.byCivil, total),
    },
    {
      id: 'purok',
      title: 'Population by purok',
      note: purokTop ? `Most populated: ${purokTop.label}` : 'No data',
      scale: max(purokItems),
      items: purokItems,
      headers: ['Purok', 'Male', 'Female', 'Total', '% of residents'],
      rows: x.byPurok.map((p) => [`Purok ${p.purok}`, fmt(p.male), fmt(p.female), fmt(p.total), percent(p.total, total)]),
    },
    {
      id: 'sectors',
      title: 'Special sectors',
      note: 'Share of all residents; a resident can belong to several',
      scale: Math.max(1, total),
      items: simpleItems(sectors, total),
      headers: ['Sector', 'Residents', '% of residents'],
      rows: simpleRows(sectors, total),
    },
    {
      id: 'jobs',
      title: 'Occupation',
      note: 'Top six occupations; the rest are grouped as Other',
      scale: max(x.occupations),
      items: simpleItems(x.occupations, total),
      headers: ['Occupation', 'Residents', '% of residents'],
      rows: simpleRows(x.occupations, total),
    },
  ]
})

/* --------------------------------- Table view -------------------------------- */
const viewOptions = [
  { key: 'charts', label: 'Charts' },
  { key: 'tables', label: 'Tables' },
] as const

const tableCards = computed(() => [
  {
    id: 'pyramid',
    title: 'Population by age and sex',
    headers: ['Age group', 'Male', 'Female', 'Total', '% of residents'],
    rows: d.value.pyramid.bands.map((b) => [b.label, fmt(b.male), fmt(b.female), fmt(b.total), percent(b.total, d.value.total)]),
  },
  ...barCards.value.map((c) => ({ id: c.id, title: c.title, headers: c.headers, rows: c.rows })),
])
</script>

<template>
  <div class="viz-root space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <nav class="flex items-center gap-1.5 text-[12px] text-slate-500" aria-label="Breadcrumb">
          <RouterLink to="/secretary/residents" class="hover:text-bis-700 hover:underline">Resident records</RouterLink>
          <BisIcon name="chevronRight" :size="12" />
          <span class="text-slate-700" aria-current="page">Demographics</span>
        </nav>
        <h1 class="mt-2 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Resident demographics</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">Population profile of the barangay · {{ scopeLabel }}</p>
      </div>

      <div class="inline-flex rounded-lg border border-slate-300 bg-white p-0.5" role="group" aria-label="Display mode">
        <button
          v-for="opt in viewOptions"
          :key="opt.key"
          type="button"
          :aria-pressed="view === opt.key"
          :class="[
            'h-8 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600',
            view === opt.key ? 'bg-bis-600 text-white' : 'text-slate-600 hover:bg-slate-100',
          ]"
          @click="view = opt.key"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <FilterSelect v-model="purok" label="Filter by purok" :options="purokOptions" />
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

    <!-- KPI row -->
    <dl class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <div v-for="k in kpis" :key="k.label" class="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <dt class="text-[12px] text-slate-500">{{ k.label }}</dt>
        <dd class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">{{ k.value }}</dd>
        <dd class="mt-0.5 text-[12px] text-slate-500">{{ k.sub }}</dd>
      </div>
    </dl>

    <!-- Empty -->
    <section v-if="!d.total" class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <BisIcon name="search" :size="20" />
      </div>
      <p class="mt-3 text-[14px] font-medium text-bis-900">No residents match these filters</p>
      <p class="mt-0.5 text-[13px] text-slate-500">Widen the filters to see demographic figures.</p>
      <button
        v-if="hasActiveFilters"
        type="button"
        class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
        @click="clearFilters"
      >
        Clear filters
      </button>
    </section>

    <!-- Charts -->
    <div v-else-if="view === 'charts'" class="grid gap-4 lg:grid-cols-3">
      <!-- Population pyramid -->
      <section class="rounded-xl border border-slate-200 bg-white lg:col-span-2 lg:row-span-2">
        <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 class="text-[15px] font-medium text-bis-900">Population by age and sex</h2>
            <p class="mt-0.5 text-[13px] text-slate-500">
              Largest age group: {{ largestBand.label }} ({{ fmt(largestBand.total) }} residents)
            </p>
          </div>
          <ul class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-700" aria-label="Legend">
            <li class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-sm bg-[var(--viz-male)]" aria-hidden="true" />
              Male <span class="tabular-nums text-slate-500">{{ fmt(d.male) }} · {{ percent(d.male, d.total) }}</span>
            </li>
            <li class="inline-flex items-center gap-1.5">
              <span class="size-2.5 rounded-sm bg-[var(--viz-female)]" aria-hidden="true" />
              Female <span class="tabular-nums text-slate-500">{{ fmt(d.female) }} · {{ percent(d.female, d.total) }}</span>
            </li>
          </ul>
        </header>

        <div class="px-5 pb-4 pt-4">
          <div class="space-y-[3px]">
            <div
              v-for="b in pyramidRows"
              :key="b.label"
              class="grid h-[22px] cursor-default grid-cols-[1fr_3.25rem_1fr] items-center rounded hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
              tabindex="0"
              role="img"
              :aria-label="`Age ${b.label}: ${b.male} male, ${b.female} female`"
              @mouseenter="pyramidTip($event, b)"
              @mousemove="pyramidTip($event, b)"
              @mouseleave="closeTip"
              @focus="pyramidTip($event, b)"
              @blur="closeTip"
            >
              <div class="flex justify-end">
                <div class="h-4 rounded-l-[4px] bg-[var(--viz-male)]" :style="{ width: barWidth(b.male), minWidth: barMin(b.male) }" />
              </div>
              <span class="text-center text-[11px] tabular-nums text-slate-500">{{ b.label }}</span>
              <div class="flex justify-start">
                <div class="h-4 rounded-r-[4px] bg-[var(--viz-female)]" :style="{ width: barWidth(b.female), minWidth: barMin(b.female) }" />
              </div>
            </div>
          </div>

          <!-- Axis -->
          <div class="mt-2 grid grid-cols-[1fr_3.25rem_1fr] border-t border-slate-200 pt-1.5 text-[11px] tabular-nums text-slate-400">
            <div class="flex justify-between"><span>{{ fmt(axisMax) }}</span><span>0</span></div>
            <span class="text-center">Age</span>
            <div class="flex justify-between"><span>0</span><span>{{ fmt(axisMax) }}</span></div>
          </div>
        </div>
      </section>

      <!-- Bar cards -->
      <section v-for="card in barCards" :key="card.id" class="rounded-xl border border-slate-200 bg-white">
        <header class="border-b border-slate-200 px-5 py-4">
          <h2 class="text-[15px] font-medium text-bis-900">{{ card.title }}</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">{{ card.note }}</p>
        </header>

        <ul class="px-5 py-3">
          <li
            v-for="item in card.items"
            :key="item.key"
            class="grid cursor-default grid-cols-[7.5rem_1fr_5.25rem] items-center gap-3 rounded py-1.5 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            tabindex="0"
            role="img"
            :aria-label="`${item.label}: ${item.count} residents`"
            @mouseenter="openTip($event, item.label, item.lines)"
            @mousemove="openTip($event, item.label, item.lines)"
            @mouseleave="closeTip"
            @focus="openTip($event, item.label, item.lines)"
            @blur="closeTip"
          >
            <span class="truncate text-[13px] text-slate-700" :title="item.label">{{ item.label }}</span>
            <div class="h-3 border-l border-slate-300">
              <div
                class="h-3 rounded-r-[4px] bg-[var(--viz-count)]"
                :style="{ width: `${(item.count / card.scale) * 100}%`, minWidth: item.count > 0 ? '3px' : '0' }"
              />
            </div>
            <span class="text-right text-[12px] tabular-nums text-slate-700">
              {{ fmt(item.count) }}
              <span class="text-slate-400">· {{ percent(item.count, d.total, 0) }}</span>
            </span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Tables -->
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <section
        v-for="t in tableCards"
        :key="t.id"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white"
      >
        <header class="border-b border-slate-200 px-5 py-4">
          <h2 class="text-[15px] font-medium text-bis-900">{{ t.title }}</h2>
        </header>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-[13px]">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50 text-[12px] font-medium text-slate-500">
                <th v-for="(h, i) in t.headers" :key="h" scope="col" :class="['px-5 py-2.5', i > 0 ? 'text-right' : '']">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, ri) in t.rows" :key="ri" class="border-b border-slate-100 last:border-b-0">
                <th scope="row" class="px-5 py-2 font-normal text-slate-700">{{ row[0] }}</th>
                <td v-for="(cell, ci) in row.slice(1)" :key="ci" class="px-5 py-2 text-right tabular-nums text-slate-700">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <p class="text-[12px] leading-5 text-slate-500">
      Figures are computed live from the resident masterlist and follow the filters above. Age dependency ratio = (residents under 15 + residents aged 65 and over) ÷ residents aged 15–64 × 100.
    </p>

    <!-- Tooltip -->
    <div
      v-if="tip.show"
      class="pointer-events-none fixed z-[100000] min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
      :style="tipStyle"
      role="tooltip"
    >
      <p class="text-[12px] font-medium text-slate-900">{{ tip.title }}</p>
      <ul class="mt-1 space-y-0.5">
        <li v-for="l in tip.lines" :key="l.label" class="flex items-center justify-between gap-4 text-[12px] text-slate-600">
          <span class="inline-flex items-center gap-1.5">
            <span v-if="l.color" class="size-2 rounded-sm" :style="{ background: l.color }" aria-hidden="true" />
            {{ l.label }}
          </span>
          <span class="tabular-nums text-slate-900">{{ l.value }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Chart colors. Male/Female are validated categorical slots 1–2; counts use slot 3.
   Change --viz-count to your brand color if you prefer (any single hue works for count bars). */
.viz-root {
  --viz-male: #2a78d6;
  --viz-female: #eb6834;
  --viz-count: #1baf7a;
}
:global(.dark) .viz-root {
  --viz-male: #3987e5;
  --viz-female: #d95926;
  --viz-count: #199e70;
}
</style>