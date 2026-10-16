<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import ResidentPicker from '@/components/layout/secretary/resident-picker.vue'
import { createSampleResidents, toRow } from '@/data/residents'
import {
  isoDate,
  ownerOf,
  speciesByKey,
  speciesList,
  useAnimals,
  type AnimalInput,
  type AnimalSex,
  type AnimalStatus,
  type OwnerSnapshot,
  type OwnerType,
} from '@/data/animals'

const route = useRoute()
const router = useRouter()
const { getById, register, update } = useAnimals()

const editId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const existing = computed(() => (editId.value ? getById(editId.value) : undefined))

// TODO: use the same residents source as the Resident records page (store or API).
const residents = createSampleResidents().map(toRow)

/* ---------------------------------- Fields --------------------------------- */
const species = ref('')
const name = ref('')
const breed = ref('')
const color = ref('')
const sex = ref<AnimalSex | ''>('')
const count = ref(1)
const birthdate = ref('')
const tagNo = ref('')

const ownerType = ref<OwnerType>('Resident')
const owner = ref<OwnerSnapshot | null>(null)
const ownerName = ref('')
const ownerContact = ref('')
const location = ref('')

const status = ref<AnimalStatus>('Active')
const notes = ref('')
const submitted = ref(false)

const today = isoDate()
const category = computed(() => speciesByKey[species.value]?.category ?? null)
const isLivestock = computed(() => category.value === 'Livestock')
const isGroup = computed(() => isLivestock.value && count.value > 1)

// "Mixed" only makes sense for a group.
const sexOptions = computed<AnimalSex[]>(() => (isGroup.value ? ['Male', 'Female', 'Mixed'] : ['Male', 'Female']))
watch(sexOptions, (opts) => {
  if (sex.value && !opts.includes(sex.value)) sex.value = ''
})

// Pets are always one record per animal.
watch(category, (c) => {
  if (c === 'Pet') count.value = 1
})

// Prefill when editing.
watch(
  existing,
  (a) => {
    if (!a) return
    species.value = a.species
    name.value = a.name ?? ''
    breed.value = a.breed ?? ''
    color.value = a.color ?? ''
    sex.value = a.sex
    count.value = a.count
    birthdate.value = a.birthdate ?? ''
    tagNo.value = a.tagNo ?? ''
    ownerType.value = a.ownerType
    owner.value = a.owner ?? null
    ownerName.value = a.ownerName ?? ''
    ownerContact.value = a.ownerContact ?? ''
    location.value = a.location ?? ''
    status.value = a.status
    notes.value = a.notes ?? ''
  },
  { immediate: true },
)

