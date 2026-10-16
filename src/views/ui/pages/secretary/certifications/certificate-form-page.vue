<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { createSampleResidents, toRow, type ResidentRow } from '@/data/residents'
import {
  certTypeList,
  certTypes,
  snapshotOf,
  useCertificates,
  type CertType,
  type ResidentSnapshot,
} from '@/data/certifications'

const route = useRoute()
const router = useRouter()
const { getById, issue } = useCertificates()

const type = computed(() => route.params.type as CertType)
const cfg = computed(() => certTypes[type.value])

// The request being reviewed (online request) or null for a walk-in.
const requestId = computed(() => (typeof route.query.request === 'string' ? route.query.request : null))
const existing = computed(() => (requestId.value ? getById(requestId.value) : undefined))

/* -------------------------------- Residents -------------------------------- */
// TODO: use the same residents source as the Resident records page (store or API).
// If createSampleResidents() is random, ids will not match between pages.
const residents = createSampleResidents().map(toRow)

const search = ref('')
const picked = ref<ResidentSnapshot | null>(null)

const matches = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return residents.filter((r: ResidentRow) => r.status === 'Active' && r.haystack.includes(q)).slice(0, 6)
})

function pick(row: ResidentRow) {
  picked.value = snapshotOf(row)
  search.value = ''
}

/* ---------------------------------- Fields --------------------------------- */
const purpose = ref('')
const otherPurpose = ref('')
const residentSince = ref('')
const businessName = ref('')
const businessAddress = ref('')
const fee = ref(0)
const orNumber = ref('')
const submitted = ref(false)

function resetFields() {
  purpose.value = ''
  otherPurpose.value = ''
  residentSince.value = ''
  businessName.value = ''
  businessAddress.value = ''
  orNumber.value = ''
  fee.value = cfg.value.fee
  submitted.value = false
}

// Runs on first load and whenever the type tab or the ?request / ?resident query changes.
watch(
  () => [route.params.type, route.query.request, route.query.resident],
  () => {
    resetFields()
    picked.value = null

    const req = existing.value
    if (req) {
      picked.value = req.resident
      const known = cfg.value.purposes.includes(req.purpose)
      purpose.value = known ? req.purpose : 'Other'
      otherPurpose.value = known ? '' : req.purpose
      residentSince.value = req.residentSince ?? ''
      businessName.value = req.businessName ?? ''
      businessAddress.value = req.businessAddress ?? ''
      fee.value = req.fee
      orNumber.value = req.orNumber ?? ''
    } else if (typeof route.query.resident === 'string') {
      const row = residents.find((r) => r.id === route.query.resident)
      if (row) picked.value = snapshotOf(row)
    }
  },
  { immediate: true },
)

const finalPurpose = computed(() => (purpose.value === 'Other' ? otherPurpose.value.trim() : purpose.value))

const errors = computed(() => ({
  resident: picked.value ? '' : 'Choose a resident from the list.',
  purpose: finalPurpose.value ? '' : purpose.value === 'Other' ? 'Describe the purpose.' : 'Choose a purpose.',
  residentSince: type.value !== 'residency' || /^\d{4}$/.test(residentSince.value) ? '' : 'Enter a 4-digit year.',
  businessName: type.value !== 'business' || businessName.value.trim() ? '' : 'Enter the business name.',
  businessAddress: type.value !== 'business' || businessAddress.value.trim() ? '' : 'Enter the business address.',
  fee: fee.value >= 0 && Number.isFinite(fee.value) ? '' : 'Fee cannot be negative.',
}))
const hasErrors = computed(() => Object.values(errors.value).some(Boolean))

