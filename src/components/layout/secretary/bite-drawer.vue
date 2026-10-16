<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { formatDate } from '@/data/animals'
import {
  biteCategories,
  categoryChip,
  observationDot,
  outcomes,
  useBites,
  type AnimalOutcome,
  type BiteRow,
} from '@/data/bites'

const props = defineProps<{ row: BiteRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { setOutcome, closeCase, reopenCase } = useBites()

const closeButton = ref<HTMLButtonElement | null>(null)
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
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.row) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

/* ------------------------------ Outcome update ----------------------------- */
const draft = ref<AnimalOutcome>('Under observation')
watch(
  () => [props.row?.id, props.row?.outcome],
  () => {
    if (props.row) draft.value = props.row.outcome
  },
  { immediate: true },
)

const isOpen = computed(() => props.row?.status === 'Open')
const outcomeChanged = computed(() => !!props.row && draft.value !== props.row.outcome)
const canClose = computed(() => !!props.row && props.row.outcome !== 'Under observation')

const category = computed(() => biteCategories.find((c) => c.key === props.row?.category))
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
        :aria-label="`Bite incident ${row.id}`"
        class="panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="grid size-12 shrink-0 place-items-center rounded-full bg-bis-100 text-[15px] font-medium text-bis-700" aria-hidden="true">
            {{ row.victim.name[0] }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[16px] font-medium leading-6 text-bis-900">{{ row.victim.name }}</h2>
            <p class="flex items-center gap-2 text-[12px] text-slate-500">
              <span class="tabular-nums">{{ row.id }}</span>
              <span :class="['rounded-md px-1.5 py-0.5 text-[11px] font-medium', categoryChip[row.category]]">Category {{ row.category }}</span>
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
            <span class="sr-only">Close incident</span>
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <!-- Observation -->
          <section>
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Animal observation</h3>
            <div class="rounded-lg border border-slate-200 p-3">
              <p class="flex items-center gap-2 text-[14px] font-medium text-slate-900">
                <span :class="['size-2 rounded-full', observationDot[row.observationState]]" />
                {{ row.observationLabel }}
              </p>
              <p class="mt-0.5 text-[12px] text-slate-500">
                <template v-if="row.outcome === 'Under observation'">Observe until {{ formatDate(row.observationEnds) }}.</template>
                <template v-else>Observation period was {{ formatDate(row.incidentDate) }} to {{ formatDate(row.observationEnds) }}.</template>
              </p>
              <p v-if="row.observationState === 'Needs update'" role="alert" class="mt-2 text-[12px] font-medium text-red-700">
                The observation period has ended. Record how the animal is doing.
              </p>

              <div class="mt-3 flex items-end gap-2">
                <div class="flex-1">
                  <label for="bite-outcome" class="mb-1 block text-[12px] font-medium text-slate-600">Outcome</label>
                  <select
                    id="bite-outcome"
                    v-model="draft"
                    :disabled="!isOpen"
                    class="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option v-for="o in outcomes" :key="o" :value="o">{{ o }}</option>
                  </select>
                </div>
                <button
                  type="button"
                  :disabled="!isOpen || !outcomeChanged"
                  class="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  @click="setOutcome(row.id, draft)"
                >
                  Save
                </button>
              </div>
            </div>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Incident</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Date</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.incidentDate) }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Reported</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.reportedAt) }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">Place</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.place }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Body part</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.bodyPart }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Provocation</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.provocation }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">Category {{ row.category }}</dt>
                <dd class="text-[13px] text-slate-700">{{ category?.description }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Victim</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Age and sex</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.victim.age ?? '—' }}{{ row.victim.age !== undefined ? ' yrs' : '' }} · {{ row.victim.sex ?? '—' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Contact</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.victim.contact || '—' }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">Address</dt>
                <dd class="text-[13px] font-medium text-slate-900">
                  {{ row.victim.address }}
                  <span v-if="row.victimType === 'Non-resident'" class="font-normal text-slate-500">(not a resident)</span>
                </dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Animal</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">{{ row.animalKind === 'Registered' ? 'Registered animal' : 'Not in registry' }}</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.animalLabel }}</dd>
              </div>
              <div v-if="row.animalId">
                <dt class="text-[12px] text-slate-500">Registry record</dt>
                <dd class="text-[13px] font-medium">
                  <RouterLink
                    :to="{ path: '/secretary/animals/registry', query: { open: row.animalId } }"
                    class="tabular-nums text-bis-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
                  >
                    {{ row.animalId }}
                  </RouterLink>
                </dd>
              </div>
              <div v-if="row.animalDescription" class="col-span-2">
                <dt class="text-[12px] text-slate-500">Description</dt>
                <dd class="text-[13px] text-slate-700">{{ row.animalDescription }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Action taken</h3>
            <ul v-if="row.actions.length" class="space-y-1.5 text-[13px] text-slate-700">
              <li v-for="a in row.actions" :key="a" class="flex gap-2">
                <span class="mt-[7px] size-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
                {{ a }}
              </li>
            </ul>
            <p v-else class="text-[13px] text-slate-500">None recorded</p>
          </section>

          <section v-if="row.notes" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Notes</h3>
            <p class="text-[13px] text-slate-700">{{ row.notes }}</p>
          </section>
        </div>

        <footer class="border-t border-slate-200 px-5 py-4">
          <p v-if="isOpen && !canClose" class="mb-2 text-[12px] text-slate-500">Record the observation outcome before closing this case.</p>
          <div class="flex items-center gap-2">
            <button
              v-if="isOpen"
              type="button"
              :disabled="!canClose"
              class="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bis-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
              @click="closeCase(row.id)"
            >
              Close case
            </button>
            <button
              v-else
              type="button"
              class="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
              @click="reopenCase(row.id)"
            >
              Reopen case
            </button>
            <RouterLink
              :to="`/secretary/animals/bites/${row.id}/edit`"
              class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            >
              Edit
            </RouterLink>
          </div>
        </footer>
      </aside>
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