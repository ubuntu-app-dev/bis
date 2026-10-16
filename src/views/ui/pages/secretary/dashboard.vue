<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import RingChart from '@/components/dashboard/secretary/ring-chart.vue'
import type { BisIconName } from '@/icons/bisIcons'

/* -------------------------------------------------------------------------- */
/* SAMPLE DATA: replace with your API response (e.g. GET /api/dashboard)       */
/* -------------------------------------------------------------------------- */

// Blues = multi-person family households; other colors are distinct on purpose.
const householdTypes = [
  { key: 'Nuclear', color: '#1326cf' },
  { key: 'Extended', color: '#4d6bea' },
  { key: 'Multi-gen', color: '#93a5f3' },
  { key: 'Single-parent', color: '#2a9d8f' },
  { key: 'Single-person', color: '#e0a526' },
  { key: 'Other', color: '#cbd5e1' },
]

// One row per purok. `counts` follows the order of `householdTypes`.
const purokData = ref([
  { purok: 'Purok 1', counts: [118, 44, 53, 35, 24, 20], residents: 996 },
  { purok: 'Purok 2', counts: [145, 52, 61, 38, 26, 22], residents: 1166 },
  { purok: 'Purok 3', counts: [105, 40, 48, 30, 22, 18], residents: 891 },
  { purok: 'Purok 4', counts: [160, 58, 66, 42, 30, 24], residents: 1288 },
  { purok: 'Purok 5', counts: [88, 33, 38, 25, 19, 14], residents: 735 },
  { purok: 'Purok 6', counts: [130, 48, 56, 36, 25, 20], residents: 1068 },
  { purok: 'Purok 7', counts: [140, 52, 60, 38, 28, 20], residents: 1144 },
])

const gender = ref({ male: 3054, female: 4234 })

// Age groups (check the age ranges against your offline system)
const ageGroups = ref([
  { label: 'Children', value: 1268, color: '#4d8df0' },
  { label: 'Teens', value: 947, color: '#e8a23b' },
  { label: 'Adults', value: 4439, color: '#1326cf' },
  { label: 'Seniors', value: 634, color: '#e5506a' },
])

// Sector names are placeholders; rename to match your offline system.
const livelihood = ref([
  { label: 'Agriculture', value: 170, color: '#4fb583' },
  { label: 'Trade & retail', value: 110, color: '#4da3e8' },
  { label: 'Services', value: 95, color: '#6366e8' },
  { label: 'Labor & construction', value: 65, color: '#e8a23b' },
])

// Income classes are placeholders; `vulnerable` marks the groups counted in the alert.
const incomeClasses = ref([
  { label: 'Indigent', value: 412, color: '#e5506a', vulnerable: true },
  { label: 'Low income', value: 868, color: '#f0c04a', vulnerable: true },
  { label: 'Lower middle', value: 640, color: '#4d8df0', vulnerable: false },
  { label: 'Middle', value: 190, color: '#4fb583', vulnerable: false },
  { label: 'Upper', value: 41, color: '#6366e8', vulnerable: false },
])

const newResidents30d = ref(40)
const encodedPercent = ref(98)
const activeBlotters = ref(12)
const updatedAt = ref(new Date())

// Business rules (adjust to your barangay's policy)
const PUROK_ALERT_THRESHOLD = 0.2 // flag a purok when it is 20% above the barangay average
const VULNERABILITY_ALERT_SHARE = 0.5 // alert when half or more of households are vulnerable
/* -------------------------------------------------------------------------- */

const fmt = (n: number) => n.toLocaleString('en-PH')
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

function withShare<T extends { value: number }>(items: T[]) {
  const total = sum(items.map((i) => i.value))
  return items.map((i) => ({ ...i, percent: total ? ((i.value / total) * 100).toFixed(1) : '0.0' }))
}

const totalResidents = computed(() => gender.value.male + gender.value.female)
const totalHouseholds = computed(() => sum(purokData.value.map((p) => sum(p.counts))))

