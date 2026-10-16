<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import VawcActionDialog from '@/components/layout/secretary/vawc/vawc-action-dialog.vue'
import { formatDate } from '@/data/animals'
import { trapFocus } from '@/utils/trap-focus'
import { actionLabels, availableActions, bpoDot, eventDot, isChild, type VawcAction, type VawcRow } from '@/data/vawc'
import type { Person } from '@/data/bites'

const props = defineProps<{ row: VawcRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const closeButton = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const pendingAction = ref<VawcAction | null>(null)
// Names, addresses and the narrative stay hidden until the secretary asks to see them.
// TODO: when this talks to an API, record who revealed which case and when.
const revealed = ref(false)
let previouslyFocused: HTMLElement | null = null

watch(
  () => props.row?.id,
  async (id, oldId) => {
    revealed.value = false
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
const events = computed(() => (props.row ? [...props.row.events].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) : []))

const bpoCardClass = computed(() => {
  switch (props.row?.bpoState) {
    case 'Expires soon': return 'border-amber-200 bg-amber-50 text-amber-800'
    case 'Expired': return 'border-slate-200 bg-slate-50 text-slate-700'
    default: return 'border-slate-200 bg-white text-slate-900'
  }
})

function partyLine(p: Person) {
  return [p.residentId, p.age !== undefined ? `${p.age} yrs` : '', p.address].filter(Boolean).join(' · ')
}
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
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="`VAWC case ${row.id}`"
        class="panel absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
        @keydown="trapFocus($event, panel)"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[16px] font-medium leading-6 text-bis-900">{{ row.abuseTypes.join(', ') }}</h2>
            <p class="flex items-center gap-2 text-[12px] text-slate-500">
              <span class="tabular-nums">{{ row.id }}</span>
              <span>{{ row.status }}</span>
            </p>
          </div>
          <button
            ref="closeButton"
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            <BisIcon name="x" :size="18" />
            <span class="sr-only">Close case</span>
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section v-if="row.attention" class="rounded-lg border border-red-200 bg-red-50 p-3">
            <p class="text-[13px] font-medium text-red-800">{{ row.attention }}</p>
            <p v-if="row.immediateDanger" class="text-[12px] text-red-700">The victim was reported to be in immediate danger or in need of medical attention.</p>
          </section>

          <section v-if="row.bpo" :class="['rounded-lg border p-3', bpoCardClass]">
            <p class="text-[12px] opacity-80">Barangay Protection Order · <span class="tabular-nums">{{ row.bpo.no }}</span></p>
            <p class="flex items-center gap-2 text-[16px] font-medium">
              <span :class="['size-2 rounded-full', bpoDot[row.bpoState]]" />
              {{ row.bpoLabel }}
            </p>
            <p class="text-[12px] opacity-80">
              Issued {{ formatDate(row.bpo.issuedAt) }} by {{ row.bpo.issuedBy }} · ends {{ formatDate(row.bpoEnds) }}
            </p>
            <p class="text-[12px] opacity-80">
              {{ row.bpo.servedAt ? `Served ${formatDate(row.bpo.servedAt)} by ${row.bpo.servedBy}` : 'Not yet served on the respondent' }}
            </p>
            <p v-if="row.bpoState === 'Expired'" class="mt-2 text-[12px]">
              The barangay cannot extend a BPO. The victim may apply to the court for a protection order.
            </p>
          </section>

          <section>
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Case</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Date and time</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.incidentDate) }}{{ row.incidentTime ? `, ${row.incidentTime}` : '' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Reported</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.reportedAt) }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Respondent is the victim’s</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.relationship }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Reported by</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.reportedBy }}</dd>
              </div>
            </dl>
          </section>

          <!-- Confidential details -->
          <section v-if="!revealed" class="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p class="text-[13px] text-amber-900">Names, addresses, the place and the narrative are hidden. Case records are confidential under RA 9262.</p>
            <button
              type="button"
              class="mt-2 inline-flex h-8 items-center rounded-lg border border-amber-300 bg-white px-3 text-[13px] font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
              @click="revealed = true"
            >
              Show details
            </button>
          </section>

          <template v-else>
            <section>
              <div class="mb-2 flex items-center justify-between">
                <h3 class="text-[12px] font-medium text-slate-400">What was reported</h3>
                <button type="button" class="text-[12px] font-medium text-bis-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600" @click="revealed = false">Hide details</button>
              </div>
              <p class="text-[12px] text-slate-500">Place</p>
              <p class="mb-2 text-[13px] font-medium text-slate-900">{{ row.place }}</p>
              <p class="whitespace-pre-line text-[13px] text-slate-700">{{ row.narrative }}</p>
            </section>

            <section v-for="s in [{ label: 'Victims', list: row.victims }, { label: 'Respondents', list: row.respondents }]" :key="s.label" class="border-t border-slate-100 pt-5">
              <h3 class="mb-2 text-[12px] font-medium text-slate-400">{{ s.label }}</h3>
              <ul class="space-y-2.5">
                <li v-for="(p, i) in s.list" :key="`${p.residentId ?? p.name}-${i}`">
                  <p class="text-[13px] font-medium text-slate-900">
                    {{ p.name }}
                    <span v-if="isChild(p)" class="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Child</span>
                  </p>
                  <p class="text-[12px] text-slate-500">{{ partyLine(p) }}</p>
                </li>
              </ul>
            </section>
          </template>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Activity</h3>
            <p v-if="!events.length" class="text-[13px] text-slate-500">Nothing has been done on this case yet.</p>
            <ol v-else class="space-y-3">
              <li v-for="e in events" :key="e.id" class="flex gap-3">
                <span :class="['mt-1.5 size-2 shrink-0 rounded-full', eventDot[e.kind]]" />
                <div class="min-w-0">
                  <p class="text-[13px] font-medium text-slate-900">{{ e.title }}</p>
                  <p class="text-[12px] text-slate-500">{{ e.kind }} · {{ formatDate(e.date) }}</p>
                  <p v-if="e.note" class="mt-0.5 text-[12px] text-slate-600">{{ e.note }}</p>
                </div>
              </li>
            </ol>
          </section>

          <section v-if="row.status === 'Closed'" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Closed</h3>
            <p class="text-[13px] font-medium text-slate-900">{{ row.closedReason }}</p>
            <p v-if="row.closedAt" class="text-[12px] text-slate-500">{{ formatDate(row.closedAt) }}</p>
          </section>
        </div>

        <footer class="border-t border-slate-200 px-5 py-4">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="(a, i) in actions"
              :key="a"
              type="button"
              :class="[
                'inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600',
                i === 0 ? 'bg-bis-600 text-white hover:bg-bis-700' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
              ]"
              @click="pendingAction = a"
            >
              {{ actionLabels[a] }}
            </button>
            <RouterLink
              v-if="row.status === 'Open'"
              :to="`/secretary/vawc/cases/${row.id}/edit`"
              class="ml-auto inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            >
              Edit entry
            </RouterLink>
          </div>
        </footer>
      </aside>

      <VawcActionDialog :entry="row" :action="pendingAction" @close="pendingAction = null" />
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