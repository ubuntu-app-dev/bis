<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import HouseholdForm, {
  newMember,
  type HouseholdFormData,
  type HouseholdPayload,
} from '@/components/layout/secretary/household-form.vue'
import { createSampleHouseholds } from '@/data/households'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id))

// TODO: replace with an API fetch, e.g. await api.get(`/households/${id.value}`)
const household = computed(() => createSampleHouseholds().find((h) => h.id === id.value) ?? null)

const initial = computed<Partial<HouseholdFormData> | undefined>(() => {
  const h = household.value
  if (!h) return undefined
  return {
    householdNo: h.householdNo,
    purok: String(h.purok),
    address: h.address,
    contact: h.contact,
    dateRegistered: h.dateRegistered,
    tenure: h.tenure,
    dwellingType: h.dwellingType,
    waterSource: h.waterSource,
    toiletFacility: h.toiletFacility,
    hasElectricity: h.hasElectricity,
    is4Ps: h.is4Ps,
    isIndigent: h.isIndigent,
    status: h.status,
    members: h.members.map((m) =>
      newMember({
        id: m.id,
        lastName: m.lastName,
        firstName: m.firstName,
        // The sample data keeps the middle name on the household head only.
        middleName: m.relationship === 'Head' ? h.headMiddleName : '',
        relationship: m.relationship,
        sex: m.sex,
        age: m.age,
        occupation: m.occupation === '—' ? '' : m.occupation,
        isPwd: m.isPwd,
        isVoter: m.isVoter,
      }),
    ),
  }
})

const submitting = ref(false)
const errorMessage = ref('')

async function save(data: HouseholdPayload) {
  submitting.value = true
  errorMessage.value = ''
  try {
    // TODO: replace with your API call, e.g. await api.put(`/households/${id.value}`, data)
    console.log('Update household', id.value, data)
    router.push({ path: '/secretary/households', query: { updated: '1' } })
  } catch {
    errorMessage.value = 'The changes could not be saved. Please try again.'
  } finally {
    submitting.value = false
  }
}

function cancel() {
  router.push('/secretary/households')
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div>
      <nav class="flex items-center gap-1.5 text-[12px] text-slate-500" aria-label="Breadcrumb">
        <RouterLink to="/secretary/households" class="hover:text-bis-700 hover:underline">Household records</RouterLink>
        <BisIcon name="chevronRight" :size="12" />
        <span class="text-slate-700" aria-current="page">Edit household</span>
      </nav>
      <h1 class="mt-2 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Edit household</h1>
      <p v-if="household" class="mt-0.5 text-[13px] text-slate-500">
        Updating household
        <span class="font-medium text-slate-700">{{ household.householdNo }}</span>
        of {{ household.headFirstName }} {{ household.headLastName }}
        <span class="tabular-nums text-slate-400"> · {{ household.id }}</span>
      </p>
    </div>

    <div v-if="errorMessage" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
      {{ errorMessage }}
    </div>

    <HouseholdForm v-if="household" :key="household.id" mode="edit" :initial="initial" :submitting="submitting" @submit="save" @cancel="cancel" />

    <section v-else class="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div class="mx-auto grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-400">
        <BisIcon name="search" :size="20" />
      </div>
      <p class="mt-3 text-[14px] font-medium text-bis-900">Household not found</p>
      <p class="mt-0.5 text-[13px] text-slate-500">The record may have been removed or the link is incorrect.</p>
      <RouterLink
        to="/secretary/households"
        class="mt-4 inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        Back to household records
      </RouterLink>
    </section>
  </div>
</template>