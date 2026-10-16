<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import PartyEditor from '@/components/layout/secretary/blotter/party-editor.vue'
import { createSampleResidents, toRow } from '@/data/residents'
import { isoDate } from '@/data/animals'
import type { Person } from '@/data/bites'
import {
  OTHER_RELATIONSHIP,
  abuseOptions,
  relationships,
  reportedByOptions,
  useVawc,
  type AbuseType,
  type VawcInput,
} from '@/data/vawc'

const route = useRoute()
const router = useRouter()
const { getById, create, update } = useVawc()

const editId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const existing = computed(() => (editId.value ? getById(editId.value) : undefined))

// TODO: use the same residents source as the Resident records page (store or API).
const residents = createSampleResidents().map(toRow)

const today = isoDate()

/* ---------------------------------- Fields --------------------------------- */
const incidentDate = ref(today)
const incidentTime = ref('')
const place = ref('')
const abuseTypes = ref<AbuseType[]>([])
const relationship = ref('')
const reportedBy = ref('')
const immediateDanger = ref(false)
const narrative = ref('')
const victims = ref<Person[]>([])
const respondents = ref<Person[]>([])
const remarks = ref('')
const submitted = ref(false)

watch(
  existing,
  (e) => {
    if (!e) return
    incidentDate.value = e.incidentDate
    incidentTime.value = e.incidentTime ?? ''
    place.value = e.place
    abuseTypes.value = [...e.abuseTypes]
    relationship.value = e.relationship
    reportedBy.value = e.reportedBy
    immediateDanger.value = e.immediateDanger
    narrative.value = e.narrative
    victims.value = [...e.victims]
    respondents.value = [...e.respondents]
    remarks.value = e.remarks ?? ''
  },
  { immediate: true },
)

/* -------------------------------- Validation ------------------------------- */
const key = (p: Person) => p.residentId ?? p.name.trim().toLowerCase()

// The same person can't be both a victim and a respondent. The editors only check within one list.
const overlap = computed(() => {
  const v = new Set(victims.value.map(key))
  return respondents.value.some((p) => v.has(key(p)))
})

// PartyEditor's "Unknown" button adds this exact name. A VAWC respondent is a current or former
// partner (or the father of her child), so the person should be known.
const allUnknown = computed(() => respondents.value.length > 0 && respondents.value.every((p) => p.name === 'Unknown person'))

function timeInFuture() {
  return incidentDate.value === today && !!incidentTime.value && incidentTime.value > new Date().toTimeString().slice(0, 5)
}

