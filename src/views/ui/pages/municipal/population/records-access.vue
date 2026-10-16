<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { getBarangays, type BarangayRecord } from '@/data/m/barangayData'
import {
  cancelAccessRequest,
  createAccessRequest,
  durationLabels,
  effectiveStatus,
  getAccessRequests,
  purposeLabels,
  type AccessDuration,
  type AccessPurpose,
  type AccessRequest,
  type AccessStatus,
} from '@/data/m/recordsAccessData'

const MIN_DETAILS = 30

const barangays = ref<BarangayRecord[]>([])
const requests = ref<AccessRequest[]>([])
const loading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const [b, r] = await Promise.all([getBarangays(), getAccessRequests()])
    barangays.value = b
    requests.value = r
  } catch {
    loadError.value = 'Could not load your requests. Check your connection and reload the page.'
  } finally {
    loading.value = false
  }
})

// ---------- Form ----------
const form = reactive({
  barangayId: '',
  purpose: '' as AccessPurpose | '',
  subject: '',
  details: '',
  reference: '',
  duration: '24h' as AccessDuration,
  acknowledged: false,
})
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const submitError = ref('')
const justSubmitted = ref('')

const detailsLeft = computed(() => Math.max(0, MIN_DETAILS - form.details.trim().length))

function validate() {
  for (const key of Object.keys(errors)) delete errors[key]
  if (!form.barangayId) errors.barangayId = 'Choose the barangay whose records you need.'
  if (!form.purpose) errors.purpose = 'Choose the purpose that fits best.'
  if (form.subject.trim().length < 5) errors.subject = 'Say whose records you need, for example a household or a named resident.'
  if (form.details.trim().length < MIN_DETAILS)
    errors.details = `Explain why you need these records. Add ${detailsLeft.value} more characters.`
  if (!form.acknowledged) errors.acknowledged = 'Confirm this statement to continue.'
  return Object.keys(errors).length === 0
}

const fieldOrder = ['barangayId', 'purpose', 'subject', 'details', 'acknowledged']

async function submit() {
  justSubmitted.value = ''
  submitError.value = ''
  if (!validate()) {
    await nextTick()
    const first = fieldOrder.find((k) => errors[k])
    if (first) document.getElementById(`field-${first}`)?.focus()
    return
  }

  const barangay = barangays.value.find((b) => b.id === form.barangayId)
  submitting.value = true
  try {
    const created = await createAccessRequest({
      barangayId: form.barangayId,
      barangayName: barangay?.name ?? form.barangayId,
      purpose: form.purpose as AccessPurpose,
      subject: form.subject.trim(),
      details: form.details.trim(),
      reference: form.reference.trim() || undefined,
      duration: form.duration,
    })
    requests.value = [created, ...requests.value]
    justSubmitted.value = created.id
    Object.assign(form, { barangayId: '', purpose: '', subject: '', details: '', reference: '', duration: '24h', acknowledged: false })
  } catch {
    submitError.value = 'The request was not sent. Check your connection and try again.'
  } finally {
    submitting.value = false
  }
}

async function cancel(id: string) {
  try {
    await cancelAccessRequest(id)
    requests.value = requests.value.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
  } catch {
    loadError.value = 'Could not cancel the request. Try again.'
  }
}

