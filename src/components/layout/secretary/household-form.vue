<script lang="ts">
export interface HouseholdFormMember {
  key: string // local only, used for v-for
  id?: string // existing member id when editing
  lastName: string
  firstName: string
  middleName: string
  relationship: string
  sex: '' | 'Male' | 'Female'
  age: number | ''
  occupation: string
  isPwd: boolean
  isVoter: boolean
}

export interface HouseholdFormData {
  householdNo: string
  purok: string
  address: string
  contact: string
  dateRegistered: string
  tenure: string
  dwellingType: string
  waterSource: string
  toiletFacility: string
  hasElectricity: boolean
  is4Ps: boolean
  isIndigent: boolean
  status: string
  members: HouseholdFormMember[]
}

// What the form emits: the form data plus the head of household pulled out of the members list.
export interface HouseholdPayload extends HouseholdFormData {
  headFirstName: string
  headLastName: string
  headMiddleName: string
}

let memberSeq = 0
export function newMember(overrides: Partial<HouseholdFormMember> = {}): HouseholdFormMember {
  return {
    key: `m${++memberSeq}`,
    lastName: '',
    firstName: '',
    middleName: '',
    relationship: '',
    sex: '',
    age: '',
    occupation: '',
    isPwd: false,
    isVoter: false,
    ...overrides,
  }
}

export function emptyHousehold(): HouseholdFormData {
  return {
    householdNo: '',
    purok: '',
    address: '',
    contact: '',
    dateRegistered: new Date().toISOString().slice(0, 10),
    tenure: '',
    dwellingType: '',
    waterSource: '',
    toiletFacility: '',
    hasElectricity: true,
    is4Ps: false,
    isIndigent: false,
    status: 'Active',
    members: [newMember({ relationship: 'Head' })],
  }
}
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: Partial<HouseholdFormData>
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: HouseholdPayload): void
  (e: 'cancel'): void
}>()

const base = emptyHousehold()
const form = reactive<HouseholdFormData>({
  ...base,
  ...props.initial,
  members: (props.initial?.members ?? base.members).map((m) => ({ ...m })),
})
const touched = reactive<Record<string, boolean>>({})
const submitted = ref(false)

const today = new Date().toISOString().slice(0, 10)

const RELATIONSHIPS = ['Head', 'Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Grandchild', 'Grandparent', 'Relative', 'Other']

/* ------------------------------- Members ------------------------------- */
const head = computed(() => form.members.find((m) => m.relationship === 'Head') ?? null)

function addMember() {
  form.members.push(newMember({ lastName: head.value?.lastName ?? '' }))
}

function removeMember(key: string) {
  if (form.members.length === 1) return
  const i = form.members.findIndex((m) => m.key === key)
  if (i !== -1) form.members.splice(i, 1)
}

// Only one head per household: choosing "Head" on a member demotes any previous head.
function onRelationshipChange(changed: HouseholdFormMember) {
  touched[`${changed.key}.relationship`] = true
  if (changed.relationship !== 'Head') return
  for (const m of form.members) if (m !== changed && m.relationship === 'Head') m.relationship = 'Relative'
}

const summary = computed(() => {
  const ages = form.members.map((m) => m.age).filter((a): a is number => typeof a === 'number')
  return {
    total: form.members.length,
    seniors: ages.filter((a) => a >= 60).length,
    pwd: form.members.filter((m) => m.isPwd).length,
  }
})

/* ------------------------------- Validation ------------------------------- */
type TopField = 'householdNo' | 'purok' | 'address' | 'contact' | 'dateRegistered' | 'tenure'
type MemberField = 'lastName' | 'firstName' | 'relationship' | 'sex' | 'age'

const errors = computed(() => {
  const top: Partial<Record<TopField, string>> = {}
  if (!form.householdNo.trim()) top.householdNo = 'Household number is required.'
  if (!form.purok) top.purok = 'Select a purok.'
  if (!form.address.trim()) top.address = 'Address is required.'
  if (!form.tenure) top.tenure = 'Select a tenure status.'
  if (!form.dateRegistered) top.dateRegistered = 'Date registered is required.'
  else if (form.dateRegistered > today) top.dateRegistered = 'Date cannot be in the future.'
  if (form.contact.trim() && !/^(09\d{9}|\+639\d{9})$/.test(form.contact.replace(/[\s-]/g, '')))
    top.contact = 'Use a valid mobile number, e.g. 09171234567.'

  const members: Record<string, Partial<Record<MemberField, string>>> = {}
  for (const m of form.members) {
    const e: Partial<Record<MemberField, string>> = {}
    if (!m.lastName.trim()) e.lastName = 'Required.'
    if (!m.firstName.trim()) e.firstName = 'Required.'
    if (!m.relationship) e.relationship = 'Select one.'
    if (!m.sex) e.sex = 'Select one.'
    if (m.age === '' || m.age === null) e.age = 'Required.'
    else if (!Number.isInteger(m.age) || m.age < 0 || m.age > 120) e.age = '0–120.'
    if (Object.keys(e).length) members[m.key] = e
  }

  const headCount = form.members.filter((m) => m.relationship === 'Head').length
  const headError = headCount === 1 ? '' : 'Mark exactly one member as the head of household.'

  return { top, members, headError, valid: !Object.keys(top).length && !Object.keys(members).length && !headError }
})