function save() {
  submitted.value = true
  if (hasErrors.value || !picked.value) return

  const req = issue(
    {
      type: type.value,
      resident: picked.value,
      purpose: finalPurpose.value,
      residentSince: type.value === 'residency' ? residentSince.value : undefined,
      businessName: type.value === 'business' ? businessName.value.trim() : undefined,
      businessAddress: type.value === 'business' ? businessAddress.value.trim() : undefined,
      fee: Number(fee.value),
      orNumber: orNumber.value.trim() || undefined,
    },
    requestId.value ?? undefined,
  )
  router.push(`/secretary/certifications/print/${req.id}`)
}

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`

const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const labelCls = 'mb-1 block text-[12px] font-medium text-slate-600'
</script>

<template>
  <div class="space-y-6">
    <!-- Title -->
    <div>
      <RouterLink
        :to="existing ? '/secretary/certifications/requests' : '/secretary/certifications/records'"
        class="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
      >
        <BisIcon name="chevronLeft" :size="14" />
        {{ existing ? 'Back to requests' : 'Back to records' }}
      </RouterLink>
      <h1 class="mt-1 text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">
        {{ existing ? `Review ${cfg.title.toLowerCase()}` : 'Issue certificate' }}
      </h1>
      <p class="mt-0.5 text-[13px] text-slate-500">
        {{
          existing
            ? `Online request ${existing.id}. Check the details, then issue it.`
            : 'Choose a resident, fill in the details, then print.'
        }}
      </p>
    </div>

    <!-- Certificate type (locked when reviewing an online request) -->
    <div v-if="!existing" class="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Certificate type">
      <RouterLink
        v-for="t in certTypeList"
        :key="t.key"
        :to="{ path: `/secretary/certifications/${t.key}`, query: route.query.resident ? { resident: route.query.resident } : {} }"
        role="tab"
        :aria-selected="t.key === type"
        :class="[
          'shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bis-600',
          t.key === type ? 'bg-bis-50 text-bis-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
        ]"
      >
        {{ t.title }}
      </RouterLink>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      <div class="space-y-6">
        <!-- Resident -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Resident</h2>

          <div v-if="picked" class="mt-3 flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-bis-100 text-[13px] font-medium text-bis-700" aria-hidden="true">
              {{ picked.name.split(' ').map((p) => p[0]).slice(0, 2).join('') }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[14px] font-medium text-slate-900">{{ picked.name }}</p>
              <p class="text-[12px] text-slate-500">
                <span class="tabular-nums">{{ picked.id }}</span> · {{ picked.age }} yrs · {{ picked.sex }} · {{ picked.civilStatus }}
              </p>
              <p class="text-[12px] text-slate-500">{{ picked.address }}</p>
            </div>
            <button
              v-if="!existing"
              type="button"
              class="shrink-0 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-bis-600 hover:bg-bis-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
              @click="picked = null"
            >
              Change
            </button>
          </div>

          <div v-else class="relative mt-3">
            <label for="resident-picker" class="sr-only">Search resident</label>
            <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="resident-picker"
              v-model="search"
              type="search"
              autocomplete="off"
              placeholder="Search by name, resident ID or household no."
              :aria-invalid="submitted && !!errors.resident"
              :class="[inputCls, 'pl-9']"
            />
            <ul v-if="matches.length" class="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <li v-for="r in matches" :key="r.id">
                <button
                  type="button"
                  class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                  @click="pick(r)"
                >
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-50 text-[11px] font-medium text-bis-700" aria-hidden="true">{{ r.initials }}</span>
                  <span class="min-w-0">
                    <span class="block truncate text-[13px] font-medium text-slate-900">{{ r.name }}</span>
                    <span class="block text-[12px] text-slate-400"><span class="tabular-nums">{{ r.id }}</span> · Purok {{ r.purok }}</span>
                  </span>
                </button>
              </li>
            </ul>
            <p v-else-if="search.trim()" class="mt-2 text-[12px] text-slate-500">No active resident matches “{{ search }}”.</p>
          </div>
          <p v-if="submitted && errors.resident" role="alert" class="mt-2 text-[12px] text-red-600">{{ errors.resident }}</p>
        </section>

        <!-- Details -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">{{ cfg.title }}</h2>

          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div :class="purpose === 'Other' ? '' : 'sm:col-span-2'">
              <label for="purpose" :class="labelCls">Purpose</label>
              <select id="purpose" v-model="purpose" :class="inputCls" :aria-invalid="submitted && !!errors.purpose">
                <option value="" disabled>Choose a purpose</option>
                <option v-for="p in cfg.purposes" :key="p" :value="p">{{ p }}</option>
              </select>
              <p v-if="submitted && errors.purpose && purpose !== 'Other'" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.purpose }}</p>
            </div>

            <div v-if="purpose === 'Other'">
              <label for="other-purpose" :class="labelCls">Describe the purpose</label>
              <input id="other-purpose" v-model="otherPurpose" type="text" maxlength="80" :class="inputCls" />
              <p v-if="submitted && errors.purpose" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.purpose }}</p>
            </div>

            <div v-if="type === 'residency'">
              <label for="since" :class="labelCls">Resident since (year)</label>
              <input id="since" v-model="residentSince" type="text" inputmode="numeric" maxlength="4" placeholder="2008" :class="inputCls" />
              <p v-if="submitted && errors.residentSince" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.residentSince }}</p>
            </div>

            <template v-if="type === 'business'">
              <div>
                <label for="biz-name" :class="labelCls">Business name</label>
                <input id="biz-name" v-model="businessName" type="text" maxlength="80" :class="inputCls" />
                <p v-if="submitted && errors.businessName" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.businessName }}</p>
              </div>
              <div>
                <label for="biz-address" :class="labelCls">Business address</label>
                <input id="biz-address" v-model="businessAddress" type="text" maxlength="120" :class="inputCls" />
                <p v-if="submitted && errors.businessAddress" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.businessAddress }}</p>
              </div>
            </template>
          </div>
        </section>

        <!-- Payment -->
        <section class="rounded-xl border border-slate-200 bg-white p-5">
          <h2 class="text-[14px] font-medium text-bis-900">Payment</h2>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="fee" :class="labelCls">Fee (₱)</label>
              <input id="fee" v-model.number="fee" type="number" min="0" step="1" :class="[inputCls, 'tabular-nums']" />
              <p class="mt-1 text-[12px] text-slate-500">Set to 0 if the fee is waived.</p>
              <p v-if="submitted && errors.fee" role="alert" class="mt-1 text-[12px] text-red-600">{{ errors.fee }}</p>
            </div>
            <div>
              <label for="or" :class="labelCls">Official receipt no.</label>
              <input id="or" v-model="orNumber" type="text" :disabled="fee === 0" :placeholder="fee === 0 ? 'Not needed' : 'Optional for now'" :class="[inputCls, 'tabular-nums disabled:bg-slate-50 disabled:text-slate-400']" />
            </div>
          </div>
        </section>
      </div>

      <!-- Summary -->
      <aside class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-20">
        <h2 class="text-[14px] font-medium text-bis-900">Summary</h2>
        <dl class="space-y-3 text-[13px]">
          <div>
            <dt class="text-[12px] text-slate-500">Certificate</dt>
            <dd class="font-medium text-slate-900">{{ cfg.title }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Resident</dt>
            <dd class="font-medium text-slate-900">{{ picked?.name ?? 'Not chosen yet' }}</dd>
          </div>
          <div>
            <dt class="text-[12px] text-slate-500">Purpose</dt>
            <dd class="font-medium text-slate-900">{{ finalPurpose || 'Not chosen yet' }}</dd>
          </div>
          <div class="border-t border-slate-100 pt-3">
            <dt class="text-[12px] text-slate-500">Amount due</dt>
            <dd class="text-[18px] font-medium tabular-nums text-slate-900">{{ fee > 0 ? peso(fee) : 'Free' }}</dd>
          </div>
        </dl>

        <button
          type="button"
          class="inline-flex h-9 w-full items-center justify-center rounded-lg bg-bis-600 px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          @click="save"
        >
          Issue and preview
        </button>
        <p v-if="submitted && hasErrors" role="alert" class="text-[12px] text-red-600">Fix the highlighted fields to continue.</p>
        <p v-else class="text-[12px] text-slate-500">A control number is assigned when you issue it.</p>
      </aside>
    </div>
  </div>
</template>