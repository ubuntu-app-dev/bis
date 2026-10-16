<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

type SectorKey = 'seniors' | 'pwd' | 'soloParents' | 'osy' | 'fourPs'

interface BarangaySector {
  id: number
  name: string
  population: number
  households: number
  updatedDaysAgo: number
  counts: Record<SectorKey, number>
}
interface Person {
  id: string
  name: string
  age: number | null
  sex: 'M' | 'F' | null
  purok: string
  detail: string
}

// TODO: replace with API call (e.g. GET /api/municipal/sectors).
// Expect registered counts per sector for each barangay, as submitted by the secretary.
const barangays: BarangaySector[] = [
  { id: 1, name: 'Alacan', population: 4120, households: 1010, updatedDaysAgo: 12, counts: { seniors: 520, pwd: 96, soloParents: 88, osy: 61, fourPs: 140 } },
  { id: 2, name: 'Angio', population: 2860, households: 702, updatedDaysAgo: 77, counts: { seniors: 402, pwd: 71, soloParents: 54, osy: 38, fourPs: 118 } },
  { id: 3, name: 'Bolasi', population: 3540, households: 884, updatedDaysAgo: 18, counts: { seniors: 460, pwd: 82, soloParents: 77, osy: 49, fourPs: 131 } },
  { id: 4, name: 'Cayanga', population: 5210, households: 1288, updatedDaysAgo: 40, counts: { seniors: 640, pwd: 121, soloParents: 112, osy: 83, fourPs: 176 } },
  { id: 5, name: 'Longos', population: 2395, households: 590, updatedDaysAgo: 109, counts: { seniors: 355, pwd: 58, soloParents: 41, osy: 30, fourPs: 99 } },
  { id: 6, name: 'Mabilao', population: 6480, households: 1604, updatedDaysAgo: 2, counts: { seniors: 760, pwd: 148, soloParents: 139, osy: 102, fourPs: 205 } },
  { id: 7, name: 'Nibaliw Central', population: 3975, households: 981, updatedDaysAgo: 157, counts: { seniors: 518, pwd: 90, soloParents: 84, osy: 57, fourPs: 150 } },
  { id: 8, name: 'Rabon', population: 1830, households: 451, updatedDaysAgo: 95, counts: { seniors: 262, pwd: 44, soloParents: 33, osy: 25, fourPs: 72 } },
]

const sectors: { key: SectorKey; label: string; base: 'population' | 'households'; detailLabel: string }[] = [
  { key: 'seniors', label: 'Senior citizens', base: 'population', detailLabel: 'Senior citizen ID' },
  { key: 'pwd', label: 'Persons with disability', base: 'population', detailLabel: 'Type of disability' },
  { key: 'soloParents', label: 'Solo parents', base: 'population', detailLabel: 'Solo parent ID' },
  { key: 'osy', label: 'Out-of-school youth', base: 'population', detailLabel: 'Highest level reached' },
  { key: 'fourPs', label: '4Ps households', base: 'households', detailLabel: 'Household no.' },
]

const activeKey = ref<SectorKey>('seniors')
const active = computed(() => sectors.find((s) => s.key === activeKey.value)!)
const baseLabel = computed(() => (active.value.base === 'households' ? 'households' : 'residents'))

const muniTotal = (k: SectorKey) => barangays.reduce((t, b) => t + b.counts[k], 0)
const muniBase = computed(() => barangays.reduce((t, b) => t + b[active.value.base], 0))

const rows = computed(() =>
  barangays
    .map((b) => {
      const count = b.counts[activeKey.value]
      const base = b[active.value.base]
      return { ...b, count, share: base ? (count / base) * 100 : 0 }
    })
    .sort((a, b) => b.share - a.share),
)
const maxShare = computed(() => Math.max(1, ...rows.value.map((r) => r.share)))

const n = (v: number) => v.toLocaleString('en-PH')