function showTop(f: TopField) {
  return (touched[f] || submitted.value) && errors.value.top[f] ? errors.value.top[f] : ''
}
function showMember(m: HouseholdFormMember, f: MemberField) {
  return (touched[`${m.key}.${f}`] || submitted.value) && errors.value.members[m.key]?.[f] ? errors.value.members[m.key][f] : ''
}

function inputClass(invalid: boolean) {
  return [
    'h-10 w-full rounded-lg border bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2',
    invalid
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 hover:border-slate-400 focus:border-bis-600 focus:ring-bis-600/20',
  ]
}

function onSubmit() {
  submitted.value = true
  if (!errors.value.valid) {
    document.querySelector<HTMLElement>('[data-invalid="true"]')?.focus()
    return
  }
  const h = head.value!
  emit('submit', {
    ...form,
    householdNo: form.householdNo.trim(),
    address: form.address.trim(),
    contact: form.contact.replace(/[\s-]/g, ''),
    members: form.members.map((m) => ({
      ...m,
      lastName: m.lastName.trim(),
      firstName: m.firstName.trim(),
      middleName: m.middleName.trim(),
      occupation: m.occupation.trim(),
    })),
    headFirstName: h.firstName.trim(),
    headLastName: h.lastName.trim(),
    headMiddleName: h.middleName.trim(),
  })
}

