<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import { isoDate } from '@/data/animals'
import {
  MEDIATION_DAYS,
  PANGKAT_EXTENSION_DAYS,
  REPUDIATION_DAYS,
  actionLabels,
  attendanceOptions,
  certificateReasons,
  hearingKinds,
  hearingResults,
  referralTargets,
  useBlotter,
  type ActionPayload,
  type Attendance,
  type BlotterAction,
  type BlotterRow,
  type HearingKind,
  type HearingResult,
} from '@/data/blotter'

const props = defineProps<{ entry: BlotterRow | null; action: BlotterAction | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { apply } = useBlotter()
const today = isoDate()

const open = computed(() => !!props.entry && !!props.action)

const date = ref(today)
const terms = ref('')
const reason = ref('')
const target = ref('')
const note = ref('')
const hearingKind = ref<HearingKind>('Mediation (Punong Barangay)')
const attended = ref<Attendance>('Both parties')
const result = ref<HearingResult>('Continued')
const submitted = ref(false)

const dialogEl = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      date.value = today
      terms.value = ''
      note.value = ''
      target.value = ''
      submitted.value = false
      // A settled case can only be reopened by a repudiation.
      reason.value = props.entry?.status === 'Settled' ? 'Settlement repudiated' : ''
      hearingKind.value = props.entry?.status === 'Pangkat conciliation' ? 'Conciliation (Pangkat)' : 'Mediation (Punong Barangay)'
      attended.value = 'Both parties'
      result.value = 'Continued'
      await nextTick()
      dialogEl.value?.querySelector<HTMLElement>('input, select, textarea, button[data-primary]')?.focus()
    } else {
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

const description = computed(() => {
  switch (props.action) {
    case 'mediation':
      return `Moves the case to mediation before the Punong Barangay. The ${MEDIATION_DAYS}-day mediation period is counted from the first meeting.`
    case 'pangkat':
      return 'Mediation did not settle the dispute, so a Pangkat ng Tagapagkasundo is constituted. The Pangkat period is counted from the day it convenes.'
    case 'extend':
      return `Gives the Pangkat ${PANGKAT_EXTENSION_DAYS} more days. This can be done once per case.`
    case 'settle':
      return `The parties reached an amicable settlement. A party has ${REPUDIATION_DAYS} days to repudiate it.`
    case 'certificate':
      return 'Issues a Certificate to File Action so the complainant can bring the case to court or another office. This closes the barangay case.'
    case 'refer':
      return 'Records that this case was handed to another office. This closes the barangay case.'
    case 'withdraw':
      return 'The complainant no longer wants to pursue the matter. This closes the case.'
    case 'hearing':
      return 'Record a meeting that already took place.'
    default:
      return ''
  }
})

const minDate = computed(() => props.entry?.reportedAt ?? '')
const needsDate = computed(() => props.action === 'mediation' || props.action === 'pangkat' || props.action === 'settle' || props.action === 'hearing')
const dateMax = computed(() => (props.action === 'mediation' || props.action === 'pangkat' ? undefined : today))

const dateError = computed(() => {
  if (!needsDate.value) return ''
  if (!date.value) return 'Enter a date.'
  if (date.value < minDate.value) return 'The date cannot be before the case was reported.'
  if (props.action === 'pangkat' && props.entry?.mediationStart && date.value < props.entry.mediationStart) {
    return 'The Pangkat cannot convene before mediation started.'
  }
  if (dateMax.value && date.value > dateMax.value) return 'The date cannot be in the future.'
  return ''
})

const fieldError = computed(() => {
  if (props.action === 'settle' && !terms.value.trim()) return 'Write down the terms of the settlement.'
  if (props.action === 'certificate' && !reason.value) return 'Choose the reason.'
  if (props.action === 'refer' && !target.value) return 'Choose where the case is referred.'
  return ''
})

function payload(): ActionPayload | null {
  switch (props.action) {
    case 'mediation':
      return { action: 'mediation', date: date.value }
    case 'pangkat':
      return { action: 'pangkat', date: date.value }
    case 'extend':
      return { action: 'extend' }
    case 'settle':
      return { action: 'settle', date: date.value, terms: terms.value.trim() }
    case 'certificate':
      return { action: 'certificate', reason: reason.value }
    case 'refer':
      return { action: 'refer', target: target.value, note: note.value.trim() || undefined }
    case 'withdraw':
      return { action: 'withdraw', note: note.value.trim() || undefined }
    case 'hearing':
      return {
        action: 'hearing',
        hearing: { date: date.value, kind: hearingKind.value, attended: attended.value, result: result.value, notes: note.value.trim() || undefined },
      }
    default:
      return null
  }
}

function save() {
  submitted.value = true
  const p = payload()
  if (!props.entry || !p || dateError.value || fieldError.value) return
  apply(props.entry.id, p)
  emit('close')
}

const dateLabel = computed(() => {
  if (props.action === 'mediation') return 'Date of the first meeting'
  if (props.action === 'pangkat') return 'Date the Pangkat convened'
  if (props.action === 'settle') return 'Date of settlement'
  return 'Date of hearing'
})

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const areaCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <!-- .stop keeps Escape from also closing the drawer behind this dialog -->
  <div v-if="open && entry && action" class="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4" @keydown.esc.stop="emit('close')">
    <div class="fixed inset-0 bg-slate-900/30" aria-hidden="true" @click="emit('close')" />

    <div ref="dialogEl" role="dialog" aria-modal="true" aria-labelledby="ba-title" class="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="ba-title" class="text-[16px] font-medium text-bis-900">{{ actionLabels[action] }}</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">{{ description }}</p>
        </div>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
          @click="emit('close')"
        >
          <BisIcon name="x" :size="18" />
          <span class="sr-only">Close</span>
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <div v-if="needsDate">
          <label for="ba-date" :class="labelCls">{{ dateLabel }}</label>
          <input id="ba-date" v-model="date" type="date" :min="minDate" :max="dateMax" :class="inputCls" :aria-invalid="submitted && !!dateError" />
          <p v-if="submitted && dateError" role="alert" :class="errCls">{{ dateError }}</p>
        </div>

        <!-- Hearing -->
        <template v-if="action === 'hearing'">
          <div>
            <label for="ba-kind" :class="labelCls">Type of hearing</label>
            <select id="ba-kind" v-model="hearingKind" :class="inputCls">
              <option v-for="k in hearingKinds" :key="k" :value="k">{{ k }}</option>
            </select>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="ba-attended" :class="labelCls">Who came</label>
              <select id="ba-attended" v-model="attended" :class="inputCls">
                <option v-for="a in attendanceOptions" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
            <div>
              <label for="ba-result" :class="labelCls">Result</label>
              <select id="ba-result" v-model="result" :class="inputCls">
                <option v-for="r in hearingResults" :key="r" :value="r">{{ r }}</option>
              </select>
            </div>
          </div>
        </template>

        <!-- Settlement -->
        <div v-if="action === 'settle'">
          <label for="ba-terms" :class="labelCls">Terms of the settlement</label>
          <textarea id="ba-terms" v-model="terms" rows="4" maxlength="800" :class="areaCls" :aria-invalid="submitted && !!fieldError" />
          <p v-if="submitted && fieldError" role="alert" :class="errCls">{{ fieldError }}</p>
        </div>

        <!-- Certificate -->
        <div v-if="action === 'certificate'">
          <label for="ba-reason" :class="labelCls">Reason</label>
          <select id="ba-reason" v-model="reason" :disabled="entry.status === 'Settled'" :class="[inputCls, 'disabled:bg-slate-50 disabled:text-slate-500']" :aria-invalid="submitted && !!fieldError">
            <option value="" disabled>Choose a reason</option>
            <option v-for="r in certificateReasons" :key="r" :value="r">{{ r }}</option>
          </select>
          <p v-if="submitted && fieldError" role="alert" :class="errCls">{{ fieldError }}</p>
          <p v-else-if="entry.status === 'Settled'" class="mt-1 text-[12px] text-slate-500">Only available when a party repudiates the settlement in the allowed period.</p>
        </div>

        <!-- Referral -->
        <div v-if="action === 'refer'">
          <label for="ba-target" :class="labelCls">Refer to</label>
          <select id="ba-target" v-model="target" :class="inputCls" :aria-invalid="submitted && !!fieldError">
            <option value="" disabled>Choose an office</option>
            <option v-for="t in referralTargets" :key="t" :value="t">{{ t }}</option>
          </select>
          <p v-if="submitted && fieldError" role="alert" :class="errCls">{{ fieldError }}</p>
        </div>

        <!-- Notes (hearing, referral, withdrawal) -->
        <div v-if="action === 'hearing' || action === 'refer' || action === 'withdraw'">
          <label for="ba-note" :class="labelCls">{{ action === 'hearing' ? 'Notes (optional)' : action === 'refer' ? 'Details (optional)' : 'Reason (optional)' }}</label>
          <textarea id="ba-note" v-model="note" rows="3" maxlength="400" :class="areaCls" />
        </div>
      </div>

      <div class="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          data-primary
          :class="[
            'inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
            action === 'withdraw' ? 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600' : 'bg-bis-600 hover:bg-bis-700 focus-visible:outline-bis-600',
          ]"
          @click="save"
        >
          {{ actionLabels[action] }}
        </button>
      </div>
    </div>
  </div>
</template>
