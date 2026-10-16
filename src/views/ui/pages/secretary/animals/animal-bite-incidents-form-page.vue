<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import ResidentPicker from '@/components/layout/secretary/resident-picker.vue'
import AnimalPicker from '@/components/layout/secretary/animal-picker.vue'
import { createSampleResidents, toRow as toResidentRow } from '@/data/residents'
import { addDays, formatDate, isoDate, speciesList, useAnimals, type AnimalRow } from '@/data/animals'
import {
  OBSERVATION_DAYS,
  biteActions,
  biteCategories,
  bodyParts,
  outcomes,
  personOf,
  useBites,
  type AnimalOutcome,
  type BiteCategory,
  type BiteInput,
  type Person,
  type Provocation,
} from '@/data/bites'

const route = useRoute()
const router = useRouter()
const { getById, report, update } = useBites()
const { rows: animalRows } = useAnimals()

const editId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const existing = computed(() => (editId.value ? getById(editId.value) : undefined))

// TODO: use the same residents source as the Resident records page (store or API).
const residents = createSampleResidents().map(toResidentRow)

const today = isoDate()

/* ---------------------------------- Fields --------------------------------- */
const incidentDate = ref(today)
const place = ref('')
const provocation = ref<Provocation>('Unknown')
const category = ref<BiteCategory | ''>('')
const bodyPart = ref('')

const victimType = ref<'Resident' | 'Non-resident'>('Resident')
const victim = ref<Person | null>(null)
const vName = ref('')
const vAge = ref<number | ''>('')
const vSex = ref('')
const vContact = ref('')
const vAddress = ref('')

const animalKind = ref<'Registered' | 'Unregistered'>('Registered')
const animal = ref<AnimalRow | null>(null)
const species = ref('')
const description = ref('')

const outcome = ref<AnimalOutcome>('Under observation')
const actions = ref<string[]>([])
const notes = ref('')
const submitted = ref(false)

// For a new report, pick a sensible starting outcome: a registered animal can be watched, an unknown one cannot.
watch(animalKind, (k) => {
  if (!existing.value) outcome.value = k === 'Registered' ? 'Under observation' : 'Cannot be traced'
})

// Prefill when editing.
watch(
  existing,
  (i) => {
    if (!i) return
    incidentDate.value = i.incidentDate
    place.value = i.place
    provocation.value = i.provocation
    category.value = i.category
    bodyPart.value = i.bodyPart
    victimType.value = i.victimType
    if (i.victimType === 'Resident') victim.value = i.victim
    vName.value = i.victim.name
    vAge.value = i.victim.age ?? ''
    vSex.value = i.victim.sex ?? ''
    vContact.value = i.victim.contact ?? ''
    vAddress.value = i.victim.address
    animalKind.value = i.animalKind
    animal.value = animalRows.value.find((r) => r.id === i.animalId) ?? null
    species.value = i.species
    description.value = i.animalDescription ?? ''
    outcome.value = i.outcome
    actions.value = [...i.actions]
    notes.value = i.notes ?? ''
  },
  { immediate: true },
)

