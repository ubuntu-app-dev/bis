<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import BlotterActionDialog from '@/components/layout/secretary/blotter/blotter-action-dialog.vue'
import { formatDate } from '@/data/animals'
import {
  actionLabels,
  availableActions,
  blotterStatusDot,
  isMinor,
  printForms,
  type BlotterAction,
  type BlotterRow,
} from '@/data/blotter'
import type { Person } from '@/data/bites'

const props = defineProps<{ row: BlotterRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const closeButton = ref<HTMLButtonElement | null>(null)
const pendingAction = ref<BlotterAction | null>(null)
let previouslyFocused: HTMLElement | null = null

// Move focus into the panel when it opens, and back to where the user was when it closes.
watch(
  () => props.row?.id,
  async (id, oldId) => {
    if (id && !oldId) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      closeButton.value?.focus()
    } else if (!id && oldId) {
      pendingAction.value = null
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  // While a dialog is open, Escape belongs to the dialog.
  if (e.key === 'Escape' && props.row && !pendingAction.value) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const actions = computed(() => (props.row ? availableActions(props.row) : []))
const hearings = computed(() => (props.row ? [...props.row.hearings].sort((a, b) => b.date.localeCompare(a.date)) : []))

const deadlineClass = computed(() => {
  switch (props.row?.deadline?.state) {
    case 'Overdue':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'Due soon':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    default:
      return 'border-slate-200 bg-white text-slate-900'
  }
})

// Which printable forms make sense for the case's current stage.
const forms = computed(() => (props.row ? printForms(props.row) : []))

function partyLine(p: Person) {
  return [p.residentId, p.age !== undefined ? `${p.age} yrs` : '', p.address].filter(Boolean).join(' · ')
}

const sections: { key: 'complainants' | 'respondents' | 'witnesses'; label: string }[] = [
  { key: 'complainants', label: 'Complainants' },
  { key: 'respondents', label: 'Respondents' },
  { key: 'witnesses', label: 'Witnesses' },
]
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div v-if="row" class="fixed inset-0 z-[60]">
      <div class="absolute inset-0 bg-slate-900/30" aria-hidden="true" @click="emit('close')" />

      <aside
        role="dialog"
        aria-modal="true"
        :aria-label="`Blotter entry ${row.id}`"
        class="panel absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[16px] font-medium leading-6 text-bis-900">{{ row.incidentType }}</h2>
            <p class="flex items-center gap-2 text-[12px] text-slate-500">
              <span class="tabular-nums">{{ row.id }}</span>
              <span class="flex items-center gap-1.5">
                <span :class="['size-1.5 rounded-full', blotterStatusDot[row.status]]" />
                {{ row.status }}
              </span>
            </p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            <BisIcon name="x" :size="18" />
            <span class="sr-only">Close entry</span>
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <!-- Deadline / next step -->
          <section v-if="row.deadline" :class="['rounded-lg border p-3', deadlineClass]">
            <p class="text-[12px] opacity-80">{{ row.deadline.title }}</p>
            <p class="text-[16px] font-medium">{{ row.deadline.text }}</p>
            <p class="text-[12px] opacity-80">Ends {{ formatDate(row.deadline.due) }}</p>
          </section>
          <section v-else-if="row.status === 'Recorded'" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p class="text-[13px] text-slate-700">
              This is only recorded. If the complainant wants a settlement, start mediation to begin the Katarungang Pambarangay process.
            </p>
          </section>

          <section>
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Incident</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Date and time</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.incidentDate) }}{{ row.incidentTime ? `, ${row.incidentTime}` : '' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Reported</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.reportedAt) }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">Place</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.place }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">What happened</dt>
                <dd class="whitespace-pre-line text-[13px] text-slate-700">{{ row.narrative }}</dd>
              </div>
            </dl>
          </section>

          <section v-for="s in sections" v-show="row[s.key].length" :key="s.key" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">{{ s.label }}</h3>
            <ul class="space-y-2.5">
              <li v-for="(p, i) in row[s.key]" :key="`${p.residentId ?? p.name}-${i}`">
                <p class="text-[13px] font-medium text-slate-900">
                  {{ p.name }}
                  <span v-if="isMinor(p)" class="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Minor</span>
                </p>
                <p class="text-[12px] text-slate-500">{{ partyLine(p) }}</p>
              </li>
            </ul>
          </section>

          <section v-if="hearings.length" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Hearings</h3>
            <ul class="divide-y divide-slate-100 rounded-lg border border-slate-200">
              <li v-for="h in hearings" :key="h.id" class="px-3 py-2.5">
                <p class="text-[13px] font-medium text-slate-900">{{ h.kind }}</p>
                <p class="text-[12px] text-slate-500">{{ formatDate(h.date) }} · {{ h.attended }} · {{ h.result }}</p>
                <p v-if="h.notes" class="mt-0.5 text-[12px] text-slate-600">{{ h.notes }}</p>
              </li>
            </ul>
          </section>

          <section v-if="row.settlementTerms" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Settlement{{ row.settlementDate ? ` · ${formatDate(row.settlementDate)}` : '' }}</h3>
            <p class="whitespace-pre-line text-[13px] text-slate-700">{{ row.settlementTerms }}</p>
          </section>

          <section v-if="row.certificateNo" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Certificate to file action</h3>
            <p class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.certificateNo }}</p>
            <p class="text-[12px] text-slate-500">{{ row.certificateReason }} · issued {{ row.certificateIssuedAt ? formatDate(row.certificateIssuedAt) : '' }}</p>
          </section>

          <section v-if="row.referredTo || (row.status === 'Withdrawn' && row.closingNote)" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">{{ row.referredTo ? 'Referral' : 'Withdrawn' }}</h3>
            <p v-if="row.referredTo" class="text-[13px] font-medium text-slate-900">{{ row.referredTo }}</p>
            <p v-if="row.closingNote" class="text-[13px] text-slate-700">{{ row.closingNote }}</p>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Print</h3>
            <ul class="space-y-1">
              <li v-for="f in forms" :key="f.kind">
                <RouterLink
                  :to="{ path: `/secretary/blotter/records/print/${row.id}`, query: { kind: f.kind } }"
                  class="text-[13px] font-medium text-bis-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                >
                  {{ f.label }}
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>

        <footer class="border-t border-slate-200 px-5 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="(a, i) in actions"
              :key="a"
              type="button"
              :class="[
                'inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
                i === 0
                  ? 'bg-bis-600 text-white hover:bg-bis-700 focus-visible:outline-bis-600'
                  : a === 'withdraw'
                    ? 'border border-slate-300 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-red-600'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-bis-600',
              ]"
              @click="pendingAction = a"
            >
              {{ a === 'certificate' && row.status === 'Settled' ? 'Settlement repudiated' : actionLabels[a] }}
            </button>
            <RouterLink
              :to="`/secretary/cases/blotter/${row.id}/edit`"
              class="ml-auto inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            >
              Edit entry
            </RouterLink>
          </div>
        </footer>
      </aside>

      <BlotterActionDialog :entry="row" :action="pendingAction" @close="pendingAction = null" />
    </div>
  </Transition>
</template>

<style scoped>
.panel {
  animation: slide-in 0.22s ease-out;
}
@keyframes slide-in {
  from {
    transform: translateX(32px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .panel {
    animation: none;
  }
}
</style>
