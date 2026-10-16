<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { animalStatusDot, formatDate, useAnimals, vaccDot, type AnimalRow } from '@/data/animals'

const props = defineProps<{ row: AnimalRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const { vaccinationsOf } = useAnimals()
const history = computed(() => (props.row ? vaccinationsOf(props.row.id) : []))

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
        :aria-label="`Animal record: ${row.title}`"
        class="panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="grid size-12 shrink-0 place-items-center rounded-full bg-bis-100 text-[15px] font-medium text-bis-700" aria-hidden="true">
            {{ row.species[0] }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[16px] font-medium leading-6 text-bis-900">{{ row.title }}</h2>
            <p class="flex items-center gap-2 text-[12px] text-slate-500">
              <span class="tabular-nums">{{ row.id }}</span>
              <span class="flex items-center gap-1.5">
                <span :class="['size-1.5 rounded-full', animalStatusDot[row.status]]" />
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
            <span class="sr-only">Close record</span>
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Animal details</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Species</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.species }} ({{ row.category.toLowerCase() }})</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Quantity</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.count }}{{ row.count > 1 ? ' (group record)' : '' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Sex</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.sex }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Age</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.ageLabel }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Breed</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.breed || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Color</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.color || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Tag no.</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.tagNo || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Registered</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ formatDate(row.registeredAt) }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">{{ row.ownerType === 'Stray' ? 'Stray animal' : 'Owner' }}</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div class="col-span-2" v-if="row.ownerType !== 'Stray'">
                <dt class="text-[12px] text-slate-500">Name</dt>
                <dd class="text-[13px] font-medium text-slate-900">
                  {{ row.ownerLabel }}
                  <span v-if="row.ownerType === 'Non-resident'" class="ml-1 text-[12px] font-normal text-slate-500">(not a resident)</span>
                </dd>
              </div>
              <div v-if="row.owner">
                <dt class="text-[12px] text-slate-500">Resident ID</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.owner.residentId }}</dd>
              </div>
              <div v-if="row.owner?.contact || row.ownerContact">
                <dt class="text-[12px] text-slate-500">Contact</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.owner?.contact ?? row.ownerContact }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">{{ row.ownerType === 'Stray' ? 'Usually found at' : 'Address' }}</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.owner?.address ?? row.location ?? '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-[12px] font-medium text-slate-400">Vaccination</h3>
              <span class="flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
                <span :class="['size-1.5 rounded-full', vaccDot[row.vaccStatus]]" />
                {{ row.vaccStatus }}
              </span>
            </div>
            <ul v-if="history.length" class="divide-y divide-slate-100 rounded-lg border border-slate-200">
              <li v-for="v in history" :key="v.id" class="px-3 py-2.5">
                <p class="text-[13px] font-medium text-slate-900">{{ v.vaccine }}</p>
                <p class="text-[12px] text-slate-500">
                  Given {{ formatDate(v.date) }}<template v-if="row.count > 1"> · {{ v.count }} of {{ row.count }} animals</template>
                  <template v-if="v.nextDue"> · Next due {{ formatDate(v.nextDue) }}</template>
                </p>
                <p class="text-[12px] text-slate-400">{{ v.administeredBy }}</p>
              </li>
            </ul>
            <p v-else class="text-[13px] text-slate-500">No vaccinations recorded yet.</p>
          </section>

          <section v-if="row.notes" class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Notes</h3>
            <p class="text-[13px] text-slate-700">{{ row.notes }}</p>
          </section>
        </div>

        <footer class="flex items-center gap-2 border-t border-slate-200 px-5 py-4">
          <RouterLink
            :to="{ path: '/secretary/animals/vaccinations', query: { animal: row.id } }"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Record vaccination
          </RouterLink>
          <RouterLink
            :to="`/secretary/animals/registry/print/${row.id}`"
            class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Print
          </RouterLink>
          <RouterLink
            :to="`/secretary/animals/registry/${row.id}/edit`"
            class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Edit
          </RouterLink>
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