/* ---------------------------------------------------------------------------
 * MOCK registry. Replace loadRegistry() with an API call, e.g.
 *   GET /api/municipal/barangays/:id/sectors/:key
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

function loadRegistry(b: BarangaySector, key: SectorKey): Person[] {
  const idx = sectors.findIndex((s) => s.key === key)
  const rand = mulberry32(b.id * 1009 + idx * 31)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const prefix = b.name.slice(0, 3).toUpperCase()
  const out: Person[] = []
  for (let i = 0; i < b.counts[key]; i++) {
    let sex: 'M' | 'F' = rand() < 0.5 ? 'M' : 'F'
    let age = 0
    let detail = ''
    if (key === 'seniors') {
      age = 60 + Math.floor(rand() * 33)
      detail = rand() < 0.85 ? 'Issued' : 'Not yet issued'
    } else if (key === 'pwd') {
      age = 3 + Math.floor(rand() * 82)
      detail = pick(['Mobility', 'Visual', 'Hearing', 'Psychosocial', 'Intellectual', 'Chronic illness'])
    } else if (key === 'soloParents') {
      sex = rand() < 0.85 ? 'F' : 'M'
      age = 22 + Math.floor(rand() * 40)
      detail = rand() < 0.6 ? 'Issued' : 'Pending'
    } else if (key === 'osy') {
      age = 12 + Math.floor(rand() * 13)
      detail = pick(['No grade completed', 'Elementary', 'High school (some)', 'Senior high (some)'])
    } else {
      sex = rand() < 0.7 ? 'F' : 'M'
      age = 28 + Math.floor(rand() * 38)
      detail = `${prefix}-${String(1 + Math.floor(rand() * b.households)).padStart(4, '0')}`
    }
    out.push({
      id: `${b.id}-${key}-${i}`,
      name: `${pick(sex === 'M' ? maleNames : femaleNames)} ${pick(surnames)}`,
      age,
      sex,
      purok: `Purok ${1 + Math.floor(rand() * 5)}`,
      detail,
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/* ------------------------------- registry drawer ------------------------------ */
const openBarangay = ref<BarangaySector | null>(null)
const registry = ref<Person[]>([])
const search = ref('')
const page = ref(1)
const pageSize = 10

function openRegistry(b: BarangaySector) {
  openBarangay.value = b
  registry.value = loadRegistry(b, activeKey.value) // TODO: await API
  search.value = ''
  page.value = 1
  // TODO: record this view in the audit trail, e.g.
  // POST /api/municipal/audit { action: 'view_sector_registry', barangayId: b.id, sector: activeKey.value }
}
function closeRegistry() {
  openBarangay.value = null
}
watch(search, () => (page.value = 1))

const filteredRegistry = computed(() => {
  const q = search.value.trim().toLowerCase()
  return registry.value.filter((p) => !q || p.name.toLowerCase().includes(q) || p.purok.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRegistry.value.length / pageSize)))
