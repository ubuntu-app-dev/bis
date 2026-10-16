<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import HouseholdForm, { type HouseholdPayload } from '@/components/layout/secretary/household-form.vue'

const router = useRouter()
const submitting = ref(false)
const errorMessage = ref('')

async function save(data: HouseholdPayload) {
  submitting.value = true
  errorMessage.value = ''
  try {
    // TODO: replace with your API call, e.g. await api.post('/households', data)
    console.log('Create household', data)
    router.push({ path: '/secretary/households', query: { created: '1' } })
  } catch {
    errorMessage.value = 'The household could not be saved. Please try again.'
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
        <span class="text-slate-700" aria-current="page">Add household</span>
      </nav>
      <h1 class="mt-2 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Add household</h1>
      <p class="mt-0.5 text-[13px] text-slate-500">Register a new household and its members in the barangay registry.</p>
    </div>

    <div v-if="errorMessage" role="alert" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
      {{ errorMessage }}
    </div>

    <HouseholdForm mode="create" :submitting="submitting" @submit="save" @cancel="cancel" />
  </div>
</template>