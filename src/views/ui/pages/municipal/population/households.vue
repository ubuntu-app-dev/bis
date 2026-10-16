<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

type Status = 'Active' | 'For verification' | 'Moved out'
interface Member {
  name: string
  relationship: string
  sex: 'M' | 'F'
  age: number
}
interface Household {
  id: string
  no: string
  barangayId: number
  purok: string
  head: string
  members: Member[]
  status: Status
  fourPs: boolean
  pwd: boolean
  tenure: string
  water: string
  toilet: string
  electricity: boolean
  updatedOn: string // ISO date
}

const barangays = [
  { id: 1, name: 'Alacan' },
  { id: 2, name: 'Angio' },
  { id: 3, name: 'Bolasi' },
  { id: 4, name: 'Cayanga' },
  { id: 5, name: 'Longos' },
  { id: 6, name: 'Mabilao' },
  { id: 7, name: 'Nibaliw Central' },
  { id: 8, name: 'Rabon' },
]

/* ---------------------------------------------------------------------------
 * MOCK DATA. Replace loadHouseholds() with an API call, e.g.
 *   GET /api/municipal/barangays/:id/households
 * The household list is what each barangay secretary submitted.
 * ------------------------------------------------------------------------ */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const maleNames = ['Juan', 'Jose', 'Ramon', 'Eduardo', 'Noel', 'Arnel', 'Rey', 'Mario', 'Pedro', 'Carlo', 'Joel', 'Allan']
const femaleNames = ['Maria', 'Liza', 'Gina', 'Marites', 'Rowena', 'Cynthia', 'Teresita', 'Jessa', 'Maricel', 'Ana', 'Lorna', 'Nena']
const surnames = ['Cabrera', 'Ventura', 'Tamayo', 'Soriano', 'Dizon', 'Bautista', 'Manuel', 'Fernandez', 'Lopez', 'Ramos', 'Padilla', 'Agbayani', 'Serrano', 'Domingo', 'Quiros', 'Castillo', 'Ancheta', 'Reyes', 'Santos', 'Mendoza']

function loadHouseholds(barangayId: number): Household[] {
  const b = barangays.find((x) => x.id === barangayId)!
  const rand = mulberry32(barangayId * 7919)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const prefix = b.name.slice(0, 3).toUpperCase()
  const out: Household[] = []

  for (let i = 0; i < 26; i++) {
    const surname = pick(surnames)
    const headSex: 'M' | 'F' = rand() < 0.78 ? 'M' : 'F'
    const headAge = 28 + Math.floor(rand() * 50)
    const headName = `${pick(headSex === 'M' ? maleNames : femaleNames)} ${surname}`
    const members: Member[] = [{ name: headName, relationship: 'Head', sex: headSex, age: headAge }]

    if (rand() < 0.7) {
      const s: 'M' | 'F' = headSex === 'M' ? 'F' : 'M'
      members.push({ name: `${pick(s === 'M' ? maleNames : femaleNames)} ${surname}`, relationship: 'Spouse', sex: s, age: Math.max(21, headAge - 3 + Math.floor(rand() * 6)) })
    }
    const kids = Math.floor(rand() * 5)
    for (let k = 0; k < kids; k++) {
      const s: 'M' | 'F' = rand() < 0.5 ? 'M' : 'F'
      members.push({ name: `${pick(s === 'M' ? maleNames : femaleNames)} ${surname}`, relationship: s === 'M' ? 'Son' : 'Daughter', sex: s, age: Math.floor(rand() * Math.min(headAge - 18, 30)) })
    }
    if (rand() < 0.2) {
      const s: 'M' | 'F' = rand() < 0.5 ? 'M' : 'F'
      members.push({ name: `${pick(s === 'M' ? maleNames : femaleNames)} ${surname}`, relationship: 'Parent', sex: s, age: Math.min(92, headAge + 24) })
    }

    const r = rand()
    out.push({
      id: `${b.id}-${i + 1}`,
      no: `${prefix}-${String(i + 1).padStart(4, '0')}`,
      barangayId: b.id,
      purok: `Purok ${1 + Math.floor(rand() * 5)}`,
      head: headName,
      members,
      status: r < 0.9 ? 'Active' : r < 0.96 ? 'For verification' : 'Moved out',
      fourPs: rand() < 0.15,
      pwd: rand() < 0.08,
      tenure: pick(['Owned', 'Owned', 'Owned', 'Rented', 'Rent-free with consent', 'Informal settler']),
      water: pick(['Piped to home', 'Piped to home', 'Shared tap', 'Deep well or pump']),
      toilet: pick(['Own sanitary toilet', 'Own sanitary toilet', 'Shared sanitary toilet', 'Unsanitary or none']),
      electricity: rand() < 0.95,
      updatedOn: new Date(Date.UTC(2026, 9, 16) - Math.floor(rand() * 120) * 864e5).toISOString().slice(0, 10),
    })
  }
  return out
}