const pageRows = computed(() => filteredRegistry.value.slice((page.value - 1) * pageSize, page.value * pageSize))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">Sectors</h1>
      <p class="mt-1 text-sm text-slate-600">
        Residents and households registered under each sector, as submitted by the barangays. Opening a registry is recorded in the
        <RouterLink :to="{ name: 'municipal.user.access.audit' }" class="font-medium text-blue-700 hover:underline">audit trail</RouterLink>.
      </p>
    </header>

    <!-- Sector tabs -->
    <div class="border-b border-slate-200" role="tablist" aria-label="Sector">
      <div class="-mb-px flex gap-1 overflow-x-auto">
        <button
          v-for="s in sectors"
          :key="s.key"
          type="button"
          role="tab"
          :aria-selected="activeKey === s.key"
          class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          :class="activeKey === s.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'"
          @click="activeKey = s.key"
        >
          {{ s.label }}
          <span class="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{{ n(muniTotal(s.key)) }}</span>
        </button>
      </div>
    </div>

    <!-- Summary -->
    <dl class="grid grid-cols-1 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <div class="p-4">
        <dt class="text-xs text-slate-500">{{ active.label }} in the municipality</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ n(muniTotal(activeKey)) }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Share of all {{ baseLabel }}</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ ((muniTotal(activeKey) / muniBase) * 100).toFixed(1) }}%</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Highest share</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ rows[0].name }}</dd>
        <dd class="text-xs text-slate-500">{{ rows[0].share.toFixed(1) }}% of its {{ baseLabel }}</dd>
      </div>
    </dl>

    <!-- Barangay table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Barangay</th>
              <th scope="col" class="px-4 py-3 text-right">Registered</th>
              <th scope="col" class="px-4 py-3">Share of barangay {{ baseLabel }}</th>
              <th scope="col" class="px-4 py-3">Data updated</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Registry</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="r in rows" :key="r.id" class="hover:bg-slate-50">
              <td class="px-4 py-3 font-medium text-slate-900">{{ r.name }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-900">{{ n(r.count) }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                    <div class="h-full rounded-full bg-blue-600" :style="{ width: (r.share / maxShare) * 100 + '%' }" />
                  </div>
                  <span class="w-12 text-xs tabular-nums text-slate-600">{{ r.share.toFixed(1) }}%</span>
                </div>
              </td>
              <td class="whitespace-nowrap px-4 py-3">
                <span :class="r.updatedDaysAgo > 90 ? 'font-medium text-red-700' : 'text-slate-600'">{{ r.updatedDaysAgo }} days ago</span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  @click="openRegistry(r)"
                >
                  View registry
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Registry drawer -->
    <div v-if="openBarangay" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="closeRegistry" />
      <aside
        class="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reg-title"
        @keydown.esc="closeRegistry"
      >
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="reg-title" class="text-base font-semibold text-slate-900">{{ active.label }}, {{ openBarangay.name }}</h2>
            <p class="text-sm text-slate-600">{{ n(registry.length) }} registered</p>
          </div>
          <button type="button" class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600" aria-label="Close registry" @click="closeRegistry">✕</button>
        </div>

        <div class="border-b border-slate-200 p-5">
          <label class="block text-xs font-medium text-slate-600">
            Search
            <input
              v-model="search"
              type="search"
              placeholder="Name, purok or details"
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </label>
        </div>

        <div class="flex-1 overflow-y-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="sticky top-0 bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th scope="col" class="px-5 py-3">Name</th>
                <th scope="col" class="px-3 py-3 text-right">Age</th>
                <th scope="col" class="px-3 py-3">Sex</th>
                <th scope="col" class="px-3 py-3">Purok</th>
                <th scope="col" class="px-3 py-3">{{ active.detailLabel }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="p in pageRows" :key="p.id">
                <td class="px-5 py-2.5 text-slate-900">{{ p.name }}</td>
                <td class="px-3 py-2.5 text-right tabular-nums text-slate-700">{{ p.age }}</td>
                <td class="px-3 py-2.5 text-slate-700">{{ p.sex === 'M' ? 'Male' : 'Female' }}</td>
                <td class="px-3 py-2.5 text-slate-700">{{ p.purok }}</td>
                <td class="px-3 py-2.5 text-slate-700">{{ p.detail }}</td>
              </tr>
              <tr v-if="!pageRows.length">
                <td colspan="5" class="px-5 py-10 text-center text-sm text-slate-600">No one matches this search.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
          <p>{{ n(filteredRegistry.length) }} {{ filteredRegistry.length === 1 ? 'result' : 'results' }}</p>
          <div class="flex items-center gap-2">
            <button type="button" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="page === 1" @click="page--">Previous</button>
            <span>Page {{ page }} of {{ pageCount }}</span>
            <button type="button" class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" :disabled="page === pageCount" @click="page++">Next</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>