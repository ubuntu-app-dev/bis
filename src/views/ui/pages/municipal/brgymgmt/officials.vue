<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type Position =
  | 'Punong Barangay'
  | 'Barangay Secretary'
  | 'Barangay Treasurer'
  | 'Kagawad'
  | 'SK Chairperson'

interface Official {
  id: number
  name: string
  position: Position
  barangay: string
  phone: string | null
  email: string | null
  verifiedOn: string // ISO date
}

// TODO: replace with API call (e.g. GET /api/municipal/officials)
const barangays = ['Alacan', 'Angio', 'Bolasi', 'Cayanga', 'Longos', 'Mabilao', 'Nibaliw Central', 'Rabon']
const requiredPositions: Position[] = ['Punong Barangay', 'Barangay Secretary']
const positions: Position[] = [
  'Punong Barangay',
  'Barangay Secretary',
  'Barangay Treasurer',
  'Kagawad',
  'SK Chairperson',
]

const officials = ref<Official[]>([
  { id: 1, name: 'Ramon D. Cabrera', position: 'Punong Barangay', barangay: 'Alacan', phone: '0917 555 0101', email: 'alacan.pb@example.com', verifiedOn: '2026-09-02' },
  { id: 2, name: 'Liza M. Ventura', position: 'Barangay Secretary', barangay: 'Alacan', phone: '0918 555 0102', email: null, verifiedOn: '2026-09-02' },
  { id: 3, name: 'Eduardo S. Tamayo', position: 'Punong Barangay', barangay: 'Angio', phone: '0927 555 0103', email: 'angio.pb@example.com', verifiedOn: '2026-08-14' },
  { id: 4, name: 'Marites C. Soriano', position: 'Barangay Secretary', barangay: 'Angio', phone: null, email: 'angio.sec@example.com', verifiedOn: '2026-08-14' },
  { id: 5, name: 'Noel P. Dizon', position: 'Punong Barangay', barangay: 'Bolasi', phone: '0935 555 0105', email: null, verifiedOn: '2026-07-21' },
  { id: 6, name: 'Gina R. Bautista', position: 'Barangay Secretary', barangay: 'Bolasi', phone: '0916 555 0106', email: 'bolasi.sec@example.com', verifiedOn: '2026-07-21' },
  { id: 7, name: 'Arnel T. Manuel', position: 'Punong Barangay', barangay: 'Cayanga', phone: '0919 555 0107', email: 'cayanga.pb@example.com', verifiedOn: '2026-10-01' },
  { id: 8, name: 'Joel B. Fernandez', position: 'Punong Barangay', barangay: 'Longos', phone: '0920 555 0108', email: null, verifiedOn: '2026-06-30' },
  { id: 9, name: 'Cynthia A. Lopez', position: 'Barangay Secretary', barangay: 'Longos', phone: '0921 555 0109', email: 'longos.sec@example.com', verifiedOn: '2026-06-30' },
  { id: 10, name: 'Victor G. Ramos', position: 'Punong Barangay', barangay: 'Mabilao', phone: '0905 555 0110', email: 'mabilao.pb@example.com', verifiedOn: '2026-09-18' },
  { id: 11, name: 'Rowena E. Padilla', position: 'Barangay Secretary', barangay: 'Mabilao', phone: '0906 555 0111', email: 'mabilao.sec@example.com', verifiedOn: '2026-09-18' },
  { id: 12, name: 'Teresita N. Agbayani', position: 'Barangay Treasurer', barangay: 'Mabilao', phone: '0907 555 0112', email: null, verifiedOn: '2026-09-18' },
  { id: 13, name: 'Alfredo J. Serrano', position: 'Punong Barangay', barangay: 'Nibaliw Central', phone: '0908 555 0113', email: 'nibaliw.pb@example.com', verifiedOn: '2026-05-12' },
  { id: 14, name: 'Maricel V. Domingo', position: 'Barangay Secretary', barangay: 'Nibaliw Central', phone: '0909 555 0114', email: null, verifiedOn: '2026-05-12' },
  { id: 15, name: 'Jessa L. Quiros', position: 'SK Chairperson', barangay: 'Nibaliw Central', phone: '0910 555 0115', email: null, verifiedOn: '2026-05-12' },
  { id: 16, name: 'Benjie O. Castillo', position: 'Punong Barangay', barangay: 'Rabon', phone: '0911 555 0116', email: 'rabon.pb@example.com', verifiedOn: '2026-08-03' },
  { id: 17, name: 'Pedro H. Ancheta', position: 'Kagawad', barangay: 'Rabon', phone: '0912 555 0117', email: null, verifiedOn: '2026-08-03' },
])

// Filters
const search = ref('')
const barangayFilter = ref('')
const positionFilter = ref('')
const missingOnly = ref(false)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return officials.value.filter((o) => {
    if (barangayFilter.value && o.barangay !== barangayFilter.value) return false
    if (positionFilter.value && o.position !== positionFilter.value) return false
    if (missingOnly.value && o.phone && o.email) return false
    if (!q) return true
    return [o.name, o.barangay, o.position, o.phone ?? '', o.email ?? ''].some((v) =>
      v.toLowerCase().includes(q),
    )
  })
})