/* --------------------------------- state ---------------------------------- */
const barangayId = ref(barangays[0].id)
const households = ref<Household[]>(loadHouseholds(barangayId.value))
const barangayName = computed(() => barangays.find((b) => b.id === barangayId.value)?.name ?? '')

const search = ref('')
const purokFilter = ref('')
const statusFilter = ref<'' | Status>('')
const page = ref(1)
const pageSize = 10

type SortKey = 'no' | 'head' | 'members'
const sortKey = ref<SortKey>('no')
const sortDir = ref<'asc' | 'desc'>('asc')
function sortBy(k: SortKey) {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = k
    sortDir.value = 'asc'
  }
}
const ariaSort = (k: SortKey) => (sortKey.value === k ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none')

watch(barangayId, (id) => {
  households.value = loadHouseholds(id) // TODO: await API
  search.value = ''
  purokFilter.value = ''
  statusFilter.value = ''
  page.value = 1
  selected.value = null
})
watch([search, purokFilter, statusFilter], () => (page.value = 1))

const puroks = computed(() => [...new Set(households.value.map((h) => h.purok))].sort())

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const dir = sortDir.value === 'asc' ? 1 : -1
  return households.value
    .filter((h) => (purokFilter.value ? h.purok === purokFilter.value : true))
    .filter((h) => (statusFilter.value ? h.status === statusFilter.value : true))
    .filter(
      (h) =>
        !q ||
        h.no.toLowerCase().includes(q) ||
        h.purok.toLowerCase().includes(q) ||
        h.members.some((m) => m.name.toLowerCase().includes(q)),
    )
    .slice()
    .sort((a, b) => {
      if (sortKey.value === 'members') return (a.members.length - b.members.length) * dir
      return String(a[sortKey.value]).localeCompare(String(b[sortKey.value])) * dir
    })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))

// Summary (counts moved-out households separately)
const activeHH = computed(() => households.value.filter((h) => h.status !== 'Moved out'))
const totalMembers = computed(() => activeHH.value.reduce((t, h) => t + h.members.length, 0))
const toVerify = computed(() => households.value.filter((h) => h.status === 'For verification').length)
const lastSubmitted = computed(() => households.value.reduce((d, h) => (h.updatedOn > d ? h.updatedOn : d), ''))

const hasSenior = (h: Household) => h.members.some((m) => m.age >= 60)
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

const statusClass: Record<Status, string> = {
  Active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  'For verification': 'bg-amber-50 text-amber-900 ring-amber-200',
  'Moved out': 'bg-slate-100 text-slate-700 ring-slate-300',
}

