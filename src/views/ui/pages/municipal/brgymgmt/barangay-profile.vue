<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import {
  freshnessOf,
  getBarangayProfile,
  type AccountStatus,
  type BarangayProfile,
  type Freshness,
  type SubmissionStatus,
} from '@/data/m/barangayData'

const route = useRoute()
const profile = ref<BarangayProfile | null>(null)
const loading = ref(true)
const notFound = ref(false)
const error = ref('')

// Reload when the id changes (e.g. moving from one profile to another).
watch(
  () => route.params.id,
  async (id) => {
    loading.value = true
    notFound.value = false
    error.value = ''
    try {
      const result = await getBarangayProfile(String(id))
      profile.value = result
      notFound.value = result === null
    } catch {
      error.value = 'Could not load this barangay. Check your connection and reload the page.'
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const fmt = (n: number) => new Intl.NumberFormat('en-PH').format(n)
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const records = computed(() => (profile.value ? freshnessOf(profile.value.recordsUpdatedDaysAgo) : 'current'))

// ---------- Key figures ----------
const figures = computed(() => {
  const p = profile.value
  if (!p) return []
  return [
    { label: 'Population', value: fmt(p.population), note: `${p.seniorsPct}% are 60 and over` },
    { label: 'Households', value: fmt(p.households), note: `${(p.population / p.households).toFixed(1)} people per household` },
    { label: 'Certificates this month', value: fmt(p.certificatesThisMonth), note: 'Issued by the barangay' },
    { label: 'Open cases', value: fmt(p.openCases), note: 'Blotter and VAWC, counts only' },
  ]
})

// ---------- Population profile ----------
const ageGroups = computed(() => {
  const p = profile.value
  if (!p) return []
  const children = Math.round((p.population * p.childrenPct) / 100)
  const seniors = Math.round((p.population * p.seniorsPct) / 100)
  const adults = p.population - children - seniors
  return [
    { label: 'Under 18', count: children, pct: p.childrenPct, bar: 'bg-bis-600' },
    { label: '18 to 59', count: adults, pct: 100 - p.childrenPct - p.seniorsPct, bar: 'bg-slate-700' },
    { label: '60 and over', count: seniors, pct: p.seniorsPct, bar: 'bg-amber-500' },
  ]
})

const sexSplit = computed(() => {
  const p = profile.value
  if (!p) return []
  const male = Math.round((p.population * p.malePct) / 100)
  return [
    { label: 'Male', count: male, pct: p.malePct, bar: 'bg-bis-600' },
    { label: 'Female', count: p.population - male, pct: 100 - p.malePct, bar: 'bg-slate-400' },
  ]
})

// ---------- Completeness ----------
const doneCount = computed(() => profile.value?.checklist.filter((c) => c.done).length ?? 0)
const completenessBar = (pct: number) =>
  pct >= 80 ? 'bg-bis-600' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

// ---------- Styling ----------
const recordsStyle: Record<Freshness, { label: string; cls: string }> = {
  current: { label: 'Records up to date', cls: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Update due', cls: 'bg-amber-50 text-amber-800' },
  overdue: { label: 'Records overdue', cls: 'bg-red-50 text-red-700' },
}
const accountStyle: Record<AccountStatus, { label: string; cls: string }> = {
  active: { label: 'Account active', cls: 'bg-emerald-50 text-emerald-700' },
  suspended: { label: 'Account suspended', cls: 'bg-red-50 text-red-700' },
  pending: { label: 'Account pending', cls: 'bg-amber-50 text-amber-800' },
}
const submissionStyle: Record<SubmissionStatus, { label: string; cls: string }> = {
  pending: { label: 'To review', cls: 'bg-bis-50 text-bis-700' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
  returned: { label: 'Returned', cls: 'bg-red-50 text-red-700' },
}

function daysLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const card = 'rounded-xl border border-slate-200 bg-white'
const pill = 'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium'
const link =
  'rounded font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <RouterLink
      to="/municipal/barangays"
      :class="['inline-flex items-center gap-1 text-sm', link]"
    >
      <BisIcon name="chevronLeft" :size="16" />
      All barangays
    </RouterLink>

    <p
      v-if="error"
      role="alert"
      class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <BisIcon name="alert" :size="18" class="mt-0.5" />
      {{ error }}
    </p>

    <!-- Not found -->
    <section v-if="notFound" :class="[card, 'px-6 py-14 text-center']">
      <h1 class="text-lg font-semibold text-slate-900">Barangay not found</h1>
      <p class="mt-1 text-sm text-slate-600">
        No barangay is registered with this address. It may have been removed or the link may be wrong.
      </p>
      <RouterLink to="/municipal/barangays" :class="['mt-4 inline-block text-sm', link]">
        Go to all barangays
      </RouterLink>
    </section>

    <!-- Loading -->
    <div v-else-if="loading" class="space-y-6" aria-busy="true">
      <div class="h-28 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
      <div class="h-24 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="h-72 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none lg:col-span-2" />
        <div class="h-72 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" />
      </div>
    </div>

    <template v-else-if="profile">
      <!-- Header -->
      <header :class="[card, 'flex flex-wrap items-start justify-between gap-4 p-5']">
        <div class="flex items-start gap-4">
          <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-bis-600 text-white" aria-hidden="true">
            <BisIcon name="building" :size="24" />
          </span>
          <div>
            <h1 class="text-xl font-semibold text-slate-900">Barangay {{ profile.name }}</h1>
            <p class="mt-1 text-sm text-slate-600">
              Captain {{ profile.captain }}
              <span class="mx-1.5 text-slate-300" aria-hidden="true">|</span>
              {{ profile.contact }}
              <span class="mx-1.5 text-slate-300" aria-hidden="true">|</span>
              {{ profile.email }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span :class="[pill, accountStyle[profile.accountStatus].cls]">
                {{ accountStyle[profile.accountStatus].label }}
              </span>
              <span :class="[pill, recordsStyle[records].cls]">
                {{ recordsStyle[records].label }}
              </span>
              <span :class="[pill, 'bg-slate-100 text-slate-700']">
                Last updated {{ daysLabel(profile.recordsUpdatedDaysAgo).toLowerCase() }}
              </span>
            </div>
          </div>
        </div>

        <RouterLink
          to="/municipal/barangays/submissions"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          <BisIcon name="inbox" :size="16" />
          All submissions
        </RouterLink>
      </header>

      <!-- Key figures -->
      <section aria-label="Key figures" :class="[card, 'grid grid-cols-2 lg:grid-cols-4']">
        <div
          v-for="(f, i) in figures"
          :key="f.label"
          :class="[
            'p-5',
            i > 0 ? 'border-t border-slate-200 lg:border-l lg:border-t-0' : '',
            i % 2 === 1 ? 'max-lg:border-l' : '',
            i === 1 ? 'max-lg:border-t-0' : '',
          ]"
        >
          <p class="text-sm text-slate-600">{{ f.label }}</p>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{{ f.value }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ f.note }}</p>
        </div>
      </section>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Left: officials + population -->
        <div class="space-y-6 lg:col-span-2">
          <section :class="[card, 'p-5']" aria-labelledby="officials-title">
            <h2 id="officials-title" class="text-sm font-semibold text-slate-900">Officials and contacts</h2>
            <p class="mt-0.5 text-xs text-slate-500">
              As listed in the barangay's own records, plus {{ profile.councilSize }} barangay kagawads
            </p>

            <ul class="mt-4 divide-y divide-slate-100">
              <li v-for="o in profile.officials" :key="o.role" class="flex items-center gap-3 py-3">
                <span
                  class="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
                  aria-hidden="true"
                >
                  {{ initials(o.name) }}
                </span>
                <span class="min-w-0 flex-1 leading-tight">
                  <span class="block truncate text-sm font-medium text-slate-900">{{ o.name }}</span>
                  <span class="block truncate text-xs text-slate-600">{{ o.role }}</span>
                </span>
                <span v-if="o.contact" class="hidden truncate text-sm tabular-nums text-slate-700 sm:block">
                  {{ o.contact }}
                </span>
              </li>
            </ul>
          </section>

          <section :class="[card, 'p-5']" aria-labelledby="population-title">
            <h2 id="population-title" class="text-sm font-semibold text-slate-900">Population profile</h2>
            <p class="mt-0.5 text-xs text-slate-500">Totals only. Individual resident records are not shown here.</p>

            <div class="mt-5 grid gap-6 sm:grid-cols-2">
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
                    <span class="w-10 text-right text-xs tabular-nums text-slate-500">{{ s.pct }}%</span>
                  </li>
                </ul>
              </div>
            </div>

            <p class="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
              Need to look at individual records?
              <RouterLink to="/municipal/population/access" :class="link">Request resident record access</RouterLink>
              with a stated purpose.
            </p>
          </section>
        </div>

        <!-- Right: completeness + submissions -->
        <div class="space-y-6">
          <section :class="[card, 'p-5']" aria-labelledby="completeness-title">
            <h2 id="completeness-title" class="text-sm font-semibold text-slate-900">Record completeness</h2>

            <p class="mt-3 text-2xl font-semibold tabular-nums text-slate-900">{{ profile.completeness }}%</p>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div :class="['h-full rounded-full', completenessBar(profile.completeness)]" :style="{ width: `${profile.completeness}%` }" />
            </div>
            <p class="mt-2 text-xs text-slate-600">
              {{ doneCount }} of {{ profile.checklist.length }} sections complete
            </p>

            <ul class="mt-4 divide-y divide-slate-100">
              <li v-for="c in profile.checklist" :key="c.label" class="flex items-center justify-between gap-3 py-2 text-sm">
                <span :class="c.done ? 'text-slate-700' : 'font-medium text-slate-900'">{{ c.label }}</span>
                <span :class="[pill, c.done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800']">
                  {{ c.done ? 'Complete' : 'Missing' }}
                </span>
              </li>
            </ul>
          </section>

          <section :class="[card, 'p-5']" aria-labelledby="submissions-title">
            <h2 id="submissions-title" class="text-sm font-semibold text-slate-900">Recent submissions</h2>

            <ul class="mt-3 divide-y divide-slate-100">
              <li v-for="s in profile.submissions" :key="s.id" class="py-3">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-sm font-medium text-slate-900">{{ s.title }}</p>
                  <span :class="[pill, 'shrink-0', submissionStyle[s.status].cls]">
                    {{ submissionStyle[s.status].label }}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-slate-500">{{ daysLabel(s.daysAgo) }}</p>
                <p v-if="s.note" class="mt-1 text-xs text-red-700">{{ s.note }}</p>
              </li>
            </ul>
          </section>

          <p class="px-1 text-xs leading-relaxed text-slate-500">
            Suspending or resetting this barangay's account is done under
            <RouterLink to="/municipal/access/accounts" :class="link">User and access</RouterLink>.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>