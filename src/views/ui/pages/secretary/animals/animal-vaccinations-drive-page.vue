<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import {
  addMonths,
  isoDate,
  speciesByKey,
  speciesList,
  useAnimals,
  vaccDot,
  vaccineStatus,
  type AnimalRow,
  type VaccStatus,
} from '@/data/animals'

const { rows, vaccinations, addVaccination } = useAnimals()
const today = isoDate()

/* ---------------------------------- Details --------------------------------- */
const allVaccines = [...new Set(speciesList.flatMap((s) => s.vaccines))]

const vaccine = ref('')
const date = ref(today)
const nextDue = ref('')
const administeredBy = ref('')
const submitted = ref(false)
const savedCount = ref<number | null>(null)

function setNextDue(months: number) {
  if (date.value) nextDue.value = addMonths(date.value, months)
}

/* -------------------------------- Candidates -------------------------------- */
// Active animals whose species uses the chosen vaccine, with how many of them still need it.
interface Candidate {
  row: AnimalRow
  status: VaccStatus
  remaining: number
}

const search = ref('')
const onlyNeeding = ref(true)
// animal id -> number to vaccinate. An id being present means the row is selected.
const selected = ref<Record<string, number>>({})

const candidates = computed<Candidate[]>(() => {
  if (!vaccine.value) return []
  return rows.value
    .filter((r) => r.status === 'Active' && speciesByKey[r.species]?.vaccines.includes(vaccine.value))
    .map((row) => ({ row, ...vaccineStatus(row, vaccine.value, vaccinations.value) }))
})

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return candidates.value.filter(
    (c) => (!onlyNeeding.value || c.status !== 'Up to date') && (!q || c.row.haystack.includes(q)),
  )
})

watch(vaccine, () => {
  selected.value = {}
})

function defaultCount(c: Candidate) {
  return c.remaining > 0 ? c.remaining : c.row.count
}

function toggle(c: Candidate) {
  const next = { ...selected.value }
  if (next[c.row.id] !== undefined) delete next[c.row.id]
  else next[c.row.id] = defaultCount(c)
  selected.value = next
}

const allVisibleSelected = computed(() => visible.value.length > 0 && visible.value.every((c) => selected.value[c.row.id] !== undefined))
const someVisibleSelected = computed(() => visible.value.some((c) => selected.value[c.row.id] !== undefined))

function toggleAllVisible(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  const next = { ...selected.value }
  for (const c of visible.value) {
    if (checked) next[c.row.id] ??= defaultCount(c)
    else delete next[c.row.id]
  }
  selected.value = next
}

const selectedCandidates = computed(() => candidates.value.filter((c) => selected.value[c.row.id] !== undefined))
const totalAnimals = computed(() => selectedCandidates.value.reduce((sum, c) => sum + (Number(selected.value[c.row.id]) || 0), 0))

/* ------------------------------- Validation -------------------------------- */
function countIsValid(c: Candidate) {
  const n = selected.value[c.row.id]
  return Number.isInteger(n) && n >= 1 && n <= c.row.count
}

