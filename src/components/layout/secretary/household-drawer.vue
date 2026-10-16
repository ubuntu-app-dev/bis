<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import type { HouseholdRow } from '@/data/households'

const props = defineProps<{ row: HouseholdRow | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

// Keep the last household so its content stays visible while the panel slides out.
const shown = ref<HouseholdRow | null>(props.row)
const closeBtn = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.row,
  async (r) => {
    if (r) {
      shown.value = r
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      closeBtn.value?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus?.()
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

const statusDot: Record<string, string> = {
  Active: 'bg-emerald-500',
  Transferred: 'bg-amber-500',
  Dissolved: 'bg-slate-400',
}

const stats = computed(() => {
  const m = shown.value?.members ?? []
  return [
    { label: 'Members', value: m.length },
    { label: 'Children', value: m.filter((x) => x.age < 18).length },
    { label: 'Adults', value: m.filter((x) => x.age >= 18 && x.age < 60).length },
    { label: 'Seniors', value: m.filter((x) => x.age >= 60).length },
  ]
})

const registered = computed(() => {
  if (!shown.value) return ''
  return new Date(`${shown.value.dateRegistered}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const details = computed(() => {
  const h = shown.value
  if (!h) return []
  return [
    { label: 'Address', value: `${h.address}, Purok ${h.purok}` },
    { label: 'Contact number', value: h.contact || '—' },
    { label: 'Tenure status', value: h.tenure },
    { label: 'Date registered', value: registered.value },
  ]
})

const housing = computed(() => {
  const h = shown.value
  if (!h) return []
  return [
    { label: 'Dwelling type', value: h.dwellingType },
    { label: 'Water source', value: h.waterSource },
    { label: 'Toilet facility', value: h.toiletFacility },
    { label: 'Electricity', value: h.hasElectricity ? 'Connected' : 'None' },
  ]
})

const orderedMembers = computed(() =>
  [...(shown.value?.members ?? [])].sort((a, b) => (a.relationship === 'Head' ? -1 : b.relationship === 'Head' ? 1 : b.age - a.age)),
)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="row" class="fixed inset-0 z-[99998] bg-slate-900/40" aria-hidden="true" @click="emit('close')" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="row && shown"
        class="fixed inset-y-0 right-0 z-[99999] flex w-full max-w-lg flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-drawer-title"
      >
        <!-- Header -->
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="grid size-11 shrink-0 place-items-center rounded-full bg-bis-50 text-[14px] font-medium text-bis-700" aria-hidden="true">
            {{ shown.initials }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 id="household-drawer-title" class="truncate text-[16px] font-medium leading-6 text-bis-900">
              {{ shown.headDisplayName }}
            </h2>
            <p class="text-[12px] tabular-nums text-slate-500">
              Household {{ shown.householdNo }} · {{ shown.id }}
            </p>
            <span class="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-slate-700">
              <span :class="['size-1.5 rounded-full', statusDot[shown.status]]" />
              {{ shown.status }}
            </span>
          </div>
          <button
            ref="closeBtn"
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            <BisIcon name="x" :size="18" />
            <span class="sr-only">Close household details</span>
          </button>
        </header>

        <!-- Body -->
        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <!-- Composition -->
          <dl class="grid grid-cols-4 gap-2">
            <div v-for="s in stats" :key="s.label" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <dt class="text-[11px] text-slate-500">{{ s.label }}</dt>
              <dd class="mt-0.5 text-[18px] font-medium leading-6 tabular-nums text-bis-900">{{ s.value }}</dd>
            </div>
          </dl>

          <!-- Classification -->
          <section>
            <h3 class="text-[12px] font-medium uppercase tracking-wide text-slate-500">Classification</h3>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-for="tag in shown.tags"
                :key="tag.key"
                :class="['rounded-md px-2 py-1 text-[12px] font-medium', tag.class]"
              >
                {{ tag.label }}
              </span>
              <span v-if="!shown.tags.length" class="text-[13px] text-slate-400">No classification</span>
            </div>
          </section>

          <!-- Household information -->
          <section>
            <h3 class="text-[12px] font-medium uppercase tracking-wide text-slate-500">Household information</h3>
            <dl class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <div v-for="d in details" :key="d.label" class="flex items-start justify-between gap-4 px-3.5 py-2.5 text-[13px]">
                <dt class="shrink-0 text-slate-500">{{ d.label }}</dt>
                <dd class="text-right font-medium text-slate-900">{{ d.value }}</dd>
              </div>
            </dl>
          </section>

          <!-- Housing -->
          <section>
            <h3 class="text-[12px] font-medium uppercase tracking-wide text-slate-500">Housing and utilities</h3>
            <dl class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <div v-for="d in housing" :key="d.label" class="flex items-start justify-between gap-4 px-3.5 py-2.5 text-[13px]">
                <dt class="shrink-0 text-slate-500">{{ d.label }}</dt>
                <dd class="text-right font-medium text-slate-900">{{ d.value }}</dd>
              </div>
            </dl>
          </section>

          <!-- Members -->
          <section>
            <h3 class="text-[12px] font-medium uppercase tracking-wide text-slate-500">
              Household members ({{ shown.members.length }})
            </h3>
            <ul class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              <li v-for="m in orderedMembers" :key="m.id" class="flex items-center gap-3 px-3.5 py-2.5">
                <span class="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-medium text-slate-600" aria-hidden="true">
                  {{ m.firstName.charAt(0) }}{{ m.lastName.charAt(0) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[13px] font-medium text-slate-900">{{ m.firstName }} {{ m.lastName }}</p>
                  <p class="truncate text-[12px] text-slate-500">
                    {{ m.relationship }} · {{ m.sex }}, {{ m.age }} yrs · {{ m.occupation }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap justify-end gap-1">
                  <span v-if="m.relationship === 'Head'" class="rounded-md bg-bis-50 px-1.5 py-0.5 text-[11px] font-medium text-bis-700">Head</span>
                  <span v-if="m.age >= 60" class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Senior</span>
                  <span v-if="m.isPwd" class="rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">PWD</span>
                  <span v-if="m.isVoter" class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">Voter</span>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- Footer -->
        <footer class="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            Close
          </button>
          <RouterLink
            :to="`/secretary/households/${shown.id}/edit`"
            class="inline-flex h-9 items-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Edit household
          </RouterLink>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>