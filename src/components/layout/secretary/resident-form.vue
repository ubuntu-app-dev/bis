<script lang="ts">
export interface ResidentFormData {
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  sex: '' | 'Male' | 'Female'
  birthdate: string
  civilStatus: string
  purok: string
  householdNo: string
  address: string
  occupation: string
  contact: string
  isVoter: boolean
  isPwd: boolean
  is4Ps: boolean
  isSoloParent: boolean
  status: string
}

export function emptyResident(): ResidentFormData {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    sex: '',
    birthdate: '',
    civilStatus: '',
    purok: '',
    householdNo: '',
    address: '',
    occupation: '',
    contact: '',
    isVoter: false,
    isPwd: false,
    is4Ps: false,
    isSoloParent: false,
    status: 'Active',
  }
}
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: Partial<ResidentFormData>
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: ResidentFormData): void
  (e: 'cancel'): void
}>()

const form = reactive<ResidentFormData>({ ...emptyResident(), ...props.initial })
const touched = reactive<Record<string, boolean>>({})
const submitted = ref(false)

const today = new Date().toISOString().slice(0, 10)

const age = computed(() => {
  if (!form.birthdate) return null
  const b = new Date(form.birthdate)
  if (Number.isNaN(b.getTime()) || form.birthdate > today) return null
  const now = new Date()
  let a = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--
  return a
})
const isSenior = computed(() => age.value !== null && age.value >= 60)

/* ------------------------------- Validation ------------------------------- */
const errors = computed<Partial<Record<keyof ResidentFormData, string>>>(() => {
  const e: Partial<Record<keyof ResidentFormData, string>> = {}
  if (!form.lastName.trim()) e.lastName = 'Last name is required.'
  if (!form.firstName.trim()) e.firstName = 'First name is required.'
  if (!form.sex) e.sex = 'Select a sex.'
  if (!form.birthdate) e.birthdate = 'Birthdate is required.'
  else if (form.birthdate > today) e.birthdate = 'Birthdate cannot be in the future.'
  if (!form.civilStatus) e.civilStatus = 'Select a civil status.'
  if (!form.purok) e.purok = 'Select a purok.'
  if (!form.householdNo.trim()) e.householdNo = 'Household number is required.'
  if (!form.address.trim()) e.address = 'Address is required.'
  if (form.contact.trim() && !/^(09\d{9}|\+639\d{9})$/.test(form.contact.replace(/[\s-]/g, '')))
    e.contact = 'Use a valid mobile number, e.g. 09171234567.'
  return e
})

function show(field: keyof ResidentFormData) {
  return (touched[field] || submitted.value) && errors.value[field] ? errors.value[field] : ''
}

function inputClass(field: keyof ResidentFormData) {
  return [
    'h-10 w-full rounded-lg border bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2',
    show(field)
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
      : 'border-slate-300 hover:border-slate-400 focus:border-bis-600 focus:ring-bis-600/20',
  ]
}

function onSubmit() {
  submitted.value = true
  if (Object.keys(errors.value).length) {
    const first = document.querySelector<HTMLElement>('[data-invalid="true"]')
    first?.focus()
    return
  }
  emit('submit', {
    ...form,
    lastName: form.lastName.trim(),
    firstName: form.firstName.trim(),
    middleName: form.middleName.trim(),
    householdNo: form.householdNo.trim(),
    address: form.address.trim(),
    occupation: form.occupation.trim(),
    contact: form.contact.replace(/[\s-]/g, ''),
  })
}

const classifications: { key: 'isVoter' | 'isPwd' | 'is4Ps' | 'isSoloParent'; label: string; hint: string }[] = [
  { key: 'isVoter', label: 'Registered voter', hint: 'Listed in the barangay voters’ list' },
  { key: 'isPwd', label: 'Person with disability (PWD)', hint: 'Holds a valid PWD ID' },
  { key: 'is4Ps', label: '4Ps beneficiary', hint: 'Pantawid Pamilyang Pilipino Program' },
  { key: 'isSoloParent', label: 'Solo parent', hint: 'Holds a Solo Parent ID' },
]