const errors = computed(() => ({
  incidentDate: !incidentDate.value ? 'Enter the date of the incident.' : incidentDate.value > today ? 'The date cannot be in the future.' : '',
  incidentTime: timeInFuture() ? 'The time cannot be in the future.' : '',
  place: place.value.trim() ? '' : 'Say where it happened.',
  abuseTypes: abuseTypes.value.length ? '' : 'Choose at least one type.',
  relationship: relationship.value ? '' : 'Choose the relationship.',
  reportedBy: reportedBy.value ? '' : 'Say who reported it.',
  narrative: narrative.value.trim() ? '' : 'Write down what was reported.',
  victims: victims.value.length ? '' : 'Add at least one victim.',
  respondents: !respondents.value.length
    ? 'Add the respondent.'
    : allUnknown.value
      ? 'The respondent should be identified. If the person is a stranger, record the incident in the blotter instead.'
      : overlap.value
        ? 'The same person is listed as both victim and respondent.'
        : '',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function save() {
  submitted.value = true
  if (hasErrors.value) return

  const input: VawcInput = {
    incidentDate: incidentDate.value,
    incidentTime: incidentTime.value || undefined,
    place: place.value.trim(),
    abuseTypes: abuseTypes.value,
    relationship: relationship.value,
    reportedBy: reportedBy.value,
    immediateDanger: immediateDanger.value,
    narrative: narrative.value.trim(),
    victims: victims.value,
    respondents: respondents.value,
    remarks: remarks.value.trim() || undefined,
  }

  if (existing.value) update(existing.value.id, input)
  else create(input)
  router.push('/secretary/vawc/cases')
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
    <p class="text-[14px] font-medium text-bis-900">Case not found</p>
    <p class="mt-0.5 text-[13px] text-slate-500">It may have been removed, or the link is wrong.</p>
    <RouterLink to="/secretary/vawc/cases" class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
      Back to VAWC cases
    </RouterLink>
  </div>

  <div v-else-if="existing?.status === 'Closed'" class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
    <p class="text-[14px] font-medium text-bis-900">This case is closed</p>
    <p class="mt-0.5 text-[13px] text-slate-500">Reopen it from the case panel before editing, so the change is on record.</p>
    <RouterLink to="/secretary/vawc/cases" class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50">
      Back to VAWC cases
    </RouterLink>
  </div>

  <div v-else class="space-y-6">
    <div>
      <RouterLink
        to="/secretary/vawc/cases"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        Back to VAWC cases
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
        {{ existing ? `Edit ${existing.id}` : 'New VAWC case' }}
      </h1>
      <p class="mt-0.5 text-[13px] text-slate-500">
        These cases are not for mediation or settlement. Record the facts, help the victim, and refer the case.
      </p>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Incident</h2>

          <label class="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-900">
            <input v-model="immediateDanger" type="checkbox" class="mt-0.5 size-4 rounded border-red-300 text-red-600 focus:ring-red-600" />
            The victim is in immediate danger or needs medical attention.
          </label>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset class="sm:col-span-2">
              <legend :class="labelCls">Type of abuse</legend>
              <div class="space-y-2">
                <label v-for="a in abuseOptions" :key="a.key" class="flex items-start gap-2 text-[13px] text-slate-800">
                  <input v-model="abuseTypes" type="checkbox" :value="a.key" class="mt-0.5 size-4 rounded border-slate-300 text-bis-600 focus:ring-bis-600" />
                  <span>
                    {{ a.key }}
                    <span class="block text-[12px] text-slate-500">{{ a.hint }}</span>
                  </span>
                </label>
              </div>
              <p v-if="submitted && errors.abuseTypes" role="alert" :class="errCls">{{ errors.abuseTypes }}</p>
            </fieldset>

            <div>
              <label for="vw-date" :class="labelCls">Date of incident</label>
              <input id="vw-date" v-model="incidentDate" type="date" :max="today" :class="inputCls" :aria-invalid="submitted && !!errors.incidentDate" />
              <p v-if="submitted && errors.incidentDate" role="alert" :class="errCls">{{ errors.incidentDate }}</p>
            </div>

            <div>
              <label for="vw-time" :class="labelCls">Time (optional)</label>
              <input id="vw-time" v-model="incidentTime" type="time" :class="inputCls" :aria-invalid="submitted && !!errors.incidentTime" />
              <p v-if="submitted && errors.incidentTime" role="alert" :class="errCls">{{ errors.incidentTime }}</p>
            </div>

            <div class="sm:col-span-2">
              <label for="vw-place" :class="labelCls">Where did it happen?</label>
              <input id="vw-place" v-model="place" type="text" maxlength="120" :class="inputCls" :aria-invalid="submitted && !!errors.place" />
              <p v-if="submitted && errors.place" role="alert" :class="errCls">{{ errors.place }}</p>
            </div>

            <div>
              <label for="vw-rel" :class="labelCls">The respondent is the victim’s</label>
              <select id="vw-rel" v-model="relationship" :class="inputCls" :aria-invalid="submitted && !!errors.relationship">
                <option value="" disabled>Choose one</option>
                <option v-for="r in relationships" :key="r" :value="r">{{ r }}</option>
              </select>
              <p v-if="submitted && errors.relationship" role="alert" :class="errCls">{{ errors.relationship }}</p>
            </div>

            <div>
              <label for="vw-by" :class="labelCls">Reported by</label>
              <select id="vw-by" v-model="reportedBy" :class="inputCls" :aria-invalid="submitted && !!errors.reportedBy">
                <option value="" disabled>Choose one</option>
                <option v-for="r in reportedByOptions" :key="r" :value="r">{{ r }}</option>
              </select>
              <p v-if="submitted && errors.reportedBy" role="alert" :class="errCls">{{ errors.reportedBy }}</p>
            </div>

            <p v-if="relationship === OTHER_RELATIONSHIP" class="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600 sm:col-span-2">
              RA 9262 covers abuse by a husband, former husband, or a partner or former partner of the woman, or the father of her child.
              For other relationships, such as abuse of a child by another person, another law may apply. Ask the municipal social welfare office before handling it here.
            </p>

            <div class="sm:col-span-2">
              <label for="vw-narrative" :class="labelCls">What was reported?</label>
              <textarea id="vw-narrative" v-model="narrative" rows="5" maxlength="1500" :class="areaCls" :aria-invalid="submitted && !!errors.narrative" />
              <p v-if="submitted && errors.narrative" role="alert" :class="errCls">{{ errors.narrative }}</p>
              <p v-else class="mt-1 text-[12px] text-slate-500">Stick to facts, in the victim’s own account where possible.</p>
            </div>
          </div>
        </section>

        <section class="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">People involved</h2>
          <PartyEditor
            v-model="victims"
            label="Victims"
            hint="The woman, and any children who were affected."
            :residents="residents"
            id-prefix="victim"
            :error="submitted ? errors.victims : ''"
          />
          <div class="border-t border-slate-100 pt-6">
            <PartyEditor
              v-model="respondents"
              label="Respondent"
              hint="The person the report is about."
              :residents="residents"
              id-prefix="vawc-respondent"
              :error="submitted ? errors.respondents : ''"
            />
          </div>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Remarks</h2>
          <div class="mt-3">
            <label for="vw-remarks" class="sr-only">Remarks</label>
            <textarea id="vw-remarks" v-model="remarks" rows="3" maxlength="400" placeholder="Optional" :class="areaCls" />
          </div>
        </section>
      </div>

      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Type of abuse</dt>
            <dd class="font-medium text-slate-900">{{ abuseTypes.join(', ') || 'Not chosen yet' }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Victims</dt>
            <dd class="font-medium tabular-nums text-slate-900">{{ victims.length }}</dd>
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
          {{ existing ? 'Save changes' : 'Save case' }}
        </button>
        <p v-if="submitted && hasErrors" role="alert" class="text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
        <p v-else-if="!existing" class="text-[12px] text-slate-500">After saving, open the case to issue a BPO, log help given, or refer it.</p>
      </aside>
    </div>
  </div>
</template>