const errors = computed(() => ({
  vaccine: vaccine.value ? '' : 'Choose a vaccine.',
  date: !date.value ? 'Enter the date given.' : date.value > today ? 'The date cannot be in the future.' : '',
  nextDue: nextDue.value && date.value && nextDue.value < date.value ? 'Next due cannot be before the date given.' : '',
  by: administeredBy.value.trim() ? '' : 'Enter who gave the vaccine.',
  selection: selectedCandidates.value.length ? '' : 'Select at least one animal.',
  counts: selectedCandidates.value.every(countIsValid) ? '' : 'Check the highlighted numbers. Each must be between 1 and the size of the group.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function save() {
  submitted.value = true
  if (hasErrors.value) return

  for (const c of selectedCandidates.value) {
    addVaccination({
      animalId: c.row.id,
      vaccine: vaccine.value,
      date: date.value,
      nextDue: nextDue.value || undefined,
      count: Number(selected.value[c.row.id]),
      administeredBy: administeredBy.value.trim(),
    })
  }
  savedCount.value = selectedCandidates.value.length
}

function startAnother() {
  savedCount.value = null
  submitted.value = false
  selected.value = {}
  search.value = ''
}

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <div class="space-y-6">
    <div>
      <RouterLink
        to="/secretary/animals/vaccinations"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        Back to vaccinations
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Vaccination drive</h1>
      <p class="mt-0.5 text-[13px] text-slate-500">Record one vaccine for many animals at once.</p>
    </div>

    <!-- Done -->
    <div v-if="savedCount !== null" role="status" class="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
      <div class="mx-auto grid size-10 place-items-center rounded-lg bg-emerald-50 text-[18px] font-medium text-emerald-600" aria-hidden="true">✓</div>
      <p class="mt-3 text-[14px] font-medium text-bis-900">
        {{ savedCount }} {{ savedCount === 1 ? 'record' : 'records' }} saved
      </p>
      <p class="mx-auto mt-0.5 max-w-sm text-[13px] text-slate-500">{{ vaccine }} was recorded for the selected animals.</p>
      <div class="mt-4 flex justify-center gap-2">
        <RouterLink
          to="/secretary/animals/vaccinations"
          class="inline-flex h-9 items-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          Back to vaccinations
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="startAnother"
        >
          Start another drive
        </button>
      </div>
    </div>

    <div v-else class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <!-- Details -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Drive details</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="drive-vaccine" :class="labelCls">Vaccine</label>
              <select id="drive-vaccine" v-model="vaccine" :class="inputCls" :aria-invalid="submitted && !!errors.vaccine">
                <option value="" disabled>Choose a vaccine</option>
                <option v-for="v in allVaccines" :key="v" :value="v">{{ v }}</option>
              </select>
              <p v-if="submitted && errors.vaccine" role="alert" :class="errCls">{{ errors.vaccine }}</p>
            </div>

            <div>
              <label for="drive-date" :class="labelCls">Date given</label>
              <input id="drive-date" v-model="date" type="date" :max="today" :class="inputCls" :aria-invalid="submitted && !!errors.date" />
              <p v-if="submitted && errors.date" role="alert" :class="errCls">{{ errors.date }}</p>
            </div>

            <div class="sm:col-span-2">
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <label for="drive-next" :class="labelCls">Next due (optional)</label>
                  <input id="drive-next" v-model="nextDue" type="date" :min="date" :class="inputCls" :aria-invalid="submitted && !!errors.nextDue" />
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
            </div>

            <div class="sm:col-span-2">
              <label for="drive-by" :class="labelCls">Administered by</label>
              <input id="drive-by" v-model="administeredBy" type="text" maxlength="80" placeholder="Name or office" :class="inputCls" :aria-invalid="submitted && !!errors.by" />
              <p v-if="submitted && errors.by" role="alert" :class="errCls">{{ errors.by }}</p>
            </div>
          </div>
        </section>

        <!-- Animals -->
        <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div class="flex flex-wrap items-center gap-3 px-5 pt-5">
            <h2 class="text-[14px] font-medium text-bis-900">Animals</h2>
            <label v-if="vaccine" class="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-slate-600">
              <input v-model="onlyNeeding" type="checkbox" class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
              Only animals that need it
            </label>
          </div>

          <div v-if="!vaccine" class="px-6 py-14 text-center">
            <p class="text-[14px] font-medium text-bis-900">Choose a vaccine first</p>
            <p class="mt-0.5 text-[13px] text-slate-500">The list will show the active animals that can receive it.</p>
          </div>

          <template v-else>
            <div class="px-5 py-3">
              <div class="relative">
                <label for="drive-search" class="sr-only">Search animals</label>
                <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="drive-search"
                  v-model="search"
                  type="search"
                  placeholder="Search name, species or owner"
                  autocomplete="off"
                  :class="[inputCls, 'pl-9']"
                />
              </div>
            </div>

            <div class="max-h-[32rem] overflow-auto">
              <table class="w-full min-w-[36rem] text-left text-[13px]">
                <thead class="sticky top-0 bg-slate-50">
                  <tr class="border-y border-slate-200 text-[12px] font-medium text-slate-500">
                    <th scope="col" class="w-10 py-2.5 pl-5 pr-1">
                      <input
                        type="checkbox"
                        class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600"
                        :checked="allVisibleSelected"
                        :indeterminate="someVisibleSelected && !allVisibleSelected"
                        :disabled="!visible.length"
                        aria-label="Select all listed animals"
                        @change="toggleAllVisible"
                      />
                    </th>
                    <th scope="col" class="px-3 py-2.5">Animal</th>
                    <th scope="col" class="px-3 py-2.5">Owner</th>
                    <th scope="col" class="px-3 py-2.5">Status</th>
                    <th scope="col" class="px-3 py-2.5 pr-5">Number to vaccinate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="c in visible"
                    :key="c.row.id"
                    :class="['border-b border-slate-100 last:border-b-0', selected[c.row.id] !== undefined ? 'bg-bis-50/60' : 'hover:bg-slate-50']"
                  >
                    <td class="py-2.5 pl-5 pr-1">
                      <input
                        type="checkbox"
                        class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600"
                        :checked="selected[c.row.id] !== undefined"
                        :aria-label="`Select ${c.row.title}`"
                        @change="toggle(c)"
                      />
                    </td>
                    <td class="px-3 py-2.5">
                      <p class="max-w-[13rem] truncate font-medium text-slate-900">{{ c.row.title }}</p>
                      <p class="text-[12px] text-slate-400">{{ c.row.subtitle }} · <span class="tabular-nums">{{ c.row.id }}</span></p>
                    </td>
                    <td class="px-3 py-2.5">
                      <p :class="['max-w-[12rem] truncate', c.row.ownerType === 'Stray' ? 'italic text-slate-500' : 'text-slate-700']">{{ c.row.ownerLabel }}</p>
                      <p class="max-w-[12rem] truncate text-[12px] text-slate-400">{{ c.row.ownerPlace }}</p>
                    </td>
                    <td class="whitespace-nowrap px-3 py-2.5">
                      <span class="inline-flex items-center gap-1.5 text-slate-700">
                        <span :class="['size-1.5 rounded-full', vaccDot[c.status]]" />
                        {{ c.status }}
                      </span>
                    </td>
                    <td class="px-3 py-2.5 pr-5">
                      <template v-if="selected[c.row.id] !== undefined && c.row.count > 1">
                        <label :for="`count-${c.row.id}`" class="sr-only">Number of {{ c.row.title }} to vaccinate</label>
                        <input
                          :id="`count-${c.row.id}`"
                          v-model.number="selected[c.row.id]"
                          type="number"
                          min="1"
                          :max="c.row.count"
                          step="1"
                          :aria-invalid="submitted && !countIsValid(c)"
                          :class="['h-8 w-20 rounded-lg border bg-white px-2 text-[13px] tabular-nums focus:outline-none focus:ring-2', submitted && !countIsValid(c) ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-300 focus:border-bis-600 focus:ring-bis-600/20']"
                        />
                        <span class="ml-1.5 text-[12px] text-slate-400">of {{ c.row.count }}</span>
                      </template>
                      <span v-else class="tabular-nums text-slate-500">{{ c.row.count > 1 ? `${c.row.count} (group)` : '1' }}</span>
                    </td>
                  </tr>

                  <tr v-if="!visible.length">
                    <td colspan="5" class="px-6 py-12 text-center">
                      <p class="text-[14px] font-medium text-bis-900">{{ candidates.length ? 'No animals match' : 'No animals can receive this vaccine' }}</p>
                      <p class="mt-0.5 text-[13px] text-slate-500">
                        {{ candidates.length ? 'Turn off “Only animals that need it” or change the search.' : 'Register animals of a matching species first.' }}
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Vaccine</dt>
            <dd class="font-medium text-slate-900">{{ vaccine || 'Not chosen yet' }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Records to save</dt>
            <dd class="text-[18px] font-medium tabular-nums text-slate-900">{{ selectedCandidates.length }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Animals vaccinated</dt>
            <dd class="font-medium tabular-nums text-slate-900">{{ totalAnimals }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          Save {{ selectedCandidates.length || '' }} {{ selectedCandidates.length === 1 ? 'record' : 'records' }}
        </button>
        <div v-if="submitted && hasErrors" role="alert" class="space-y-1 text-[12px] text-red-600">
          <p v-if="errors.selection">{{ errors.selection }}</p>
          <p v-if="errors.counts">{{ errors.counts }}</p>
          <p v-if="errors.vaccine || errors.date || errors.nextDue || errors.by">Fix the highlighted drive details.</p>
        </div>
        <p v-else class="text-[12px] text-slate-500">Each selected animal gets its own record with the date and vaccine above.</p>
      </aside>
    </div>
  </div>
</template>