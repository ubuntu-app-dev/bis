<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import { addDays, isoDate } from '@/data/animals'
import { trapFocus } from '@/utils/trap-focus'
import {
  BPO_DAYS,
  actionError,
  actionLabels,
  assistanceTypes,
  bpoIssuers,
  closingReasons,
  referralTargets,
  useVawc,
  type ActionPayload,
  type BpoIssuer,
  type VawcAction,
  type VawcRow,
} from '@/data/vawc'

const props = defineProps<{ entry: VawcRow | null; action: VawcAction | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { apply } = useVawc()
const today = isoDate()
const open = computed(() => !!props.entry && !!props.action)

const date = ref(today)
const issuedBy = ref<BpoIssuer>('Punong Barangay')
const pbUnavailable = ref(false)
const servedBy = ref('')
const type = ref('')
const target = ref('')
const reason = ref('')
const note = ref('')
const submitted = ref(false)
const applyError = ref('')

const dialogEl = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      date.value = today
      issuedBy.value = 'Punong Barangay'
      pbUnavailable.value = false
      servedBy.value = ''
      type.value = ''
      target.value = ''
      reason.value = ''
      note.value = ''
      submitted.value = false
      applyError.value = ''
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
    case 'bpo':
      return `A Barangay Protection Order is issued the day the application is made, is effective for ${BPO_DAYS} days, and must be served on the respondent right away. The barangay cannot extend it.`
    case 'serve':
      return 'Record that a copy of the BPO was personally served on the respondent.'
    case 'violation':
      return 'Record that the respondent violated the BPO while it was in effect. Report it to the police.'
    case 'assist':
      return 'Record help given to the victim, such as taking her to a hospital or a safe place.'
    case 'refer':
      return 'Record that the case or the victim was referred to another office. You can log more than one referral.'
    case 'close':
      return 'Closes the barangay record. You can reopen it later if needed.'
    case 'reopen':
      return 'Reopens a closed case. The reason is kept in the activity log.'
    default:
      return ''
  }
})

const needsDate = computed(() => ['bpo', 'serve', 'violation', 'assist', 'refer'].includes(props.action ?? ''))
const usesBpoDate = computed(() => (props.action === 'serve' || props.action === 'violation') && !!props.entry?.bpo)
const dateMin = computed(() => (usesBpoDate.value ? props.entry!.bpo!.issuedAt : (props.entry?.incidentDate ?? '')))
const dateMax = computed(() => {
  if (props.action === 'violation' && props.entry?.bpo) {
    const ends = addDays(props.entry.bpo.issuedAt, BPO_DAYS)
    return ends < today ? ends : today
  }
  return today
})

function payload(): ActionPayload | null {
  const n = note.value.trim()
  switch (props.action) {
    case 'bpo':
      return { action: 'bpo', date: date.value, issuedBy: issuedBy.value, pbUnavailable: pbUnavailable.value }
    case 'serve':
      return { action: 'serve', date: date.value, servedBy: servedBy.value, note: n || undefined }
    case 'violation':
      return { action: 'violation', date: date.value, note: n }
    case 'assist':
      return { action: 'assist', date: date.value, type: type.value, note: n || undefined }
    case 'refer':
      return { action: 'refer', date: date.value, target: target.value, note: n || undefined }
    case 'close':
      return { action: 'close', reason: reason.value, note: n || undefined }
    case 'reopen':
      return { action: 'reopen', note: n }
    default:
      return null
  }
}

const error = computed(() => {
  const p = payload()
  return props.entry && p ? actionError(props.entry, p) : ''
})

// Clicking outside must not throw away something the secretary has typed.
const dirty = computed(() => !!(note.value.trim() || servedBy.value.trim()))
function onBackdrop() {
  if (!dirty.value) emit('close')
}

function save() {
  submitted.value = true
  const p = payload()
  if (!props.entry || !p || error.value) return
  applyError.value = apply(props.entry.id, p)
  if (!applyError.value) emit('close')
}

