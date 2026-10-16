<script setup lang="ts">
import { computed, ref, watch } from 'vue'

type SubmissionType = 'Barangay profile' | 'Population report' | 'Household survey' | 'Monthly report'
type Status = 'Pending' | 'Under review' | 'Approved' | 'Returned'

interface Submission {
  id: number
  ref: string
  barangay: string
  type: SubmissionType
  period: string
  submittedBy: string
  submittedAt: string // ISO
  status: Status
  remarks?: string
  reviewedAt?: string
}

// TODO: replace with API call (e.g. GET /api/municipal/submissions)
const submissions = ref<Submission[]>([
  { id: 1, ref: 'SUB-2026-0141', barangay: 'Mabilao', type: 'Barangay profile', period: '2026', submittedBy: 'Rowena E. Padilla', submittedAt: '2026-10-14', status: 'Pending' },
  { id: 2, ref: 'SUB-2026-0140', barangay: 'Alacan', type: 'Monthly report', period: 'September 2026', submittedBy: 'Liza M. Ventura', submittedAt: '2026-10-13', status: 'Pending' },
  { id: 3, ref: 'SUB-2026-0138', barangay: 'Cayanga', type: 'Population report', period: 'Q3 2026', submittedBy: 'Arnel T. Manuel', submittedAt: '2026-10-12', status: 'Under review' },
  { id: 4, ref: 'SUB-2026-0136', barangay: 'Longos', type: 'Household survey', period: '2026', submittedBy: 'Cynthia A. Lopez', submittedAt: '2026-10-10', status: 'Under review' },
  { id: 5, ref: 'SUB-2026-0133', barangay: 'Bolasi', type: 'Monthly report', period: 'September 2026', submittedBy: 'Gina R. Bautista', submittedAt: '2026-10-08', status: 'Approved', reviewedAt: '2026-10-09' },
  { id: 6, ref: 'SUB-2026-0129', barangay: 'Angio', type: 'Barangay profile', period: '2026', submittedBy: 'Marites C. Soriano', submittedAt: '2026-10-05', status: 'Returned', remarks: 'Total households does not match the household survey. Please recheck purok counts.', reviewedAt: '2026-10-06' },
  { id: 7, ref: 'SUB-2026-0124', barangay: 'Nibaliw Central', type: 'Population report', period: 'Q3 2026', submittedBy: 'Maricel V. Domingo', submittedAt: '2026-10-02', status: 'Approved', reviewedAt: '2026-10-03' },
  { id: 8, ref: 'SUB-2026-0119', barangay: 'Rabon', type: 'Monthly report', period: 'August 2026', submittedBy: 'Benjie O. Castillo', submittedAt: '2026-09-09', status: 'Approved', reviewedAt: '2026-09-11' },
])

const statuses: Status[] = ['Pending', 'Under review', 'Approved', 'Returned']
const activeTab = ref<Status | 'All'>('All')
const search = ref('')
const typeFilter = ref('')

const types: SubmissionType[] = ['Barangay profile', 'Population report', 'Household survey', 'Monthly report']

const counts = computed(() => {
  const c: Record<string, number> = { All: submissions.value.length }
  for (const s of statuses) c[s] = submissions.value.filter((x) => x.status === s).length
  return c
})

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return submissions.value
    .filter((s) => (activeTab.value === 'All' ? true : s.status === activeTab.value))
    .filter((s) => (typeFilter.value ? s.type === typeFilter.value : true))
    .filter((s) => !q || [s.ref, s.barangay, s.type, s.submittedBy].some((v) => v.toLowerCase().includes(q)))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
})

const badge: Record<Status, string> = {
  Pending: 'bg-slate-100 text-slate-700 ring-slate-300',
  'Under review': 'bg-blue-50 text-blue-800 ring-blue-200',
  Approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  Returned: 'bg-amber-50 text-amber-900 ring-amber-200',
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })

// Review panel
const selectedId = ref<number | null>(null)
const selected = computed(() => submissions.value.find((s) => s.id === selectedId.value) ?? null)
const remarks = ref('')
const toast = ref('')

watch(selectedId, () => (remarks.value = ''))

function open(s: Submission) {
  selectedId.value = s.id
  // Opening a pending item marks it as being reviewed.
  if (s.status === 'Pending') s.status = 'Under review'
}
function close() {
  selectedId.value = null
}
function notify(msg: string) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), 2500)
}
function approve() {
  if (!selected.value) return
  selected.value.status = 'Approved'
  selected.value.remarks = undefined
  selected.value.reviewedAt = new Date().toISOString().slice(0, 10)
  notify(`${selected.value.ref} approved`)
  close()
  // TODO: PATCH /api/municipal/submissions/:id { status: 'approved' }
}
function returnToBarangay() {
  if (!selected.value || !remarks.value.trim()) return
  selected.value.status = 'Returned'
  selected.value.remarks = remarks.value.trim()
  selected.value.reviewedAt = new Date().toISOString().slice(0, 10)
  notify(`${selected.value.ref} returned to ${selected.value.barangay}`)
  close()
  // TODO: PATCH /api/municipal/submissions/:id { status: 'returned', remarks }
}
const canDecide = computed(() => selected.value && !['Approved', 'Returned'].includes(selected.value.status))
</script>