// ---------- Display helpers ----------
const statusStyle: Record<AccessStatus, { label: string; cls: string }> = {
  pending: { label: 'Waiting for approval', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Access granted', cls: 'bg-emerald-50 text-emerald-700' },
  denied: { label: 'Denied', cls: 'bg-red-50 text-red-700' },
  expired: { label: 'Expired', cls: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-700' },
}

const dateTime = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

function expiresIn(ms: number) {
  const left = ms - Date.now()
  const hours = Math.max(1, Math.round(left / 3_600_000))
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`
  return `Expires in ${Math.round(hours / 24)} days`
}

const card = 'rounded-xl border border-slate-200 bg-white'
const label = 'mb-1.5 block text-sm font-medium text-slate-900'
const hint = 'mt-1 text-xs text-slate-600'
const errorText = 'mt-1 text-xs font-medium text-red-700'
const input = (key: string) => [
  'w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2',
  errors[key]
    ? 'border-red-500 focus:border-red-600 focus:ring-red-600/20'
    : 'border-slate-300 focus:border-bis-600 focus:ring-bis-600/20',
]
const link =
  'rounded font-medium text-bis-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600'
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Resident record access</h1>
      <p class="mt-1 text-sm text-slate-600">
        Population pages show totals only. To look at individual resident or household records, request access
        and state why you need it.
      </p>
    </div>

    <!-- How it works -->
    <section class="rounded-xl border border-bis-600/20 bg-bis-50 p-5" aria-labelledby="how-title">
      <h2 id="how-title" class="flex items-center gap-2 text-sm font-semibold text-bis-700">
        <BisIcon name="shield" :size="18" />
        How access works
      </h2>
      <ul class="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
        <li>Ask only for the records you need, for the shortest time that works.</li>
        <li>A reviewer approves or denies each request before any record opens.</li>
        <li>
          Each request and each record you open is written to the
          <RouterLink to="/municipal/user/access/audit" :class="link">audit trail</RouterLink>.
        </li>
      </ul>
    </section>

    <p
      v-if="loadError"
      role="alert"
      class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <BisIcon name="alert" :size="18" class="mt-0.5" />
      {{ loadError }}
    </p>

    <div class="grid gap-6 lg:grid-cols-5">
      <!-- Form -->
      <section :class="[card, 'p-5 lg:col-span-3']" aria-labelledby="form-title">
        <h2 id="form-title" class="text-sm font-semibold text-slate-900">New request</h2>

        <p
          v-if="justSubmitted"
          role="status"
          class="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <BisIcon name="shield" :size="18" class="mt-0.5" />
          Request {{ justSubmitted }} was sent. It now waits for approval in your requests.
        </p>
        <p
          v-if="submitError"
          role="alert"
          class="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <BisIcon name="alert" :size="18" class="mt-0.5" />
          {{ submitError }}
        </p>

        <form class="mt-4 space-y-5" novalidate @submit.prevent="submit">
          <div class="grid gap-5 sm:grid-cols-2">
            <div>
              <label for="field-barangayId" :class="label">Barangay</label>
              <select
                id="field-barangayId"
                v-model="form.barangayId"
                :class="[input('barangayId'), 'h-10']"
                :aria-invalid="!!errors.barangayId"
                :aria-describedby="errors.barangayId ? 'err-barangayId' : undefined"
              >
                <option value="" disabled>Choose a barangay</option>
                <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
              <p v-if="errors.barangayId" id="err-barangayId" :class="errorText">{{ errors.barangayId }}</p>
            </div>

            <div>
              <label for="field-purpose" :class="label">Purpose</label>
              <select
                id="field-purpose"
                v-model="form.purpose"
                :class="[input('purpose'), 'h-10']"
                :aria-invalid="!!errors.purpose"
                :aria-describedby="errors.purpose ? 'err-purpose' : undefined"
              >
                <option value="" disabled>Choose a purpose</option>
                <option v-for="(text, key) in purposeLabels" :key="key" :value="key">{{ text }}</option>
              </select>
              <p v-if="errors.purpose" id="err-purpose" :class="errorText">{{ errors.purpose }}</p>
            </div>
          </div>

          <div>
            <label for="field-subject" :class="label">Whose records do you need?</label>
            <input
              id="field-subject"
              v-model="form.subject"
              type="text"
              autocomplete="off"
              placeholder="For example: one household, or residents flagged in a report"
              :class="[input('subject'), 'h-10']"
              :aria-invalid="!!errors.subject"
              :aria-describedby="errors.subject ? 'err-subject' : 'hint-subject'"
            />
            <p v-if="errors.subject" id="err-subject" :class="errorText">{{ errors.subject }}</p>
            <p v-else id="hint-subject" :class="hint">Be specific. Requests for everyone in a barangay are usually denied.</p>
          </div>

          <div>
            <label for="field-details" :class="label">Why do you need them?</label>
            <textarea
              id="field-details"
              v-model="form.details"
              rows="4"
              placeholder="Describe the task these records are for and what you will do with them."
              :class="[input('details'), 'py-2']"
              :aria-invalid="!!errors.details"
              :aria-describedby="errors.details ? 'err-details' : 'hint-details'"
            />
            <p v-if="errors.details" id="err-details" :class="errorText">{{ errors.details }}</p>
            <p v-else id="hint-details" :class="hint">
              {{ detailsLeft > 0 ? `At least ${detailsLeft} more characters` : 'Thank you, this is enough detail to review' }}
            </p>
          </div>

          <div>
            <label for="field-reference" :class="label">
              Reference number <span class="font-normal text-slate-600">(optional)</span>
            </label>
            <input
              id="field-reference"
              v-model="form.reference"
              type="text"
              autocomplete="off"
              placeholder="Memo or letter number"
              :class="[input('reference'), 'h-10 sm:max-w-xs']"
            />
          </div>

          <fieldset>
            <legend :class="label">How long do you need access?</legend>
            <div class="grid gap-2 sm:grid-cols-3">
              <label
                v-for="(text, key) in durationLabels"
                :key="key"
                class="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 has-[:checked]:border-bis-600 has-[:checked]:bg-bis-50 has-[:checked]:text-bis-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-bis-600/40"
              >
                <input v-model="form.duration" type="radio" name="duration" :value="key" class="size-4 accent-bis-600" />
                {{ text }}
              </label>
            </div>
            <p :class="hint">Choose the shortest time that works. Access ends automatically.</p>
          </fieldset>

          <div>
            <label class="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
              <input
                id="field-acknowledged"
                v-model="form.acknowledged"
                type="checkbox"
                class="mt-0.5 size-4 shrink-0 accent-bis-600"
                :aria-invalid="!!errors.acknowledged"
                :aria-describedby="errors.acknowledged ? 'err-acknowledged' : undefined"
              />
              I will use these records only for the purpose above, and I understand that my access is logged.
            </label>
            <p v-if="errors.acknowledged" id="err-acknowledged" :class="errorText">{{ errors.acknowledged }}</p>
          </div>

          <div class="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              :disabled="submitting"
              class="inline-flex h-10 items-center rounded-lg bg-bis-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-bis-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            >
              {{ submitting ? 'Sending request' : 'Send request' }}
            </button>
          </div>
        </form>
      </section>

      <!-- Request history -->
      <section :class="[card, 'p-5 lg:col-span-2']" aria-labelledby="history-title">
        <h2 id="history-title" class="text-sm font-semibold text-slate-900">Your requests</h2>

        <div v-if="loading" class="mt-4 space-y-3" aria-busy="true">
          <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
        </div>

        <p v-else-if="requests.length === 0" class="mt-4 text-sm text-slate-600">
          You have not requested access yet. Requests you send will appear here with their status.
        </p>

        <ul v-else class="mt-4 space-y-3">
          <li
            v-for="r in requests"
            :key="r.id"
            :class="[
              'rounded-lg border p-4',
              r.id === justSubmitted ? 'border-bis-600/40 bg-bis-50' : 'border-slate-200',
            ]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-900">{{ r.barangayName }}</p>
                <p class="text-xs text-slate-600">{{ purposeLabels[r.purpose] }}</p>
              </div>
              <span
                :class="['inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyle[effectiveStatus(r)].cls]"
              >
                {{ statusStyle[effectiveStatus(r)].label }}
              </span>
            </div>

            <p class="mt-2 text-sm text-slate-700">{{ r.subject }}</p>

            <p class="mt-2 text-xs text-slate-500">
              {{ dateTime.format(r.requestedAt) }} | {{ durationLabels[r.duration] }}
              <template v-if="r.reference"> | Ref {{ r.reference }}</template>
            </p>

            <p v-if="effectiveStatus(r) === 'approved' && r.expiresAt" class="mt-1 text-xs font-medium text-emerald-700">
              {{ expiresIn(r.expiresAt) }}
            </p>
            <p v-if="r.decisionNote" class="mt-1 text-xs text-red-700">{{ r.decisionNote }}</p>

            <button
              v-if="r.status === 'pending'"
              type="button"
              :class="['mt-3 text-xs', link]"
              @click="cancel(r.id)"
            >
              Cancel request
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>