<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import type { ResidentRow } from '@/data/residents'

const props = defineProps<{ row: ResidentRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

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

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusDot: Record<string, string> = {
  Active: 'bg-emerald-500',
  Transferred: 'bg-amber-500',
  Deceased: 'bg-slate-400',
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
        role="dialog"
        aria-modal="true"
        :aria-label="`Resident profile: ${row.displayName}`"
        class="panel absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="grid size-12 shrink-0 place-items-center rounded-full bg-bis-100 text-[15px] font-medium text-bis-700">
            {{ row.initials }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-[16px] font-medium leading-6 text-bis-900">{{ row.displayName }}</h2>
            <p class="flex items-center gap-2 text-[12px] text-slate-500">
              <span class="tabular-nums">{{ row.id }}</span>
              <span class="flex items-center gap-1.5">
                <span :class="['size-1.5 rounded-full', statusDot[row.status]]" />
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
            <span class="sr-only">Close profile</span>
          </button>
        </header>

        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Personal details</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Age</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.age }} years old</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Sex</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.sex }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Birthdate</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ longDate(row.birthdate) }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Civil status</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.civilStatus }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Occupation</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.occupation }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Contact</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.contact }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Residence</h3>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <dt class="text-[12px] text-slate-500">Purok</dt>
                <dd class="text-[13px] font-medium text-slate-900">Purok {{ row.purok }}</dd>
              </div>
              <div>
                <dt class="text-[12px] text-slate-500">Household no.</dt>
                <dd class="text-[13px] font-medium tabular-nums text-slate-900">{{ row.householdNo }}</dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[12px] text-slate-500">Address</dt>
                <dd class="text-[13px] font-medium text-slate-900">{{ row.address }}, Purok {{ row.purok }}</dd>
              </div>
            </dl>
          </section>

          <section class="border-t border-slate-100 pt-5">
            <h3 class="mb-2 text-[12px] font-medium text-slate-400">Classifications</h3>
            <ul v-if="row.tags.length" class="flex flex-wrap gap-1.5">
              <li v-for="tag in row.tags" :key="tag.key" :class="['rounded-md px-2 py-1 text-[12px] font-medium', tag.class]">
                {{ tag.label }}
              </li>
            </ul>
            <p v-else class="text-[13px] text-slate-500">None recorded</p>
          </section>
        </div>

        <footer class="flex items-center gap-2 border-t border-slate-200 px-5 py-4">
          <RouterLink
            :to="{ path: '/secretary/certifications/clearance', query: { resident: row.id } }"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Issue certificate
          </RouterLink>
          <RouterLink
            :to="`/secretary/residents/${row.id}/edit`"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Edit record
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
