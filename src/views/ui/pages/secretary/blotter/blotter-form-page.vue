<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import PartyEditor from '@/components/layout/secretary/blotter/party-editor.vue'
import { createSampleResidents, toRow } from '@/data/residents'
import { isoDate } from '@/data/animals'
import type { Person } from '@/data/bites'
import { incidentTypes, useBlotter, type BlotterInput } from '@/data/blotter'

const route = useRoute()
const router = useRouter()
const { getById, create, update } = useBlotter()

const editId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const existing = computed(() => (editId.value ? getById(editId.value) : undefined))

// TODO: use the same residents source as the Resident records page (store or API).
const residents = createSampleResidents().map(toRow)

const today = isoDate()

/* ---------------------------------- Fields --------------------------------- */
const incidentDate = ref(today)
const incidentTime = ref('')
const place = ref('')
const incidentType = ref('')
const narrative = ref('')
const complainants = ref<Person[]>([])
const respondents = ref<Person[]>([])
const witnesses = ref<Person[]>([])
const remarks = ref('')
const submitted = ref(false)

// Prefill when editing.
watch(
  existing,
  (e) => {
    if (!e) return
    incidentDate.value = e.incidentDate
    incidentTime.value = e.incidentTime ?? ''
    place.value = e.place
    incidentType.value = e.incidentType
    narrative.value = e.narrative
    complainants.value = [...e.complainants]
    respondents.value = [...e.respondents]
    witnesses.value = [...e.witnesses]
    remarks.value = e.remarks ?? ''
  },
  { immediate: true },
)

const errors = computed(() => ({
  incidentDate: !incidentDate.value ? 'Enter the date of the incident.' : incidentDate.value > today ? 'The date cannot be in the future.' : '',
  place: place.value.trim() ? '' : 'Say where it happened.',
  incidentType: incidentType.value ? '' : 'Choose the type of incident.',
  narrative: narrative.value.trim() ? '' : 'Write down what happened.',
  complainants: complainants.value.length ? '' : 'Add at least one complainant.',
  respondents: respondents.value.length ? '' : 'Add at least one respondent, or an unknown person.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function save() {
  submitted.value = true
  if (hasErrors.value) return

  const input: BlotterInput = {
    incidentDate: incidentDate.value,
    incidentTime: incidentTime.value || undefined,
    place: place.value.trim(),
    incidentType: incidentType.value,
    narrative: narrative.value.trim(),
    complainants: complainants.value,
    respondents: respondents.value,
    witnesses: witnesses.value,
    remarks: remarks.value.trim() || undefined,
  }

  if (existing.value) update(existing.value.id, input)
  else create(input)
  router.push('/secretary/blotter/records')
}

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const areaCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-800 placeholder:text-slate-400 hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
const errCls = 'mt-1 text-[12px] text-red-600'
</script>

<template>
  <div v-if="editId && !existing" class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
    <p class="text-[14px] font-medium text-bis-900">Blotter entry not found</p>
    <p class="mt-0.5 text-[13px] text-slate-500">It may have been removed, or the link is wrong.</p>
    <RouterLink
      to="/secretary/blotter/records"
      class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      Back to blotter
    </RouterLink>
  </div>

  <div v-else class="space-y-6">
    <!-- Title -->
    <div>
      <RouterLink
        to="/secretary/blotter/records"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        Back to blotter
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
        {{ existing ? `Edit ${existing.id}` : 'New blotter entry' }}
      </h1>
      <p class="mt-0.5 text-[13px] text-slate-500">
        Violence against women or children is recorded under VAWC cases, not here.
      </p>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <!-- Incident -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Incident</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="bl-type" :class="labelCls">Type of incident</label>
              <select id="bl-type" v-model="incidentType" :class="inputCls" :aria-invalid="submitted && !!errors.incidentType">
                <option value="" disabled>Choose a type</option>
                <option v-for="t in incidentTypes" :key="t" :value="t">{{ t }}</option>
              </select>
              <p v-if="submitted && errors.incidentType" role="alert" :class="errCls">{{ errors.incidentType }}</p>
            </div>

            <div>
              <label for="bl-date" :class="labelCls">Date of incident</label>
              <input id="bl-date" v-model="incidentDate" type="date" :max="today" :class="inputCls" :aria-invalid="submitted && !!errors.incidentDate" />
              <p v-if="submitted && errors.incidentDate" role="alert" :class="errCls">{{ errors.incidentDate }}</p>
            </div>

            <div>
              <label for="bl-time" :class="labelCls">Time (optional)</label>
              <input id="bl-time" v-model="incidentTime" type="time" :class="inputCls" />
            </div>

            <div class="sm:col-span-2">
              <label for="bl-place" :class="labelCls">Where did it happen?</label>
              <input id="bl-place" v-model="place" type="text" maxlength="120" placeholder="Along the main road, Purok 3" :class="inputCls" :aria-invalid="submitted && !!errors.place" />
              <p v-if="submitted && errors.place" role="alert" :class="errCls">{{ errors.place }}</p>
            </div>

            <div class="sm:col-span-2">
              <label for="bl-narrative" :class="labelCls">What happened?</label>
              <textarea id="bl-narrative" v-model="narrative" rows="5" maxlength="1500" :class="areaCls" :aria-invalid="submitted && !!errors.narrative" />
              <p v-if="submitted && errors.narrative" role="alert" :class="errCls">{{ errors.narrative }}</p>
              <p v-else class="mt-1 text-[12px] text-slate-500">Stick to facts: who, what, when, where. This is printed on certified extracts.</p>
            </div>
          </div>
        </section>

        <!-- Parties -->
        <section class="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">People involved</h2>

          <PartyEditor
            v-model="complainants"
            label="Complainants"
            hint="The person or people who made the report."
            :residents="residents"
            id-prefix="complainant"
            :error="submitted ? errors.complainants : ''"
          />
          <div class="border-t border-slate-100 pt-6">
            <PartyEditor
              v-model="respondents"
              label="Respondents"
              hint="The person or people the report is about."
              :residents="residents"
              id-prefix="respondent"
              :error="submitted ? errors.respondents : ''"
            />
          </div>
          <div class="border-t border-slate-100 pt-6">
            <PartyEditor v-model="witnesses" label="Witnesses (optional)" :residents="residents" id-prefix="witness" />
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Remarks</h2>
          <div class="mt-3">
            <label for="bl-remarks" class="sr-only">Remarks</label>
            <textarea id="bl-remarks" v-model="remarks" rows="3" maxlength="400" placeholder="Optional" :class="areaCls" />
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Incident</dt>
            <dd class="font-medium text-slate-900">{{ incidentType || 'Not chosen yet' }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Complainants</dt>
            <dd class="font-medium tabular-nums text-slate-900">{{ complainants.length }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Respondents</dt>
            <dd class="font-medium tabular-nums text-slate-900">{{ respondents.length }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          {{ existing ? 'Save changes' : 'Save entry' }}
        </button>
        <p v-if="submitted && hasErrors" role="alert" class="text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
        <p v-else-if="!existing" class="text-[12px] text-slate-500">A new entry is only recorded. Start mediation from the entry when a settlement is wanted.</p>
      </aside>
    </div>
  </div>
</template>