const updatedLabel = computed(
  () => `Today, ${updatedAt.value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`,
)

/* ---------------------------------- KPIs ---------------------------------- */
interface Kpi {
  label: string
  value: string
  note: string
  noteClass: string
  icon: BisIconName
  tileClass: string
  trend?: boolean
}

const kpis = computed<Kpi[]>(() => [
  {
    label: 'Residents',
    value: fmt(totalResidents.value),
    note: `+${newResidents30d.value} in 30 days`,
    noteClass: 'text-emerald-600',
    icon: 'users',
    tileClass: 'bg-bis-50 text-bis-600',
    trend: true,
  },
  {
    label: 'Households',
    value: fmt(totalHouseholds.value),
    note: `${encodedPercent.value}% encoded`,
    noteClass: 'text-slate-500',
    icon: 'home',
    tileClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Active blotters',
    value: fmt(activeBlotters.value),
    note: 'Needs resolution',
    noteClass: 'text-amber-600',
    icon: 'clock',
    tileClass: 'bg-amber-50 text-amber-600',
  },
])

/* ------------------------- Household composition -------------------------- */
// All bars share one scale (the biggest purok fills the track), so lengths are comparable.
const maxTotal = computed(() => Math.max(...purokData.value.map((p) => sum(p.counts))))

const rows = computed(() =>
  purokData.value.map((p) => {
    const total = sum(p.counts)
    return {
      purok: p.purok,
      total,
      segments: householdTypes.map((t, i) => ({
        key: t.key,
        color: t.color,
        value: p.counts[i],
        width: (p.counts[i] / maxTotal.value) * 100,
        percent: Math.round((p.counts[i] / total) * 100),
      })),
    }
  }),
)

const typeSummary = computed(() =>
  householdTypes.map((t, i) => {
    const total = sum(purokData.value.map((p) => p.counts[i]))
    return { ...t, total, percent: Math.round((total / totalHouseholds.value) * 100) }
  }),
)

// Hover/focus or click a legend item to spotlight one household type.
const hovered = ref<string | null>(null)
const pinned = ref<string | null>(null)
const spotlight = computed(() => hovered.value ?? pinned.value)

/* --------------------------- Gender distribution -------------------------- */
const genderRows = computed(() =>
  withShare([
    { label: 'Male', value: gender.value.male, color: '#1326cf' },
    { label: 'Female', value: gender.value.female, color: '#e5506a' },
  ]),
)
const genderSummary = computed(() => genderRows.value.map((r) => `${r.label} ${r.percent}%`).join(', '))

/* ---------------------------- Population by purok ------------------------- */
const POPULATION_COLOR = '#2a3de0'
const FLAGGED_COLOR = '#e5506a'

const averageResidents = computed(() => sum(purokData.value.map((p) => p.residents)) / purokData.value.length)

// Pick a round axis step (100, 200, 250, 500, 1000...) so there are about 3 gridlines.
function niceStep(max: number, targetTicks = 3) {
  const raw = max / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
}

const maxResidents = computed(() => Math.max(...purokData.value.map((p) => p.residents)))
const axisStep = computed(() => niceStep(maxResidents.value))
// 10% headroom so the value label above the tallest bar never gets cut off
const axisMax = computed(() => Math.ceil((maxResidents.value * 1.1) / axisStep.value) * axisStep.value)
const ticks = computed(() =>
  Array.from({ length: Math.round(axisMax.value / axisStep.value) + 1 }, (_, i) => i * axisStep.value),
)

const populationBars = computed(() =>
  purokData.value.map((p) => {
    const diff = (p.residents - averageResidents.value) / averageResidents.value
    const diffPercent = Math.round(diff * 100)
    return {
      purok: p.purok,
      residents: p.residents,
      height: (p.residents / axisMax.value) * 100,
      flagged: diff > PUROK_ALERT_THRESHOLD,
      diffPercent,
      tooltip: `${p.purok}: ${fmt(p.residents)} residents (${diffPercent >= 0 ? '+' : ''}${diffPercent}% vs average)`,
    }
  }),
)