<template>
  <div class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">Submitted profiles and reports</h1>
      <p class="mt-1 text-sm text-slate-600">
        Review what barangays have sent. Approve a submission or return it with remarks for correction.
      </p>
    </header>

    <!-- Status tabs -->
    <div class="border-b border-slate-200">
      <nav class="-mb-px flex gap-1 overflow-x-auto" aria-label="Submission status">
        <button
          v-for="tab in ['All', ...statuses]"
          :key="tab"
          type="button"
          class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          :class="
            activeTab === tab
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
          "
          :aria-current="activeTab === tab ? 'page' : undefined"
          @click="activeTab = tab as Status | 'All'"
        >
          {{ tab }}
          <span class="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{{ counts[tab] }}</span>
        </button>
      </nav>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-end gap-3">
      <label class="min-w-[14rem] flex-1 text-xs font-medium text-slate-600">
        Search
        <input
          v-model="search"
          type="search"
          placeholder="Reference, barangay or sender"
          class="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        />
      </label>
      <label class="text-xs font-medium text-slate-600">
        Type
        <select
          v-model="typeFilter"
          class="mt-1 block w-52 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
        >
          <option value="">All types</option>
          <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
        </select>
      </label>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th scope="col" class="px-4 py-3">Submission</th>
              <th scope="col" class="px-4 py-3">Barangay</th>
              <th scope="col" class="px-4 py-3">Period</th>
              <th scope="col" class="px-4 py-3">Submitted</th>
              <th scope="col" class="px-4 py-3">Status</th>
              <th scope="col" class="px-4 py-3"><span class="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="s in rows" :key="s.id" class="hover:bg-slate-50">
              <td class="px-4 py-3">
                <p class="font-medium text-slate-900">{{ s.type }}</p>
                <p class="text-xs text-slate-500">{{ s.ref }}</p>
              </td>
              <td class="px-4 py-3 text-slate-700">{{ s.barangay }}</td>
              <td class="px-4 py-3 text-slate-700">{{ s.period }}</td>
              <td class="whitespace-nowrap px-4 py-3">
                <p class="text-slate-700">{{ fmt(s.submittedAt) }}</p>
                <p class="text-xs text-slate-500">{{ s.submittedBy }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" :class="badge[s.status]">
                  {{ s.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  @click="open(s)"
                >
                  {{ s.status === 'Approved' || s.status === 'Returned' ? 'View' : 'Review' }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-slate-600">
                No submissions in this view.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Review panel -->
    <div v-if="selected" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-slate-900/40" aria-hidden="true" @click="close" />
      <aside
        class="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        @keydown.esc="close"
      >
        <div class="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <h2 id="review-title" class="text-base font-semibold text-slate-900">{{ selected.type }}</h2>
            <p class="text-sm text-slate-600">{{ selected.barangay }} · {{ selected.ref }}</p>
          </div>
          <button
            type="button"
            class="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Close review panel"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
          <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt class="text-xs text-slate-500">Period</dt>
              <dd class="text-slate-900">{{ selected.period }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Status</dt>
              <dd>
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset" :class="badge[selected.status]">
                  {{ selected.status }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Submitted by</dt>
              <dd class="text-slate-900">{{ selected.submittedBy }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">Submitted on</dt>
              <dd class="text-slate-900">{{ fmt(selected.submittedAt) }}</dd>
            </div>
            <div v-if="selected.reviewedAt">
              <dt class="text-xs text-slate-500">Reviewed on</dt>
              <dd class="text-slate-900">{{ fmt(selected.reviewedAt) }}</dd>
            </div>
          </dl>

          <!-- TODO: render the real submitted data / link to the document preview here -->
          <div class="rounded-md border border-dashed border-slate-300 p-4 text-slate-600">
            Submission contents will appear here.
          </div>

          <div v-if="selected.status === 'Returned' && selected.remarks" class="rounded-md bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
            <p class="text-xs font-medium">Remarks sent to barangay</p>
            <p class="mt-1">{{ selected.remarks }}</p>
          </div>

          <label v-if="canDecide" class="block text-xs font-medium text-slate-600">
            Remarks (required to return)
            <textarea
              v-model="remarks"
              rows="4"
              placeholder="Tell the barangay what needs to be corrected"
              class="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
            />
          </label>
        </div>

        <div v-if="canDecide" class="flex gap-3 border-t border-slate-200 p-5">
          <button
            type="button"
            class="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!remarks.trim()"
            @click="returnToBarangay"
          >
            Return to barangay
          </button>
          <button
            type="button"
            class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            @click="approve"
          >
            Approve
          </button>
        </div>
      </aside>
    </div>

    <!-- Toast -->
    <p
      v-if="toast"
      role="status"
      class="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
    >
      {{ toast }}
    </p>
  </div>
</template>