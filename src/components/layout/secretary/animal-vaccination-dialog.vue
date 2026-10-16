<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import AnimalPicker from '@/components/layout/secretary/animal-picker.vue'
import { addMonths, isoDate, speciesByKey, useAnimals, type AnimalRow } from '@/data/animals'

const props = defineProps<{ open: boolean; animalId?: string | null }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', message: string): void
}>()

const { rows, addVaccination } = useAnimals()
const today = isoDate()

const picked = ref<AnimalRow | null>(null)
const vaccine = ref('')
const otherVaccine = ref('')
const date = ref(today)
const count = ref(1)
const nextDue = ref('')
const administeredBy = ref('')
const submitted = ref(false)

const dialogEl = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function reset() {
  picked.value = null
  vaccine.value = ''
  otherVaccine.value = ''
  date.value = today
  count.value = 1
  nextDue.value = ''
  administeredBy.value = ''
  submitted.value = false
}

function choose(a: AnimalRow) {
  picked.value = a
  vaccine.value = ''
  count.value = a.count
}

// Runs each time the dialog opens: clear it, preselect the animal if one was passed in, then focus the first field.
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocused = document.activeElement as HTMLElement | null
      reset()
      const a = props.animalId ? rows.value.find((r) => r.id === props.animalId) : undefined
      if (a) choose(a)
      await nextTick()
      dialogEl.value?.querySelector<HTMLElement>('input, select')?.focus()
    } else {
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  },
  { immediate: true },
)

const vaccineOptions = computed(() => [...(speciesByKey[picked.value?.species ?? '']?.vaccines ?? []), 'Other'])
const finalVaccine = computed(() => (vaccine.value === 'Other' ? otherVaccine.value.trim() : vaccine.value))

const errors = computed(() => ({
  animal: picked.value ? '' : 'Choose an animal.',
  vaccine: finalVaccine.value ? '' : vaccine.value === 'Other' ? 'Enter the vaccine name.' : 'Choose a vaccine.',
  date: !date.value ? 'Enter the date given.' : date.value > today ? 'The date cannot be in the future.' : '',
  count:
    picked.value && Number.isInteger(count.value) && count.value >= 1 && count.value <= picked.value.count
      ? ''
      : `Enter a whole number from 1 to ${picked.value?.count ?? 1}.`,
  nextDue: nextDue.value && date.value && nextDue.value < date.value ? 'Next due cannot be before the date given.' : '',
  by: administeredBy.value.trim() ? '' : 'Enter who gave the vaccine.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function setNextDue(months: number) {
  if (date.value) nextDue.value = addMonths(date.value, months)
}

function save() {
  submitted.value = true
  if (hasErrors.value || !picked.value) return

  addVaccination({
    animalId: picked.value.id,
    vaccine: finalVaccine.value,
    date: date.value,
    nextDue: nextDue.value || undefined,
    count: Number(count.value),
    administeredBy: administeredBy.value.trim(),
  })
  emit('saved', `${finalVaccine.value} recorded for ${picked.value.title}.`)
  emit('close')
}

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" @keydown.esc="emit('close')">
    <div class="fixed inset-0 bg-slate-900/30" aria-hidden="true" @click="emit('close')" />

    <div
      ref="dialogEl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vx-title"
      class="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="vx-title" class="text-[16px] font-medium text-bis-900">Record vaccination</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">For a whole barangay drive, use “Vaccination drive” instead.</p>
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
        <!-- Animal -->
        <div>
          <p :class="labelCls">Animal</p>
          <div v-if="picked" class="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-full bg-bis-100 text-[13px] font-medium text-bis-700" aria-hidden="true">{{ picked.species[0] }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13px] font-medium text-slate-900">{{ picked.title }}</p>
              <p class="truncate text-[12px] text-slate-500">{{ picked.subtitle }} · <span class="tabular-nums">{{ picked.id }}</span></p>
              <p class="truncate text-[12px] text-slate-500">{{ picked.ownerLabel }}</p>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-bis-600 hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
              @click="picked = null"
            >
              Change
            </button>
          </div>
          <AnimalPicker v-else :animals="rows" input-id="vx-animal" :invalid="submitted && !!errors.animal" @pick="choose" />
          <p v-if="submitted && errors.animal" role="alert" :class="errCls">{{ errors.animal }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Vaccine -->
          <div :class="vaccine === 'Other' ? '' : 'sm:col-span-2'">
            <label for="vx-vaccine" :class="labelCls">Vaccine</label>
            <select id="vx-vaccine" v-model="vaccine" :disabled="!picked" :class="[inputCls, 'disabled:bg-slate-50 disabled:text-slate-400']" :aria-invalid="submitted && !!errors.vaccine">
              <option value="" disabled>{{ picked ? 'Choose a vaccine' : 'Choose an animal first' }}</option>
              <option v-for="v in vaccineOptions" :key="v" :value="v">{{ v }}</option>
            </select>
            <p v-if="submitted && errors.vaccine && vaccine !== 'Other'" role="alert" :class="errCls">{{ errors.vaccine }}</p>
          </div>
          <div v-if="vaccine === 'Other'">
            <label for="vx-other" :class="labelCls">Vaccine name</label>
            <input id="vx-other" v-model="otherVaccine" type="text" maxlength="60" :class="inputCls" />
            <p v-if="submitted && errors.vaccine" role="alert" :class="errCls">{{ errors.vaccine }}</p>
          </div>

          <!-- Date + count -->
          <div>
            <label for="vx-date" :class="labelCls">Date given</label>
            <input id="vx-date" v-model="date" type="date" :max="today" :class="inputCls" :aria-invalid="submitted && !!errors.date" />
            <p v-if="submitted && errors.date" role="alert" :class="errCls">{{ errors.date }}</p>
          </div>
          <div v-if="picked && picked.count > 1">
            <label for="vx-count" :class="labelCls">Number vaccinated (of {{ picked.count }})</label>
            <input id="vx-count" v-model.number="count" type="number" min="1" :max="picked.count" step="1" :class="[inputCls, 'tabular-nums']" />
            <p v-if="submitted && errors.count" role="alert" :class="errCls">{{ errors.count }}</p>
          </div>

          <!-- Next due -->
          <div class="sm:col-span-2">
            <div class="flex items-end gap-2">
              <div class="flex-1">
                <label for="vx-next" :class="labelCls">Next due (optional)</label>
                <input id="vx-next" v-model="nextDue" type="date" :min="date" :class="inputCls" :aria-invalid="submitted && !!errors.nextDue" />
              </div>
              <button
                type="button"
                class="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                @click="setNextDue(6)"
              >
                +6 months
              </button>
              <button
                type="button"
                class="h-9 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                @click="setNextDue(12)"
              >
                +1 year
              </button>
            </div>
            <p v-if="submitted && errors.nextDue" role="alert" :class="errCls">{{ errors.nextDue }}</p>
            <p v-else class="mt-1 text-[12px] text-slate-500">Leave empty if no booster is needed. Follow your veterinarian’s schedule.</p>
          </div>

          <div class="sm:col-span-2">
            <label for="vx-by" :class="labelCls">Administered by</label>
            <input id="vx-by" v-model="administeredBy" type="text" maxlength="80" placeholder="Name or office" :class="inputCls" :aria-invalid="submitted && !!errors.by" />
            <p v-if="submitted && errors.by" role="alert" :class="errCls">{{ errors.by }}</p>
          </div>
        </div>
      </div>

      <div class="mt-5 flex items-center justify-end gap-2">
        <p v-if="submitted && hasErrors" role="alert" class="mr-auto text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          Record vaccination
        </button>
      </div>
    </div>
  </div>
</template>