const noteLabel = computed(() => {
  switch (props.action) {
    case 'violation': return 'What happened'
    case 'reopen': return 'Reason for reopening'
    default: return 'Notes (optional)'
  }
})
const dateLabel = computed(() => {
  switch (props.action) {
    case 'bpo': return 'Date the BPO was issued'
    case 'serve': return 'Date it was served'
    case 'violation': return 'Date of the violation'
    default: return 'Date'
  }
})

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const areaCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
</script>

<template>
  <!-- .stop keeps Escape from also closing the drawer behind this dialog -->
  <div v-if="open && entry && action" class="fixed inset-0 z-[70] grid place-items-center overflow-y-auto p-4" @keydown.esc.stop="emit('close')">
    <div class="fixed inset-0 bg-slate-900/30" aria-hidden="true" @click="onBackdrop" />

    <div
      ref="dialogEl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="va-title"
      class="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      @keydown="trapFocus($event, dialogEl)"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="va-title" class="text-[16px] font-medium text-bis-900">{{ actionLabels[action] }}</h2>
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
          <label for="va-date" :class="labelCls">{{ dateLabel }}</label>
          <input id="va-date" v-model="date" type="date" :min="dateMin" :max="dateMax" :class="inputCls" />
          <p v-if="action === 'bpo' && date !== entry.reportedAt" class="mt-1 text-[12px] text-slate-500">A BPO is normally issued on the day the application is made.</p>
        </div>

        <!-- BPO -->
        <template v-if="action === 'bpo'">
          <div>
            <label for="va-issuer" :class="labelCls">Issued by</label>
            <select id="va-issuer" v-model="issuedBy" :class="inputCls">
              <option v-for="i in bpoIssuers" :key="i" :value="i">{{ i }}</option>
            </select>
          </div>
          <label v-if="issuedBy === 'Barangay Kagawad'" class="flex items-start gap-2 text-[13px] text-slate-700">
            <input v-model="pbUnavailable" type="checkbox" class="mt-0.5 size-4 rounded border-slate-300 text-bis-600 focus:ring-bis-600" />
            The Punong Barangay was unavailable when this order was issued.
          </label>
        </template>

        <!-- Service -->
        <div v-if="action === 'serve'">
          <label for="va-served" :class="labelCls">Served by</label>
          <input id="va-served" v-model="servedBy" type="text" maxlength="80" placeholder="Name of the barangay official or tanod" :class="inputCls" />
        </div>

        <!-- Assistance -->
        <div v-if="action === 'assist'">
          <label for="va-type" :class="labelCls">Kind of help</label>
          <select id="va-type" v-model="type" :class="inputCls">
            <option value="" disabled>Choose one</option>
            <option v-for="t in assistanceTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <!-- Referral -->
        <div v-if="action === 'refer'">
          <label for="va-target" :class="labelCls">Referred to</label>
          <select id="va-target" v-model="target" :class="inputCls">
            <option value="" disabled>Choose an office</option>
            <option v-for="t in referralTargets" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <!-- Closing -->
        <div v-if="action === 'close'">
          <label for="va-reason" :class="labelCls">Reason</label>
          <select id="va-reason" v-model="reason" :class="inputCls">
            <option value="" disabled>Choose a reason</option>
            <option v-for="r in closingReasons" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>

        <div v-if="action !== 'bpo'">
          <label for="va-note" :class="labelCls">{{ noteLabel }}</label>
          <textarea id="va-note" v-model="note" rows="3" maxlength="400" :class="areaCls" />
        </div>
      </div>

      <p v-if="(submitted && error) || applyError" role="alert" class="mt-4 text-[12px] text-red-600">{{ applyError || error }}</p>

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
          class="inline-flex h-9 items-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          {{ actionLabels[action] }}
        </button>
      </div>
    </div>
  </div>
</template>