const flaggedPuroks = computed(() => populationBars.value.filter((b) => b.flagged))
const alertMessage = computed(() => {
  const pct = Math.round(PUROK_ALERT_THRESHOLD * 100)
  if (!flaggedPuroks.value.length) return `No purok is more than ${pct}% above the barangay average.`
  const list = flaggedPuroks.value.map((b) => `${b.purok} (+${b.diffPercent}%)`).join(', ')
  const verb = flaggedPuroks.value.length === 1 ? 'is' : 'are'
  return `Alert: ${list} ${verb} more than ${pct}% above the barangay average.`
})

const columnGrid = computed(() => ({ gridTemplateColumns: `repeat(${purokData.value.length}, minmax(0, 1fr))` }))

/* ------------------------------ Age distribution -------------------------- */
const ageRows = computed(() => withShare(ageGroups.value))
const ageTotal = computed(() => sum(ageGroups.value.map((g) => g.value)))

/* ----------------------------- Livelihood profile ------------------------- */
const livelihoodRows = computed(() => withShare(livelihood.value))
const workforce = computed(() => sum(livelihood.value.map((l) => l.value)))
const livelihoodSummary = computed(() => livelihoodRows.value.map((r) => `${r.label} ${r.percent}%`).join(', '))

/* --------------------------- Socioeconomic profile ------------------------ */
const incomeRows = computed(() => withShare(incomeClasses.value))
const incomeTotal = computed(() => sum(incomeClasses.value.map((c) => c.value)))
const vulnerableShare = computed(
  () => sum(incomeClasses.value.filter((c) => c.vulnerable).map((c) => c.value)) / incomeTotal.value,
)
const showVulnerabilityAlert = computed(() => vulnerableShare.value >= VULNERABILITY_ALERT_SHARE)
const incomeSummary = computed(() => incomeRows.value.map((r) => `${r.label} ${r.percent}%`).join(', '))