const errors = computed(() => ({
  incidentDate: !incidentDate.value ? 'Enter the date of the incident.' : incidentDate.value > today ? 'The date cannot be in the future.' : '',
  place: place.value.trim() ? '' : 'Say where it happened.',
  category: category.value ? '' : 'Choose a category.',
  bodyPart: bodyPart.value ? '' : 'Choose the body part.',
  victim: victimType.value === 'Resident' ? (victim.value ? '' : 'Choose the victim from the resident list.') : vName.value.trim() ? '' : 'Enter the victim’s name.',
  vAge: vAge.value === '' || (Number.isInteger(vAge.value) && vAge.value >= 0 && vAge.value <= 120) ? '' : 'Enter a valid age.',
  animal: animalKind.value === 'Registered' ? (animal.value ? '' : 'Choose the animal from the registry.') : species.value ? '' : 'Choose the species.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function buildVictim(): Person {
  if (victimType.value === 'Resident' && victim.value) return victim.value
  return {
    name: vName.value.trim(),
    age: vAge.value === '' ? undefined : Number(vAge.value),
    sex: vSex.value || undefined,
    address: vAddress.value.trim() || 'Not given',
    contact: vContact.value.trim() || undefined,
  }
}

function save() {
  submitted.value = true
  if (hasErrors.value || !category.value) return

  const registered = animalKind.value === 'Registered' ? animal.value : null
  const input: BiteInput = {
    incidentDate: incidentDate.value,
    victimType: victimType.value,
    victim: buildVictim(),
    bodyPart: bodyPart.value,
    category: category.value,
    place: place.value.trim(),
    provocation: provocation.value,
    animalKind: animalKind.value,
    animalId: registered?.id,
    animalLabel: registered ? `${registered.title} (${registered.species})` : `Unregistered ${species.value.toLowerCase()}`,
    species: registered?.species ?? species.value,
    animalDescription: registered ? undefined : description.value.trim() || undefined,
    outcome: outcome.value,
    actions: actions.value,
    status: existing.value?.status ?? 'Open',
    notes: notes.value.trim() || undefined,
  }

  if (existing.value) update(existing.value.id, input)
  else report(input)
  router.push('/secretary/animals/bites')
}

const observeUntil = computed(() => (incidentDate.value ? formatDate(addDays(incidentDate.value, OBSERVATION_DAYS), 'long') : ''))

const provocations: Provocation[] = ['Unprovoked', 'Provoked', 'Unknown']

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
const segCls = (active: boolean) =>
  [
    'shrink-0 cursor-pointer rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-bis-600',
    active ? 'bg-white text-bis-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
  ]
</script>

<template>
  <div v-if="editId && !existing" class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
    <p class="text-[14px] font-medium text-bis-900">Incident not found</p>
    <p class="mt-0.5 text-[13px] text-slate-500">It may have been removed, or the link is wrong.</p>
    <RouterLink
      to="/secretary/animals/bites"
      class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      Back to bite incidents
    </RouterLink>
  </div>

  <div v-else class="space-y-6">
    <!-- Title -->
    <div>
      <RouterLink
        to="/secretary/animals/bites"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        Back to bite incidents
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
        {{ existing ? `Edit ${existing.id}` : 'Report bite incident' }}
      </h1>
      <p class="mt-0.5 text-[13px] text-slate-500">
        Refer the victim to the nearest animal bite treatment center or rural health unit. This record is for tracking, not treatment.
      </p>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <!-- Incident -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Incident</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="bite-date" :class="labelCls">Date of incident</label>
              <input id="bite-date" v-model="incidentDate" type="date" :max="today" :class="inputCls" :aria-invalid="submitted && !!errors.incidentDate" />
              <p v-if="submitted && errors.incidentDate" role="alert" :class="errCls">{{ errors.incidentDate }}</p>
            </div>

            <div>
              <label for="bite-body" :class="labelCls">Body part bitten</label>
              <select id="bite-body" v-model="bodyPart" :class="inputCls" :aria-invalid="submitted && !!errors.bodyPart">
                <option value="" disabled>Choose body part</option>
                <option v-for="b in bodyParts" :key="b" :value="b">{{ b }}</option>
              </select>
              <p v-if="submitted && errors.bodyPart" role="alert" :class="errCls">{{ errors.bodyPart }}</p>
            </div>

            <div class="sm:col-span-2">
              <label for="bite-place" :class="labelCls">Where did it happen?</label>
              <input id="bite-place" v-model="place" type="text" maxlength="120" placeholder="Road near the barangay hall, Purok 2" :class="inputCls" :aria-invalid="submitted && !!errors.place" />
              <p v-if="submitted && errors.place" role="alert" :class="errCls">{{ errors.place }}</p>
            </div>

            <fieldset class="sm:col-span-2">
              <legend :class="labelCls">Exposure category</legend>
              <div class="grid gap-2 sm:grid-cols-3">
                <label
                  v-for="c in biteCategories"
                  :key="c.key"
                  :class="[
                    'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-bis-600',
                    category === c.key ? 'border-bis-600 bg-bis-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  ]"
                >
                  <input v-model="category" type="radio" name="bite-category" :value="c.key" class="sr-only" />
                  <span :class="['text-[13px] font-medium', category === c.key ? 'text-bis-700' : 'text-slate-900']">{{ c.label }}</span>
                  <span class="text-[12px] leading-snug text-slate-500">{{ c.description }}</span>
                </label>
              </div>
              <p v-if="submitted && errors.category" role="alert" :class="errCls">{{ errors.category }}</p>
            </fieldset>

            <fieldset class="sm:col-span-2">
              <legend :class="labelCls">Was the animal provoked?</legend>
              <div class="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                <label v-for="p in provocations" :key="p" :class="segCls(provocation === p)">
                  <input v-model="provocation" type="radio" name="provocation" :value="p" class="sr-only" />
                  {{ p }}
                </label>
              </div>
            </fieldset>
          </div>
        </section>

        <!-- Victim -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Victim</h2>

          <fieldset class="mt-3">
            <legend class="sr-only">Victim type</legend>
            <div class="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <label :class="segCls(victimType === 'Resident')">
                <input v-model="victimType" type="radio" name="victim-type" value="Resident" class="sr-only" />
                Resident
              </label>
              <label :class="segCls(victimType === 'Non-resident')">
                <input v-model="victimType" type="radio" name="victim-type" value="Non-resident" class="sr-only" />
                Not a resident
              </label>
            </div>
          </fieldset>

          <div class="mt-4">
            <template v-if="victimType === 'Resident'">
              <div v-if="victim" class="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-bis-100 text-[13px] font-medium text-bis-700" aria-hidden="true">{{ victim.name[0] }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[14px] font-medium text-slate-900">{{ victim.name }}</p>
                  <p class="text-[12px] text-slate-500">
                    <span class="tabular-nums">{{ victim.residentId }}</span> · {{ victim.age }} yrs · {{ victim.sex }}
                  </p>
                  <p class="text-[12px] text-slate-500">{{ victim.address }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-bis-600 hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  @click="victim = null"
                >
                  Change
                </button>
              </div>
              <ResidentPicker v-else :residents="residents" input-id="victim-picker" :invalid="submitted && !!errors.victim" @pick="victim = personOf($event)" />
              <p v-if="submitted && errors.victim" role="alert" :class="errCls">{{ errors.victim }}</p>
            </template>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <label for="v-name" :class="labelCls">Full name</label>
                <input id="v-name" v-model="vName" type="text" maxlength="80" :class="inputCls" :aria-invalid="submitted && !!errors.victim" />
                <p v-if="submitted && errors.victim" role="alert" :class="errCls">{{ errors.victim }}</p>
              </div>
              <div>
                <label for="v-age" :class="labelCls">Age (optional)</label>
                <input id="v-age" v-model.number="vAge" type="number" min="0" max="120" step="1" :class="[inputCls, 'tabular-nums']" />
                <p v-if="submitted && errors.vAge" role="alert" :class="errCls">{{ errors.vAge }}</p>
              </div>
              <div>
                <label for="v-sex" :class="labelCls">Sex (optional)</label>
                <select id="v-sex" v-model="vSex" :class="inputCls">
                  <option value="">Not given</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label for="v-contact" :class="labelCls">Contact (optional)</label>
                <input id="v-contact" v-model="vContact" type="text" maxlength="30" :class="inputCls" />
              </div>
              <div>
                <label for="v-address" :class="labelCls">Address (optional)</label>
                <input id="v-address" v-model="vAddress" type="text" maxlength="120" :class="inputCls" />
              </div>
            </div>
          </div>
        </section>

        <!-- Animal -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Animal</h2>

          <fieldset class="mt-3">
            <legend class="sr-only">Animal type</legend>
            <div class="inline-flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <label :class="segCls(animalKind === 'Registered')">
                <input v-model="animalKind" type="radio" name="animal-kind" value="Registered" class="sr-only" />
                In the registry
              </label>
              <label :class="segCls(animalKind === 'Unregistered')">
                <input v-model="animalKind" type="radio" name="animal-kind" value="Unregistered" class="sr-only" />
                Not in the registry
              </label>
            </div>
          </fieldset>

          <div class="mt-4">
            <template v-if="animalKind === 'Registered'">
              <div v-if="animal" class="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-bis-100 text-[13px] font-medium text-bis-700" aria-hidden="true">{{ animal.species[0] }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[14px] font-medium text-slate-900">{{ animal.title }}</p>
                  <p class="text-[12px] text-slate-500">{{ animal.subtitle }} · <span class="tabular-nums">{{ animal.id }}</span></p>
                  <p class="text-[12px] text-slate-500">{{ animal.ownerLabel }}<template v-if="animal.ownerPlace"> · {{ animal.ownerPlace }}</template></p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-bis-600 hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  @click="animal = null"
                >
                  Change
                </button>
              </div>
              <AnimalPicker v-else :animals="animalRows" input-id="bite-animal" :invalid="submitted && !!errors.animal" @pick="animal = $event" />
              <p v-if="submitted && errors.animal" role="alert" :class="errCls">{{ errors.animal }}</p>
              <p v-else-if="!animal" class="mt-2 text-[12px] text-slate-500">Strays can be found here too. If the animal isn’t in the registry, choose “Not in the registry”.</p>
            </template>

            <div v-else class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="bite-species" :class="labelCls">Species</label>
                <select id="bite-species" v-model="species" :class="inputCls" :aria-invalid="submitted && !!errors.animal">
                  <option value="" disabled>Choose a species</option>
                  <option v-for="s in speciesList" :key="s.key" :value="s.key">{{ s.key }}</option>
                </select>
                <p v-if="submitted && errors.animal" role="alert" :class="errCls">{{ errors.animal }}</p>
              </div>
              <div class="sm:col-span-2">
                <label for="bite-desc" :class="labelCls">Description (optional)</label>
                <textarea
                  id="bite-desc"
                  v-model="description"
                  rows="2"
                  maxlength="200"
                  placeholder="Color, size, markings, collar, and where it went"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
                />
              </div>
            </div>
          </div>

          <div class="mt-4 border-t border-slate-100 pt-4">
            <label for="bite-outcome" :class="labelCls">Observation outcome</label>
            <select id="bite-outcome" v-model="outcome" :class="inputCls">
              <option v-for="o in outcomes" :key="o" :value="o">{{ o }}</option>
            </select>
            <p class="mt-1 text-[12px] text-slate-500">The observation period is {{ OBSERVATION_DAYS }} days from the incident. You can update the outcome later.</p>
          </div>
        </section>

        <!-- Actions + notes -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Action taken</h2>
          <fieldset class="mt-3 space-y-2">
            <legend class="sr-only">Actions taken</legend>
            <label v-for="a in biteActions" :key="a" class="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700">
              <input v-model="actions" type="checkbox" :value="a" class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
              {{ a }}
            </label>
          </fieldset>

          <div class="mt-4">
            <label for="bite-notes" :class="labelCls">Notes (optional)</label>
            <textarea
              id="bite-notes"
              v-model="notes"
              rows="3"
              maxlength="300"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
            />
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Victim</dt>
            <dd class="font-medium text-slate-900">{{ victimType === 'Resident' ? (victim?.name ?? 'Not chosen yet') : (vName || 'Not entered yet') }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Animal</dt>
            <dd class="font-medium text-slate-900">
              {{ animalKind === 'Registered' ? (animal ? `${animal.title} (${animal.species})` : 'Not chosen yet') : (species ? `Unregistered ${species.toLowerCase()}` : 'Not chosen yet') }}
            </dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Category</dt>
            <dd class="font-medium text-slate-900">{{ category ? `Category ${category}` : 'Not chosen yet' }}</dd>
          </div>
          <div v-if="outcome === 'Under observation' && observeUntil" class="border-t border-slate-100 pt-3">
            <dt class="text-[12px] text-slate-500">Observe animal until</dt>
            <dd class="font-medium text-slate-900">{{ observeUntil }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          {{ existing ? 'Save changes' : 'Save report' }}
        </button>
        <p v-if="submitted && hasErrors" role="alert" class="text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
      </aside>
    </div>
  </div>
</template>