// Pagination
const pageSize = 8
const page = ref(1)
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([search, barangayFilter, positionFilter, missingOnly], () => (page.value = 1))

// Summary
const vacancies = computed(() => {
  const list: { barangay: string; position: Position }[] = []
  for (const b of barangays) {
    for (const p of requiredPositions) {
      if (!officials.value.some((o) => o.barangay === b && o.position === p)) {
        list.push({ barangay: b, position: p })
      }
    }
  }
  return list
})
const missingPhone = computed(() => officials.value.filter((o) => !o.phone).length)
const missingEmail = computed(() => officials.value.filter((o) => !o.email).length)

// Helpers
const copied = ref<string | null>(null)
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = text
    setTimeout(() => (copied.value = null), 1500)
  } catch {
    /* clipboard unavailable (insecure context); ignore */
  }
}
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

function clearFilters() {
  search.value = ''
  barangayFilter.value = ''
  positionFilter.value = ''
  missingOnly.value = false
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">Barangay officials and contacts</h1>
      <p class="mt-1 text-sm text-slate-600">
        Directory of officials reported by each barangay. Contact details are kept current by barangay secretaries.
      </p>
    </header>

    <!-- Summary -->
    <dl class="grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-4 sm:divide-y-0">
      <div class="p-4">
        <dt class="text-xs text-slate-500">Officials listed</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ officials.length }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">Vacant key positions</dt>
        <dd class="mt-1 text-2xl font-semibold" :class="vacancies.length ? 'text-amber-700' : 'text-slate-900'">
          {{ vacancies.length }}
        </dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">No mobile number</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ missingPhone }}</dd>
      </div>
      <div class="p-4">
        <dt class="text-xs text-slate-500">No email</dt>
        <dd class="mt-1 text-2xl font-semibold text-slate-900">{{ missingEmail }}</dd>
      </div>
    </dl>

    <!-- Vacancies -->
    <section
      v-if="vacancies.length"
      class="rounded-lg border border-amber-200 bg-amber-50 p-4"
      aria-labelledby="vacancy-heading"
    >
      <h2 id="vacancy-heading" class="text-sm font-semibold text-amber-900">
        {{ vacancies.length }} key {{ vacancies.length === 1 ? 'position has' : 'positions have' }} no record
      </h2>
      <ul class="mt-2 flex flex-wrap gap-2">
        <li
          v-for="v in vacancies"
          :key="v.barangay + v.position"
          class="rounded-md bg-white px-2.5 py-1 text-xs text-amber-900 ring-1 ring-amber-200"
        >
          {{ v.barangay }}: {{ v.position }}
        </li>
      </ul>
    </section>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label class="min-w-[14rem] flex-1 text-xs font-medium text-slate-600">
        Search
        <input
          v-model="search"
          type="search"
          placeholder="Name, barangay, number or email"
          class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </label>
      <label class="text-xs font-medium text-slate-600">
        Barangay
        <select
          v-model="barangayFilter"
          class="mt-1 block w-44 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="">All barangays</option>
          <option v-for="b in barangays" :key="b" :value="b">{{ b }}</option>
        </select>
      </label>
      <label class="text-xs font-medium text-slate-600">
        Position
        <select
          v-model="positionFilter"
          class="mt-1 block w-48 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="">All positions</option>
          <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
        </select>
      </label>
      <label class="flex items-center gap-2 pb-2 text-sm text-slate-700">
        <input v-model="missingOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600" />
        Missing contact details
      </label>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Official</th>
              <th scope="col" class="px-4 py-3">Barangay</th>
              <th scope="col" class="px-4 py-3">Mobile</th>
              <th scope="col" class="px-4 py-3">Email</th>
              <th scope="col" class="px-4 py-3">Last verified</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="o in pageRows" :key="o.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-900">{{ o.name }}</p>
                <p class="text-xs text-slate-500">{{ o.position }}</p>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ o.barangay }}</td>
              <td class="px-4 py-3">
                <button
                  v-if="o.phone"
                  type="button"
                  class="rounded text-slate-700 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  :title="'Copy ' + o.phone"
                  @click="copy(o.phone)"
                >
                  {{ copied === o.phone ? 'Copied' : o.phone }}
                </button>
                <span v-else class="text-xs font-medium text-amber-700">Not provided</span>
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="o.email"
                  type="button"
                  class="rounded text-slate-700 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  :title="'Copy ' + o.email"
                  @click="copy(o.email)"
                >
                  {{ copied === o.email ? 'Copied' : o.email }}
                </button>
                <span v-else class="text-xs font-medium text-amber-700">Not provided</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-slate-600">{{ fmt(o.verifiedOn) }}</td>
            </tr>

            <tr v-if="!pageRows.length">
              <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-600">
                No officials match these filters.
                <button type="button" class="font-medium text-blue-700 hover:underline" @click="clearFilters">
                  Clear filters
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
        <p>{{ filtered.length }} {{ filtered.length === 1 ? 'result' : 'results' }}</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page === 1"
            @click="page--"
          >
            Previous
          </button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button
            type="button"
            class="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="page === pageCount"
            @click="page++"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>