/* ------------------------------- Export CSV ------------------------------- */
function exportCsv() {
  const header = ['Purok', ...householdTypes.map((t) => t.key), 'Total households', 'Residents']
  const lines = purokData.value.map((p) => [p.purok, ...p.counts, sum(p.counts), p.residents])
  const csv = [header, ...lines].map((r) => r.join(',')).join('\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `purok-summary-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Barangay overview</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">Real-time demographics</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="exportCsv"
        >
          <BisIcon name="download" :size="16" />
          Export CSV
        </button>
        <RouterLink
          to="/secretary/reports"
          class="inline-flex h-9 items-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          Generate report
        </RouterLink>
      </div>
    </div>

    <!-- Key figures -->
    <section
      aria-label="Key figures"
      class="grid divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0"
    >
      <div v-for="kpi in kpis" :key="kpi.label" class="flex items-center gap-4 px-5 py-4">
        <div :class="['grid size-10 shrink-0 place-items-center rounded-lg', kpi.tileClass]">
          <BisIcon :name="kpi.icon" :size="20" />
        </div>
        <div class="min-w-0">
          <p class="text-[12px] text-slate-500">{{ kpi.label }}</p>
          <p class="flex flex-wrap items-baseline gap-x-2">
            <span class="text-2xl font-medium leading-8 tabular-nums text-bis-900">{{ kpi.value }}</span>
            <span :class="['inline-flex items-center gap-0.5 text-[12px] font-medium', kpi.noteClass]">
              <BisIcon v-if="kpi.trend" name="arrowUpRight" :size="12" :stroke-width="2.25" />
              {{ kpi.note }}
            </span>
          </p>
        </div>
      </div>
    </section>

    <!-- Row 1: household composition + gender -->
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section class="rounded-xl border border-slate-200 bg-white">
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-[14px] font-medium text-bis-900">Household composition</h2>
            <p class="text-[12px] text-slate-500">Households by purok and type</p>
          </div>
          <p class="text-[12px] text-slate-500">
            <span class="text-[14px] font-medium tabular-nums text-bis-900">{{ fmt(totalHouseholds) }}</span>
            households
          </p>
        </header>

        <!-- Bars are visual only; the table below gives screen readers the same numbers -->
        <ul class="space-y-2.5 px-5 py-5" aria-hidden="true">
          <li v-for="row in rows" :key="row.purok" class="grid grid-cols-[3.75rem_minmax(0,1fr)_3rem] items-center gap-3">
            <span class="text-[13px] font-medium text-slate-700">{{ row.purok }}</span>
            <div class="flex h-5 gap-0.5">
              <div
                v-for="seg in row.segments"
                :key="seg.key"
                :title="`${seg.key}: ${seg.value} households (${seg.percent}%)`"
                :style="{ width: `${seg.width}%`, backgroundColor: seg.color }"
                :class="[
                  'rounded-[3px] transition-opacity duration-150',
                  spotlight && spotlight !== seg.key ? 'opacity-20' : '',
                ]"
                @mouseenter="hovered = seg.key"
                @mouseleave="hovered = null"
              />
            </div>
            <span class="text-right text-[13px] tabular-nums text-slate-600">{{ fmt(row.total) }}</span>
          </li>
        </ul>

        <table class="sr-only">
          <caption>Households by purok and type</caption>
          <thead>
            <tr>
              <th>Purok</th>
              <th v-for="t in householdTypes" :key="t.key">{{ t.key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in purokData" :key="p.purok">
              <th>{{ p.purok }}</th>
              <td v-for="(count, i) in p.counts" :key="i">{{ count }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Legend doubles as a per-type summary -->
        <div class="border-t border-slate-100 px-3 py-3 sm:px-4">
          <ul class="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
            <li v-for="t in typeSummary" :key="t.key">
              <button
                type="button"
                :aria-pressed="pinned === t.key"
                class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 aria-pressed:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                @mouseenter="hovered = t.key"
                @mouseleave="hovered = null"
                @focus="hovered = t.key"
                @blur="hovered = null"
                @click="pinned = pinned === t.key ? null : t.key"
              >
                <span class="size-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: t.color }" />
                <span class="flex-1 truncate text-[13px] text-slate-600">{{ t.key }}</span>
                <span class="text-[13px] font-medium tabular-nums text-slate-900">{{ fmt(t.total) }}</span>
                <span class="w-9 text-right text-[12px] tabular-nums text-slate-400">{{ t.percent }}%</span>
              </button>
            </li>
          </ul>
        </div>

        <footer class="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[12px]">
          <span class="text-slate-500">Data updated: {{ updatedLabel }}</span>
          <RouterLink to="/secretary/reports" class="font-medium text-bis-600 hover:text-bis-700 hover:underline">
            Full report
          </RouterLink>
        </footer>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white">
        <header class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-[14px] font-medium text-bis-900">Gender distribution</h2>
          <p class="text-[12px] text-slate-500">Residents by sex</p>
        </header>

        <div class="px-5 py-6">
          <RingChart :segments="genderRows" :label="genderSummary" class="mx-auto w-44">
            <p class="text-[12px] text-slate-500">Total residents</p>
            <p class="text-2xl font-medium leading-8 tabular-nums text-bis-900">{{ fmt(totalResidents) }}</p>
          </RingChart>

          <ul class="mt-6 divide-y divide-slate-100">
            <li v-for="row in genderRows" :key="row.label" class="flex items-center gap-2.5 py-2.5">
              <span class="size-2.5 rounded-sm" :style="{ backgroundColor: row.color }" />
              <span class="flex-1 text-[13px] text-slate-600">{{ row.label }}</span>
              <span class="text-[13px] font-medium tabular-nums text-slate-900">{{ fmt(row.value) }}</span>
              <span class="w-12 text-right text-[12px] tabular-nums text-slate-400">{{ row.percent }}%</span>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <!-- Row 2: population by purok + age distribution -->
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section class="flex flex-col rounded-xl border border-slate-200 bg-white">
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-[14px] font-medium text-bis-900">Population by purok</h2>
            <p class="text-[12px] text-slate-500">Residents per purok against the barangay average</p>
          </div>
          <p class="text-[12px] text-slate-500">
            <span class="text-[14px] font-medium tabular-nums text-bis-900">{{ fmt(Math.round(averageResidents)) }}</span>
            average
          </p>
        </header>

        <div class="flex-1 overflow-x-auto px-5 pb-4 pt-4">
          <div class="min-w-[30rem]">
            <ul class="mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-500">
              <li class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-sm" :style="{ backgroundColor: POPULATION_COLOR }" />
                Residents
              </li>
              <li class="flex items-center gap-1.5">
                <span class="size-2.5 rounded-sm" :style="{ backgroundColor: FLAGGED_COLOR }" />
                Above average
              </li>
              <li class="flex items-center gap-1.5">
                <span class="w-4 border-t border-dashed border-slate-400" />
                Average
              </li>
            </ul>

            <!-- Visual only; the list below is the screen-reader version -->
            <div aria-hidden="true">
              <div class="relative ml-9 h-56">
                <div
                  v-for="t in ticks"
                  :key="t"
                  :class="['absolute inset-x-0 border-t', t === 0 ? 'border-slate-300' : 'border-slate-100']"
                  :style="{ bottom: `${(t / axisMax) * 100}%` }"
                >
                  <span class="absolute -left-9 w-7 -translate-y-1/2 text-right text-[11px] tabular-nums text-slate-400">
                    {{ fmt(t) }}
                  </span>
                </div>

                <div class="absolute inset-0 grid gap-3 px-2" :style="columnGrid">
                  <div v-for="bar in populationBars" :key="bar.purok" class="flex h-full flex-col items-center justify-end">
                    <span
                      :class="['mb-1 text-[11px] font-medium tabular-nums', bar.flagged ? 'text-rose-600' : 'text-slate-500']"
                    >
                      {{ fmt(bar.residents) }}
                    </span>
                    <div
                      class="w-full max-w-10 rounded-t-md"
                      :title="bar.tooltip"
                      :style="{ height: `${bar.height}%`, backgroundColor: bar.flagged ? FLAGGED_COLOR : POPULATION_COLOR }"
                    />
                  </div>
                </div>

                <div
                  class="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-slate-500"
                  :style="{ bottom: `${(averageResidents / axisMax) * 100}%` }"
                />
              </div>

              <div class="ml-9 mt-2 grid gap-3 px-2" :style="columnGrid">
                <span v-for="bar in populationBars" :key="bar.purok" class="text-center text-[12px] font-medium text-slate-600">
                  {{ bar.purok }}
                </span>
              </div>
            </div>

            <ul class="sr-only">
              <li v-for="bar in populationBars" :key="bar.purok">{{ bar.tooltip }}</li>
            </ul>
          </div>
        </div>

        <footer
          :class="[
            'flex items-center gap-2 border-t border-slate-100 px-5 py-3 text-[12px]',
            flaggedPuroks.length ? 'bg-amber-50/60 text-amber-900' : 'text-slate-500',
          ]"
        >
          <span :class="['size-2 shrink-0 rounded-full', flaggedPuroks.length ? 'bg-amber-500' : 'bg-emerald-500']" />
          {{ alertMessage }}
        </footer>
      </section>

      <section class="rounded-xl border border-slate-200 bg-white">
        <header class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-[14px] font-medium text-bis-900">Age distribution</h2>
          <p class="text-[12px] text-slate-500">Residents by age group</p>
        </header>

        <div class="px-5 py-5">
          <div class="flex h-2.5 gap-0.5 overflow-hidden rounded-full" role="img" :aria-label="ageRows.map((r) => `${r.label} ${r.percent}%`).join(', ')">
            <div
              v-for="g in ageRows"
              :key="g.label"
              :title="`${g.label}: ${fmt(g.value)} (${g.percent}%)`"
              :style="{ width: `${(g.value / ageTotal) * 100}%`, backgroundColor: g.color }"
            />
          </div>

          <ul class="mt-5 grid grid-cols-2 gap-3">
            <li v-for="g in ageRows" :key="g.label" class="rounded-lg border border-slate-200 px-3 py-2.5">
              <p class="flex items-center gap-1.5 text-[12px] text-slate-500">
                <span class="size-2 rounded-full" :style="{ backgroundColor: g.color }" />
                {{ g.label }}
              </p>
              <p class="mt-0.5 flex items-baseline gap-1.5">
                <span class="text-lg font-medium tabular-nums text-bis-900">{{ fmt(g.value) }}</span>
                <span class="text-[12px] tabular-nums text-slate-400">{{ g.percent }}%</span>
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <!-- Row 3: livelihood + socioeconomic -->
    <div class="grid gap-6 lg:grid-cols-2">
      <section class="flex flex-col rounded-xl border border-slate-200 bg-white">
        <header class="border-b border-slate-100 px-5 py-4">
          <h2 class="text-[14px] font-medium text-bis-900">Livelihood profile</h2>
          <p class="text-[12px] text-slate-500">Economic sector distribution</p>
        </header>

        <div class="flex flex-1 flex-col items-center gap-6 px-5 py-6 sm:flex-row sm:gap-8">
          <RingChart :segments="livelihoodRows" :label="livelihoodSummary" class="w-44 shrink-0">
            <p class="text-[12px] text-slate-500">Workforce</p>
            <p class="text-2xl font-medium leading-8 tabular-nums text-bis-900">{{ fmt(workforce) }}</p>
            <p class="mx-auto mt-0.5 w-fit rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
              Active
            </p>
          </RingChart>

          <ul class="w-full flex-1 divide-y divide-slate-100">
            <li v-for="row in livelihoodRows" :key="row.label" class="flex items-center gap-2.5 py-2.5">
              <span class="size-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: row.color }" />
              <span class="flex-1 truncate text-[13px] text-slate-600">{{ row.label }}</span>
              <span class="text-[13px] font-medium tabular-nums text-slate-900">{{ fmt(row.value) }}</span>
              <span class="w-12 text-right text-[12px] tabular-nums text-slate-400">{{ row.percent }}%</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="flex flex-col rounded-xl border border-slate-200 bg-white">
        <header class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="text-[14px] font-medium text-bis-900">Socioeconomic profile</h2>
            <p class="text-[12px] text-slate-500">Household income classification</p>
          </div>
          <span
            v-if="showVulnerabilityAlert"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-[12px] font-medium text-rose-600"
          >
            <BisIcon name="alert" :size="14" />
            Vulnerability alert
          </span>
        </header>

        <div class="flex-1 px-5 py-6">
          <RingChart semi :segments="incomeRows" :label="incomeSummary" class="mx-auto w-64">
            <p class="text-[12px] text-slate-500">Total households</p>
            <p class="text-2xl font-medium leading-8 tabular-nums text-bis-900">{{ fmt(incomeTotal) }}</p>
          </RingChart>

          <ul class="mt-6 divide-y divide-slate-100">
            <li v-for="row in incomeRows" :key="row.label" class="flex items-center gap-2.5 py-2.5">
              <span class="size-2.5 shrink-0 rounded-sm" :style="{ backgroundColor: row.color }" />
              <span class="flex-1 truncate text-[13px] text-slate-600">{{ row.label }}</span>
              <span class="text-[13px] font-medium tabular-nums text-slate-900">{{ fmt(row.value) }}</span>
              <span class="w-12 text-right text-[12px] tabular-nums text-slate-400">{{ row.percent }}%</span>
            </li>
          </ul>
        </div>

        <footer class="border-t border-slate-100 px-5 py-3 text-[12px] text-slate-500">
          {{ (vulnerableShare * 100).toFixed(1) }}% of households are indigent or low income.
        </footer>
      </section>
    </div>
  </div>
</template>