const errors = computed(() => ({
  species: species.value ? '' : 'Choose a species.',
  count: !isLivestock.value || (Number.isInteger(count.value) && count.value >= 1) ? '' : 'Enter a whole number, 1 or more.',
  sex: sex.value ? '' : 'Choose the sex.',
  birthdate: birthdate.value && birthdate.value > today ? 'Birthdate cannot be in the future.' : '',
  owner: ownerType.value !== 'Resident' || owner.value ? '' : 'Choose the owner from the resident list.',
  ownerName: ownerType.value !== 'Non-resident' || ownerName.value.trim() ? '' : 'Enter the owner’s name.',
  location: ownerType.value !== 'Stray' || location.value.trim() ? '' : 'Say where this animal is usually found.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function save(thenPrint: boolean) {
  submitted.value = true
  const cat = category.value
  if (hasErrors.value || !cat || !sex.value) return

  const input: AnimalInput = {
    category: cat,
    species: species.value,
    name: name.value.trim() || undefined,
    breed: breed.value.trim() || undefined,
    color: color.value.trim() || undefined,
    sex: sex.value,
    count: isLivestock.value ? Number(count.value) : 1,
    birthdate: birthdate.value || undefined,
    tagNo: tagNo.value.trim() || undefined,
    ownerType: ownerType.value,
    owner: ownerType.value === 'Resident' ? (owner.value ?? undefined) : undefined,
    ownerName: ownerType.value === 'Non-resident' ? ownerName.value.trim() : undefined,
    ownerContact: ownerType.value === 'Non-resident' ? ownerContact.value.trim() || undefined : undefined,
    location: ownerType.value === 'Resident' ? undefined : location.value.trim() || undefined,
    status: status.value,
    notes: notes.value.trim() || undefined,
  }

  const saved = existing.value ? update(existing.value.id, input) : register(input)
  if (!saved) return
  router.push(thenPrint ? `/secretary/animals/registry/print/${saved.id}` : '/secretary/animals/registry')
}

const ownerTypes: { value: OwnerType; label: string }[] = [
  { value: 'Resident', label: 'Resident' },
  { value: 'Non-resident', label: 'Not a resident' },
  { value: 'Stray', label: 'Stray / no owner' },
]

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <div v-if="editId && !existing" class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
    <p class="text-[14px] font-medium text-bis-900">Animal record not found</p>
    <p class="mt-0.5 text-[13px] text-slate-500">It may have been removed, or the link is wrong.</p>
    <RouterLink
      to="/secretary/animals/registry"
      class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      Back to registry
    </RouterLink>
  </div>

  <div v-else class="space-y-6">
    <!-- Title -->
    <div>
      <RouterLink
        to="/secretary/animals/registry"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        Back to registry
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
        {{ existing ? `Edit ${existing.id}` : 'Register animal' }}
      </h1>
      <p class="mt-0.5 text-[13px] text-slate-500">Register a single pet, a group of livestock, or a stray.</p>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <!-- Animal -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Animal</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="species" :class="labelCls">Species</label>
              <select id="species" v-model="species" :class="inputCls" :aria-invalid="submitted && !!errors.species">
                <option value="" disabled>Choose a species</option>
                <optgroup label="Pets">
                  <option v-for="s in speciesList.filter((x) => x.category === 'Pet')" :key="s.key" :value="s.key">{{ s.key }}</option>
                </optgroup>
                <optgroup label="Livestock">
                  <option v-for="s in speciesList.filter((x) => x.category === 'Livestock')" :key="s.key" :value="s.key">{{ s.key }}</option>
                </optgroup>
              </select>
              <p v-if="submitted && errors.species" role="alert" :class="errCls">{{ errors.species }}</p>
            </div>

            <div v-if="isLivestock">
              <label for="count" :class="labelCls">Number of animals</label>
              <input id="count" v-model.number="count" type="number" min="1" step="1" :class="[inputCls, 'tabular-nums']" />
              <p class="mt-1 text-[12px] text-slate-500">More than 1 makes this a group record.</p>
              <p v-if="submitted && errors.count" role="alert" :class="errCls">{{ errors.count }}</p>
            </div>

            <div>
              <label for="name" :class="labelCls">{{ isGroup ? 'Group label (optional)' : 'Name (optional)' }}</label>
              <input id="name" v-model="name" type="text" maxlength="60" :placeholder="isGroup ? 'Backyard hogs' : 'Brownie'" :class="inputCls" />
            </div>

            <div>
              <label for="sex" :class="labelCls">Sex</label>
              <select id="sex" v-model="sex" :class="inputCls" :aria-invalid="submitted && !!errors.sex">
                <option value="" disabled>Choose sex</option>
                <option v-for="s in sexOptions" :key="s" :value="s">{{ s }}</option>
              </select>
              <p v-if="submitted && errors.sex" role="alert" :class="errCls">{{ errors.sex }}</p>
            </div>

            <div>
              <label for="breed" :class="labelCls">Breed (optional)</label>
              <input id="breed" v-model="breed" type="text" maxlength="60" :class="inputCls" />
            </div>

            <div>
              <label for="color" :class="labelCls">Color (optional)</label>
              <input id="color" v-model="color" type="text" maxlength="60" :class="inputCls" />
            </div>

            <div>
              <label for="birthdate" :class="labelCls">Birthdate (an estimate is fine)</label>
              <input id="birthdate" v-model="birthdate" type="date" :max="today" :class="inputCls" />
              <p v-if="submitted && errors.birthdate" role="alert" :class="errCls">{{ errors.birthdate }}</p>
            </div>

            <div>
              <label for="tag" :class="labelCls">Tag no. (optional)</label>
              <input id="tag" v-model="tagNo" type="text" maxlength="30" :disabled="isGroup" :placeholder="isGroup ? 'Not used for groups' : ''" :class="[inputCls, 'disabled:bg-slate-50 disabled:text-slate-400']" />
            </div>
          </div>
        </section>

        <!-- Owner -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Owner</h2>

          <fieldset class="mt-3">
            <legend class="sr-only">Owner type</legend>
            <div class="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
              <label
                v-for="o in ownerTypes"
                :key="o.value"
                :class="[
                  'shrink-0 cursor-pointer rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-bis-600',
                  ownerType === o.value ? 'bg-white text-bis-700 shadow-sm' : 'text-slate-600 hover:text-slate-900',
                ]"
              >
                <input v-model="ownerType" type="radio" name="owner-type" :value="o.value" class="sr-only" />
                {{ o.label }}
              </label>
            </div>
          </fieldset>

          <div class="mt-4">
            <!-- Resident -->
            <template v-if="ownerType === 'Resident'">
              <div v-if="owner" class="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-bis-100 text-[13px] font-medium text-bis-700" aria-hidden="true">
                  {{ owner.name.split(' ').map((p) => p[0]).slice(0, 2).join('') }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-[14px] font-medium text-slate-900">{{ owner.name }}</p>
                  <p class="text-[12px] text-slate-500"><span class="tabular-nums">{{ owner.residentId }}</span> · {{ owner.contact }}</p>
                  <p class="text-[12px] text-slate-500">{{ owner.address }}</p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-bis-600 hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
                  @click="owner = null"
                >
                  Change
                </button>
              </div>
              <ResidentPicker v-else :residents="residents" input-id="owner-picker" :invalid="submitted && !!errors.owner" @pick="owner = ownerOf($event)" />
              <p v-if="submitted && errors.owner" role="alert" :class="errCls">{{ errors.owner }}</p>
            </template>

            <!-- Non-resident -->
            <div v-else-if="ownerType === 'Non-resident'" class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="owner-name" :class="labelCls">Owner’s name</label>
                <input id="owner-name" v-model="ownerName" type="text" maxlength="80" :class="inputCls" />
                <p v-if="submitted && errors.ownerName" role="alert" :class="errCls">{{ errors.ownerName }}</p>
              </div>
              <div>
                <label for="owner-contact" :class="labelCls">Contact (optional)</label>
                <input id="owner-contact" v-model="ownerContact" type="text" maxlength="30" :class="inputCls" />
              </div>
              <div class="sm:col-span-2">
                <label for="owner-address" :class="labelCls">Address (optional)</label>
                <input id="owner-address" v-model="location" type="text" maxlength="120" :class="inputCls" />
              </div>
            </div>

            <!-- Stray -->
            <div v-else>
              <label for="stray-location" :class="labelCls">Where is it usually found?</label>
              <input id="stray-location" v-model="location" type="text" maxlength="120" placeholder="Near the barangay hall, Purok 2" :class="inputCls" :aria-invalid="submitted && !!errors.location" />
              <p v-if="submitted && errors.location" role="alert" :class="errCls">{{ errors.location }}</p>
              <p v-else class="mt-1 text-[12px] text-slate-500">Strays can be linked to bite incidents even though they have no owner.</p>
            </div>
          </div>
        </section>

        <!-- Status + notes -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Other details</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div v-if="existing">
              <label for="status" :class="labelCls">Status</label>
              <select id="status" v-model="status" :class="inputCls">
                <option v-for="s in ['Active', 'Transferred', 'Missing', 'Deceased']" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label for="notes" :class="labelCls">Notes (optional)</label>
              <textarea
                id="notes"
                v-model="notes"
                rows="3"
                maxlength="300"
                class="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
              />
            </div>
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Animal</dt>
            <dd class="font-medium text-slate-900">
              {{ species ? `${isGroup ? `${count} × ` : ''}${species}` : 'Not chosen yet' }}
              <span v-if="category" class="font-normal text-slate-500">({{ category.toLowerCase() }})</span>
            </dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Record type</dt>
            <dd class="font-medium text-slate-900">{{ isGroup ? 'Group record' : 'Individual record' }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Owner</dt>
            <dd class="font-medium text-slate-900">
              {{ ownerType === 'Resident' ? (owner?.name ?? 'Not chosen yet') : ownerType === 'Non-resident' ? (ownerName || 'Not entered yet') : 'Stray (no owner)' }}
            </dd>
          </div>
        </dl>

        <div class="space-y-2">
          <button
            type="button"
            class="inline-flex h-9 w-full items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="save(false)"
          >
            {{ existing ? 'Save changes' : 'Register animal' }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="save(true)"
          >
            {{ existing ? 'Save and print' : 'Register and print' }}
          </button>
        </div>
        <p v-if="submitted && hasErrors" role="alert" class="text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
      </aside>
    </div>
  </div>
</template>