const sectionClass = 'rounded-xl border border-slate-200 bg-white'
const labelClass = 'mb-1.5 block text-[13px] font-medium text-slate-700'
const errorClass = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="onSubmit">
    <!-- Household information -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Household information</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">Identification and location of the household.</p>
      </header>

      <div class="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="householdNo" :class="labelClass">Household no. <span class="text-red-500">*</span></label>
          <input id="householdNo" v-model="form.householdNo" type="text" autocomplete="off" placeholder="e.g. P1-001"
            :class="inputClass(!!showTop('householdNo'))" :data-invalid="!!showTop('householdNo')" @blur="touched.householdNo = true" />
          <p v-if="showTop('householdNo')" :class="errorClass">{{ showTop('householdNo') }}</p>
        </div>
        <div>
          <label for="purok" :class="labelClass">Purok <span class="text-red-500">*</span></label>
          <select id="purok" v-model="form.purok" :class="inputClass(!!showTop('purok'))" :data-invalid="!!showTop('purok')" @blur="touched.purok = true">
            <option value="" disabled>Select purok</option>
            <option v-for="n in 7" :key="n" :value="String(n)">Purok {{ n }}</option>
          </select>
          <p v-if="showTop('purok')" :class="errorClass">{{ showTop('purok') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label for="address" :class="labelClass">Street / address <span class="text-red-500">*</span></label>
          <input id="address" v-model="form.address" type="text" autocomplete="off" placeholder="House no., street, sitio"
            :class="inputClass(!!showTop('address'))" :data-invalid="!!showTop('address')" @blur="touched.address = true" />
          <p v-if="showTop('address')" :class="errorClass">{{ showTop('address') }}</p>
        </div>

        <div class="lg:col-span-2">
          <label for="contact" :class="labelClass">Contact number</label>
          <input id="contact" v-model="form.contact" type="tel" inputmode="tel" placeholder="09XX XXX XXXX"
            :class="inputClass(!!showTop('contact'))" :data-invalid="!!showTop('contact')" @blur="touched.contact = true" />
          <p v-if="showTop('contact')" :class="errorClass">{{ showTop('contact') }}</p>
        </div>
        <div>
          <label for="tenure" :class="labelClass">Tenure status <span class="text-red-500">*</span></label>
          <select id="tenure" v-model="form.tenure" :class="inputClass(!!showTop('tenure'))" :data-invalid="!!showTop('tenure')" @blur="touched.tenure = true">
            <option value="" disabled>Select</option>
            <option v-for="t in ['Owned', 'Rented', 'Informal settler', 'Living with relatives']" :key="t" :value="t">{{ t }}</option>
          </select>
          <p v-if="showTop('tenure')" :class="errorClass">{{ showTop('tenure') }}</p>
        </div>
        <div>
          <label for="dateRegistered" :class="labelClass">Date registered <span class="text-red-500">*</span></label>
          <input id="dateRegistered" v-model="form.dateRegistered" type="date" :max="today"
            :class="inputClass(!!showTop('dateRegistered'))" :data-invalid="!!showTop('dateRegistered')" @blur="touched.dateRegistered = true" />
          <p v-if="showTop('dateRegistered')" :class="errorClass">{{ showTop('dateRegistered') }}</p>
        </div>
      </div>
    </section>

    <!-- Members -->
    <section :class="sectionClass">
      <header class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 class="text-[15px] font-medium text-bis-900">Household members</h2>
          <p class="mt-0.5 text-[13px] text-slate-500">List everyone living in the household and mark one member as the head.</p>
        </div>
        <p class="text-[12px] tabular-nums text-slate-500">
          {{ summary.total }} {{ summary.total === 1 ? 'member' : 'members' }} · {{ summary.seniors }} senior · {{ summary.pwd }} PWD
        </p>
      </header>

      <div class="space-y-4 p-5">
        <p v-if="(submitted || form.members.length > 1) && errors.headError" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          {{ errors.headError }}
        </p>

        <div v-for="(m, idx) in form.members" :key="m.key" class="rounded-lg border border-slate-200 p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-medium text-slate-900">Member {{ idx + 1 }}</span>
              <span v-if="m.relationship === 'Head'" class="rounded-md bg-bis-50 px-1.5 py-0.5 text-[11px] font-medium text-bis-700">Head of household</span>
              <span v-if="typeof m.age === 'number' && m.age >= 60" class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Senior</span>
            </div>
            <button
              type="button"
              class="inline-flex h-8 items-center rounded-lg px-2.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
              :disabled="form.members.length === 1"
              :aria-label="`Remove member ${idx + 1}`"
              @click="removeMember(m.key)"
            >
              Remove
            </button>
          </div>

          <div class="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-6">
            <div class="lg:col-span-2">
              <label :for="`${m.key}-last`" :class="labelClass">Last name <span class="text-red-500">*</span></label>
              <input :id="`${m.key}-last`" v-model="m.lastName" type="text" autocomplete="off"
                :class="inputClass(!!showMember(m, 'lastName'))" :data-invalid="!!showMember(m, 'lastName')" @blur="touched[`${m.key}.lastName`] = true" />
              <p v-if="showMember(m, 'lastName')" :class="errorClass">{{ showMember(m, 'lastName') }}</p>
            </div>
            <div class="lg:col-span-2">
              <label :for="`${m.key}-first`" :class="labelClass">First name <span class="text-red-500">*</span></label>
              <input :id="`${m.key}-first`" v-model="m.firstName" type="text" autocomplete="off"
                :class="inputClass(!!showMember(m, 'firstName'))" :data-invalid="!!showMember(m, 'firstName')" @blur="touched[`${m.key}.firstName`] = true" />
              <p v-if="showMember(m, 'firstName')" :class="errorClass">{{ showMember(m, 'firstName') }}</p>
            </div>
            <div class="lg:col-span-2">
              <label :for="`${m.key}-middle`" :class="labelClass">Middle name</label>
              <input :id="`${m.key}-middle`" v-model="m.middleName" type="text" autocomplete="off" :class="inputClass(false)" />
            </div>

            <div class="lg:col-span-2">
              <label :for="`${m.key}-rel`" :class="labelClass">Relationship to head <span class="text-red-500">*</span></label>
              <select :id="`${m.key}-rel`" v-model="m.relationship" :class="inputClass(!!showMember(m, 'relationship'))"
                :data-invalid="!!showMember(m, 'relationship')" @change="onRelationshipChange(m)" @blur="touched[`${m.key}.relationship`] = true">
                <option value="" disabled>Select</option>
                <option v-for="r in RELATIONSHIPS" :key="r" :value="r">{{ r }}</option>
              </select>
              <p v-if="showMember(m, 'relationship')" :class="errorClass">{{ showMember(m, 'relationship') }}</p>
            </div>
            <div>
              <label :for="`${m.key}-sex`" :class="labelClass">Sex <span class="text-red-500">*</span></label>
              <select :id="`${m.key}-sex`" v-model="m.sex" :class="inputClass(!!showMember(m, 'sex'))"
                :data-invalid="!!showMember(m, 'sex')" @blur="touched[`${m.key}.sex`] = true">
                <option value="" disabled>Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              <p v-if="showMember(m, 'sex')" :class="errorClass">{{ showMember(m, 'sex') }}</p>
            </div>
            <div>
              <label :for="`${m.key}-age`" :class="labelClass">Age <span class="text-red-500">*</span></label>
              <input :id="`${m.key}-age`" v-model.number="m.age" type="number" min="0" max="120" inputmode="numeric"
                :class="inputClass(!!showMember(m, 'age'))" :data-invalid="!!showMember(m, 'age')" @blur="touched[`${m.key}.age`] = true" />
              <p v-if="showMember(m, 'age')" :class="errorClass">{{ showMember(m, 'age') }}</p>
            </div>
            <div class="sm:col-span-2 lg:col-span-2">
              <label :for="`${m.key}-job`" :class="labelClass">Occupation</label>
              <input :id="`${m.key}-job`" v-model="m.occupation" type="text" autocomplete="off" placeholder="e.g. Farmer, Student" :class="inputClass(false)" />
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            <label class="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input v-model="m.isVoter" type="checkbox" class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
              Registered voter
            </label>
            <label class="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
              <input v-model="m.isPwd" type="checkbox" class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
              Person with disability (PWD)
            </label>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 text-[13px] font-medium text-slate-600 transition-colors hover:border-bis-600 hover:bg-bis-50 hover:text-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="addMember"
        >
          <BisIcon name="plus" :size="16" :stroke-width="2.25" />
          Add member
        </button>
      </div>
    </section>

    <!-- Housing -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Housing and utilities</h2>
      </header>

      <div class="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="dwellingType" :class="labelClass">Dwelling type</label>
          <select id="dwellingType" v-model="form.dwellingType" :class="inputClass(false)">
            <option value="">Not specified</option>
            <option v-for="d in ['Concrete', 'Semi-concrete', 'Light materials']" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label for="waterSource" :class="labelClass">Water source</label>
          <select id="waterSource" v-model="form.waterSource" :class="inputClass(false)">
            <option value="">Not specified</option>
            <option v-for="w in ['Piped (Level III)', 'Deep well', 'Shared faucet']" :key="w" :value="w">{{ w }}</option>
          </select>
        </div>
        <div>
          <label for="toiletFacility" :class="labelClass">Toilet facility</label>
          <select id="toiletFacility" v-model="form.toiletFacility" :class="inputClass(false)">
            <option value="">Not specified</option>
            <option v-for="t in ['Water-sealed', 'Shared', 'None']" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <span :class="labelClass">Electricity</span>
          <label class="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-700 hover:border-slate-400">
            <input v-model="form.hasElectricity" type="checkbox" class="size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
            Connected
          </label>
        </div>
      </div>
    </section>

    <!-- Classification -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Classification</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">
          “With senior” and “With PWD” are set automatically from the members listed above.
        </p>
      </header>

      <div class="grid gap-3 p-5 sm:grid-cols-2">
        <label
          :class="[
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
            form.is4Ps ? 'border-bis-600 bg-bis-50/60' : 'border-slate-200 hover:bg-slate-50',
          ]"
        >
          <input v-model="form.is4Ps" type="checkbox" class="mt-0.5 size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
          <span>
            <span class="block text-[13px] font-medium text-slate-900">4Ps beneficiary</span>
            <span class="block text-[12px] text-slate-500">Pantawid Pamilyang Pilipino Program</span>
          </span>
        </label>
        <label
          :class="[
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
            form.isIndigent ? 'border-bis-600 bg-bis-50/60' : 'border-slate-200 hover:bg-slate-50',
          ]"
        >
          <input v-model="form.isIndigent" type="checkbox" class="mt-0.5 size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
          <span>
            <span class="block text-[13px] font-medium text-slate-900">Indigent household</span>
            <span class="block text-[12px] text-slate-500">Certified as indigent by the barangay</span>
          </span>
        </label>
      </div>
    </section>

    <!-- Status (edit only) -->
    <section v-if="mode === 'edit'" :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Household status</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">Transferred and dissolved households are kept on record but hidden from the active list.</p>
      </header>
      <div class="p-5 sm:max-w-xs">
        <label for="status" :class="labelClass">Status</label>
        <select id="status" v-model="form.status" :class="inputClass(false)">
          <option v-for="s in ['Active', 'Transferred', 'Dissolved']" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </section>

    <!-- Actions -->
    <div class="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
      <p class="text-[12px] text-slate-500"><span class="text-red-500">*</span> Required fields</p>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="submitting"
          class="inline-flex h-9 items-center gap-2 rounded-lg bg-bis-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        >
          <BisIcon v-if="mode === 'create' && !submitting" name="plus" :size="16" :stroke-width="2.25" />
          {{ submitting ? 'Saving…' : mode === 'create' ? 'Save household' : 'Save changes' }}
        </button>
      </div>
    </div>
  </form>
</template>