const sectionClass = 'rounded-xl border border-slate-200 bg-white'
const labelClass = 'mb-1.5 block text-[13px] font-medium text-slate-700'
const errorClass = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <form class="space-y-6" novalidate @submit.prevent="onSubmit">
    <!-- Personal information -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Personal information</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">Enter the name exactly as it appears on the resident’s valid ID.</p>
      </header>

      <div class="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2">
          <label for="lastName" :class="labelClass">Last name <span class="text-red-500">*</span></label>
          <input id="lastName" v-model="form.lastName" type="text" autocomplete="off" :class="inputClass('lastName')"
            :data-invalid="!!show('lastName')" @blur="touched.lastName = true" />
          <p v-if="show('lastName')" :class="errorClass">{{ show('lastName') }}</p>
        </div>
        <div class="lg:col-span-2">
          <label for="firstName" :class="labelClass">First name <span class="text-red-500">*</span></label>
          <input id="firstName" v-model="form.firstName" type="text" autocomplete="off" :class="inputClass('firstName')"
            :data-invalid="!!show('firstName')" @blur="touched.firstName = true" />
          <p v-if="show('firstName')" :class="errorClass">{{ show('firstName') }}</p>
        </div>

        <div class="lg:col-span-2">
          <label for="middleName" :class="labelClass">Middle name</label>
          <input id="middleName" v-model="form.middleName" type="text" autocomplete="off" :class="inputClass('middleName')" />
        </div>
        <div>
          <label for="suffix" :class="labelClass">Suffix</label>
          <select id="suffix" v-model="form.suffix" :class="inputClass('suffix')">
            <option value="">None</option>
            <option v-for="s in ['Jr.', 'Sr.', 'II', 'III', 'IV']" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label for="sex" :class="labelClass">Sex <span class="text-red-500">*</span></label>
          <select id="sex" v-model="form.sex" :class="inputClass('sex')" :data-invalid="!!show('sex')" @blur="touched.sex = true">
            <option value="" disabled>Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <p v-if="show('sex')" :class="errorClass">{{ show('sex') }}</p>
        </div>

        <div class="lg:col-span-2">
          <label for="birthdate" :class="labelClass">Birthdate <span class="text-red-500">*</span></label>
          <input id="birthdate" v-model="form.birthdate" type="date" :max="today" :class="inputClass('birthdate')"
            :data-invalid="!!show('birthdate')" @blur="touched.birthdate = true" />
          <p v-if="show('birthdate')" :class="errorClass">{{ show('birthdate') }}</p>
        </div>
        <div>
          <span :class="labelClass">Age</span>
          <div class="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-700">
            <span class="tabular-nums">{{ age ?? '—' }}</span>
            <span v-if="isSenior" class="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Senior</span>
          </div>
        </div>
        <div>
          <label for="civilStatus" :class="labelClass">Civil status <span class="text-red-500">*</span></label>
          <select id="civilStatus" v-model="form.civilStatus" :class="inputClass('civilStatus')"
            :data-invalid="!!show('civilStatus')" @blur="touched.civilStatus = true">
            <option value="" disabled>Select</option>
            <option v-for="c in ['Single', 'Married', 'Widowed', 'Separated']" :key="c" :value="c">{{ c }}</option>
          </select>
          <p v-if="show('civilStatus')" :class="errorClass">{{ show('civilStatus') }}</p>
        </div>
      </div>
    </section>

    <!-- Address & household -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Address and household</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">Where the resident lives within the barangay.</p>
      </header>

      <div class="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label for="purok" :class="labelClass">Purok <span class="text-red-500">*</span></label>
          <select id="purok" v-model="form.purok" :class="inputClass('purok')" :data-invalid="!!show('purok')" @blur="touched.purok = true">
            <option value="" disabled>Select purok</option>
            <option v-for="n in 7" :key="n" :value="String(n)">Purok {{ n }}</option>
          </select>
          <p v-if="show('purok')" :class="errorClass">{{ show('purok') }}</p>
        </div>
        <div>
          <label for="householdNo" :class="labelClass">Household no. <span class="text-red-500">*</span></label>
          <input id="householdNo" v-model="form.householdNo" type="text" autocomplete="off" :class="inputClass('householdNo')"
            :data-invalid="!!show('householdNo')" @blur="touched.householdNo = true" />
          <p v-if="show('householdNo')" :class="errorClass">{{ show('householdNo') }}</p>
        </div>
        <div class="sm:col-span-2">
          <label for="address" :class="labelClass">Street / address <span class="text-red-500">*</span></label>
          <input id="address" v-model="form.address" type="text" autocomplete="off" placeholder="House no., street, sitio"
            :class="inputClass('address')" :data-invalid="!!show('address')" @blur="touched.address = true" />
          <p v-if="show('address')" :class="errorClass">{{ show('address') }}</p>
        </div>
      </div>
    </section>

    <!-- Contact & occupation -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Contact and occupation</h2>
      </header>

      <div class="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2">
        <div>
          <label for="contact" :class="labelClass">Mobile number</label>
          <input id="contact" v-model="form.contact" type="tel" inputmode="tel" placeholder="09XX XXX XXXX"
            :class="inputClass('contact')" :data-invalid="!!show('contact')" @blur="touched.contact = true" />
          <p v-if="show('contact')" :class="errorClass">{{ show('contact') }}</p>
        </div>
        <div>
          <label for="occupation" :class="labelClass">Occupation</label>
          <input id="occupation" v-model="form.occupation" type="text" autocomplete="off" :class="inputClass('occupation')" />
        </div>
      </div>
    </section>

    <!-- Classification -->
    <section :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Classification</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">
          Seniors are tagged automatically from the birthdate (60 and above).
        </p>
      </header>

      <div class="grid gap-3 p-5 sm:grid-cols-2">
        <label
          v-for="c in classifications"
          :key="c.key"
          :class="[
            'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors',
            form[c.key] ? 'border-bis-600 bg-bis-50/60' : 'border-slate-200 hover:bg-slate-50',
          ]"
        >
          <input v-model="form[c.key]" type="checkbox" class="mt-0.5 size-4 cursor-pointer rounded border-slate-300 accent-bis-600" />
          <span>
            <span class="block text-[13px] font-medium text-slate-900">{{ c.label }}</span>
            <span class="block text-[12px] text-slate-500">{{ c.hint }}</span>
          </span>
        </label>
      </div>
    </section>

    <!-- Status (edit only) -->
    <section v-if="mode === 'edit'" :class="sectionClass">
      <header class="border-b border-slate-200 px-5 py-4">
        <h2 class="text-[15px] font-medium text-bis-900">Residency status</h2>
        <p class="mt-0.5 text-[13px] text-slate-500">Transferred and deceased residents are kept on record but hidden from the active list.</p>
      </header>
      <div class="p-5 sm:max-w-xs">
        <label for="status" :class="labelClass">Status</label>
        <select id="status" v-model="form.status" :class="inputClass('status')">
          <option v-for="s in ['Active', 'Transferred', 'Deceased']" :key="s" :value="s">{{ s }}</option>
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
          {{ submitting ? 'Saving…' : mode === 'create' ? 'Save resident' : 'Save changes' }}
        </button>
      </div>
    </div>
  </form>
</template>