/* ------------------------------ detail drawer ----------------------------- */
const selected = ref<Household | null>(null)
function open(h: Household) {
  selected.value = h
  // TODO: record this view in the audit trail, e.g.
  // POST /api/municipal/audit { action: 'view_household', householdId: h.id }
}
function close() {
  selected.value = null
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">Barangay households</h1>
        <p class="mt-1 text-sm text-slate-600">
          Household records submitted by each barangay secretary. Opening a household is recorded in the
          <RouterLink :to="{ name: 'municipal.user.access.audit' }" class="font-medium text-blue-700 hover:underline">audit trail</RouterLink>.
        </p>
      </div>
      <label class="text-xs font-medium text-slate-600">
        Barangay
        <select
          v-model="barangayId"
          class="mt-1 block w-52 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </label>
    </header>

    <!-- Summary -->
    <dl class="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white lg:grid-cols-4 lg:divide-y-0">
      <div class="p-4">
        <dt class="text-xs text-slate-500">Households in {{ barangayName }}</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ activeHH.length }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Members</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ totalMembers }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">For verification</dt>
        <dd class="mt-1 text-2xl font-semibold" :class="toVerify ? 'text-amber-700' : 'text-slate-900'">{{ toVerify }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Latest update from barangay</dt>
        <dd class="mt-1 text-lg font-semibold text-slate-900">{{ lastSubmitted ? fmt(lastSubmitted) : 'None' }}</dd>
      </div>
    </dl>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3">
      <label class="min-w-[14rem] flex-1 text-xs font-medium text-slate-600">
        Search
        <input
          v-model="search"
          type="search"
          placeholder="Household number, member name or purok"
          class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </label>
      <label class="text-xs font-medium text-slate-600">
        Purok
        <select
          v-model="purokFilter"
          class="mt-1 block w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="">All puroks</option>
          <option v-for="p in puroks" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label class="text-xs font-medium text-slate-600">
        Status
        <select
          v-model="statusFilter"
          class="mt-1 block w-44 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="">All statuses</option>
          <option>Active</option>
          <option>For verification</option>
          <option>Moved out</option>
        </select>
      </label>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3" :aria-sort="ariaSort('no')">
                <button type="button" class="font-medium hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" @click="sortBy('no')">
                  Household no. <span v-if="sortKey === 'no'" aria-hidden="true">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </button>
              </th>
              <th scope="col" class="px-4 py-3" :aria-sort="ariaSort('head')">
                <button type="button" class="font-medium hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" @click="sortBy('head')">
                  Head of household <span v-if="sortKey === 'head'" aria-hidden="true">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </button>
              </th>
              <th scope="col" class="px-4 py-3">Purok</th>
              <th scope="col" class="px-4 py-3" :aria-sort="ariaSort('members')">
                <button type="button" class="font-medium hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" @click="sortBy('members')">
                  Members <span v-if="sortKey === 'members'" aria-hidden="true">{{ sortDir === 'asc' ? '▲' : '▼' }}</span>
                </button>
              </th>
              <th scope="col" class="px-4 py-3">Tags</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="h in pageRows" :key="h.id" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{{ h.no }}</td>
              <td class="px-4 py-3 text-slate-800">{{ h.head }}</td>
              <td class="px-4 py-3 text-slate-700">{{ h.purok }}</td>
              <td class="px-4 py-3 tabular-nums text-slate-700">{{ h.members.length }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span v-if="h.fourPs" class="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800">4Ps</span>
                  <span v-if="hasSenior(h)" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">Senior</span>
                  <span v-if="h.pwd" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">PWD</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" :class="statusClass[h.status]">{{ h.status }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  @click="open(h)"
                >
                  View
                </button>
              </td>
            </tr>
            <tr v-if="!pageRows.length">
              <td colspan="7" class="px-4 py-10 text-center text-sm text-slate-600">No households match these filters.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <p>{{ filtered.length }} {{ filtered.length === 1 ? 'household' : 'households' }}</p>
        <div class="flex items-center gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="page === 1" @click="page--">Previous</button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button type="button" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="page === pageCount" @click="page++">Next</button>
        </div>
      </div>
    </div>

    <!-- Household detail -->
    <div v-if="selected" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="close" />
      <aside
        class="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hh-title"
        @keydown.esc="close"
      >
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="hh-title" class="text-base font-semibold text-slate-900">Household {{ selected.no }}</h2>
            <p class="text-sm text-slate-600">{{ barangayName }}, {{ selected.purok }}</p>
          </div>
          <button type="button" class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" aria-label="Close household details" @click="close">✕</button>
        </div>

        <div class="flex-1 space-y-6 overflow-y-auto p-5 text-sm">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt class="text-xs text-slate-500">Head of household</dt>
              <dd class="text-slate-900">{{ selected.head }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Status</dt>
              <dd>
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" :class="statusClass[selected.status]">{{ selected.status }}</span>
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Members</dt>
              <dd class="text-slate-900">{{ selected.members.length }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Last updated by barangay</dt>
              <dd class="text-slate-900">{{ fmt(selected.updatedOn) }}</dd>
            </div>
          </dl>

          <section aria-labelledby="mem-h">
            <h3 id="mem-h" class="text-sm font-semibold text-slate-900">Household members</h3>
            <table class="mt-2 min-w-full divide-y divide-slate-200 text-left">
              <thead class="text-xs font-medium text-slate-600">
                <tr>
                  <th scope="col" class="py-2 pr-3">Name</th>
                  <th scope="col" class="px-3 py-2">Relationship</th>
                  <th scope="col" class="px-3 py-2">Sex</th>
                  <th scope="col" class="py-2 pl-3 text-right">Age</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="m in selected.members" :key="m.name + m.relationship + m.age">
                  <td class="py-2 pr-3 text-slate-900">{{ m.name }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ m.relationship }}</td>
                  <td class="px-3 py-2 text-slate-700">{{ m.sex === 'M' ? 'Male' : 'Female' }}</td>
                  <td class="py-2 pl-3 text-right tabular-nums text-slate-700">{{ m.age }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section aria-labelledby="liv-h">
            <h3 id="liv-h" class="text-sm font-semibold text-slate-900">Housing and services</h3>
            <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <dt class="text-xs text-slate-500">Tenure</dt>
                <dd class="text-slate-900">{{ selected.tenure }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Water source</dt>
                <dd class="text-slate-900">{{ selected.water }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Toilet</dt>
                <dd class="text-slate-900">{{ selected.toilet }}</dd>
              </div>
              <div>
                <dt class="text-xs text-slate-500">Electricity</dt>
                <dd :class="selected.electricity ? 'text-slate-900' : 'font-medium text-amber-700'">
                  {{ selected.electricity ? 'Connected' : 'Not connected' }}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  </div>
</template>