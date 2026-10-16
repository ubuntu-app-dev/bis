<script setup lang="ts">
import { ref } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import ResidentPicker from '@/components/layout/secretary/resident-picker.vue'
import type { ResidentRow } from '@/data/residents'
import { personOf, type Person } from '@/data/bites'
import { isMinor } from '@/data/blotter'

const props = defineProps<{
  modelValue: Person[]
  label: string
  residents: ResidentRow[]
  /** Used to build unique element ids when the editor appears more than once on a page */
  idPrefix: string
  hint?: string
  error?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: Person[]): void }>()

type Mode = 'Resident' | 'Non-resident' | 'Unknown'
const mode = ref<Mode>('Resident')
const modes: { value: Mode; label: string }[] = [
  { value: 'Resident', label: 'Resident' },
  { value: 'Non-resident', label: 'Not a resident' },
  { value: 'Unknown', label: 'Unknown' },
]

const name = ref('')
const age = ref<number | ''>('')
const sex = ref('')
const address = ref('')
const contact = ref('')
const addTried = ref(false)

const nameMissing = () => addTried.value && !name.value.trim()

function add(person: Person) {
  emit('update:modelValue', [...props.modelValue, person])
}

function addResident(row: ResidentRow) {
  // The same resident can't be listed twice in one group.
  if (props.modelValue.some((p) => p.residentId === row.id)) return
  add(personOf(row))
}

function addOutsider() {
  addTried.value = true
  if (!name.value.trim()) return
  add({
    name: name.value.trim(),
    age: age.value === '' ? undefined : Number(age.value),
    sex: sex.value || undefined,
    address: address.value.trim() || 'Not given',
    contact: contact.value.trim() || undefined,
  })
  name.value = ''
  age.value = ''
  sex.value = ''
  address.value = ''
  contact.value = ''
  addTried.value = false
}

function addUnknown() {
  add({ name: 'Unknown person', address: 'Not given' })
}

function remove(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
</script>

<template>
  <div>
    <h3 class="text-[13px] font-medium text-slate-900">{{ label }}</h3>
    <p v-if="hint" class="text-[12px] text-slate-500">{{ hint }}</p>

    <ul v-if="modelValue.length" class="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
      <li v-for="(p, i) in modelValue" :key="`${p.residentId ?? p.name}-${i}`" class="flex items-start gap-3 px-3 py-2.5">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-50 text-[11px] font-medium text-bis-700" aria-hidden="true">{{ p.name[0] }}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-medium text-slate-900">
            {{ p.name }}
            <span v-if="isMinor(p)" class="ml-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Minor</span>
          </p>
          <p class="truncate text-[12px] text-slate-500">
            <template v-if="p.residentId"><span class="tabular-nums">{{ p.residentId }}</span> · </template>
            <template v-if="p.age !== undefined">{{ p.age }} yrs · </template>{{ p.address }}
          </p>
        </div>
        <button
          type="button"
          class="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
          @click="remove(i)"
        >
          <BisIcon name="x" :size="14" />
          <span class="sr-only">Remove {{ p.name }}</span>
        </button>
      </li>
    </ul>
    <p v-else-if="!error" class="mt-2 text-[12px] text-slate-400">No one added yet.</p>
    <p v-if="error" role="alert" class="mt-2 text-[12px] text-red-600">{{ error }}</p>

    <!-- Add -->
    <div class="mt-3 rounded-lg bg-slate-50 p-3">
      <fieldset>
        <legend class="sr-only">Who to add</legend>
        <div class="inline-flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          <label
            v-for="m in modes"
            :key="m.value"
            :class="[
              'cursor-pointer rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-bis-600',
              mode === m.value ? 'bg-bis-50 text-bis-700' : 'text-slate-600 hover:text-slate-900',
            ]"
          >
            <input v-model="mode" type="radio" :name="`${idPrefix}-mode`" :value="m.value" class="sr-only" />
            {{ m.label }}
          </label>
        </div>
      </fieldset>

      <div class="mt-3">
        <ResidentPicker v-if="mode === 'Resident'" :residents="residents" :input-id="`${idPrefix}-picker`" @pick="addResident" />

        <div v-else-if="mode === 'Non-resident'" class="grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label :for="`${idPrefix}-name`" :class="labelCls">Full name</label>
            <input :id="`${idPrefix}-name`" v-model="name" type="text" maxlength="80" :class="inputCls" :aria-invalid="nameMissing()" />
            <p v-if="nameMissing()" role="alert" class="mt-1 text-[12px] text-red-600">Enter the person’s name.</p>
          </div>
          <div>
            <label :for="`${idPrefix}-age`" :class="labelCls">Age (optional)</label>
            <input :id="`${idPrefix}-age`" v-model.number="age" type="number" min="0" max="120" step="1" :class="[inputCls, 'tabular-nums']" />
          </div>
          <div>
            <label :for="`${idPrefix}-sex`" :class="labelCls">Sex (optional)</label>
            <select :id="`${idPrefix}-sex`" v-model="sex" :class="inputCls">
              <option value="">Not given</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label :for="`${idPrefix}-address`" :class="labelCls">Address (optional)</label>
            <input :id="`${idPrefix}-address`" v-model="address" type="text" maxlength="120" :class="inputCls" />
          </div>
          <div>
            <label :for="`${idPrefix}-contact`" :class="labelCls">Contact (optional)</label>
            <input :id="`${idPrefix}-contact`" v-model="contact" type="text" maxlength="30" :class="inputCls" />
          </div>
          <div class="sm:col-span-2">
            <button
              type="button"
              class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
              @click="addOutsider"
            >
              Add person
            </button>
          </div>
        </div>

        <div v-else class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="addUnknown"
          >
            Add unknown person
          </button>
          <p class="text-[12px] text-slate-500">Use this when the person hasn’t been identified yet. Once they are, edit the entry, remove this one, and add them properly.</p>
        </div>
      </div>
    </div>
  </div>
</template>
