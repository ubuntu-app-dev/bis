<script setup lang="ts">
import { computed } from 'vue'
import { BARANGAY, certTypes, ordinal, type CertificateRequest } from '@/data/certifications'

const props = defineProps<{ request: CertificateRequest }>()

const r = computed(() => props.request.resident)
const name = computed(() => r.value.name.toUpperCase())
const civil = computed(() => r.value.civilStatus.toLowerCase())
const pronoun = computed(() => (r.value.sex === 'Male' ? 'he' : 'she'))
const place = `${BARANGAY.name}, ${BARANGAY.municipality}, ${BARANGAY.province}`

const issued = computed(() => new Date(props.request.issuedAt ?? props.request.requestedAt))
const day = computed(() => ordinal(issued.value.getDate()))
const month = computed(() => issued.value.toLocaleDateString('en-PH', { month: 'long' }))
const year = computed(() => issued.value.getFullYear())

const showThumb = computed(() => props.request.type === 'clearance' || props.request.type === 'residency')
const fee = computed(() => (props.request.fee > 0 ? `₱${props.request.fee.toFixed(2)}` : 'Free of charge'))
</script>

<template>
  <!-- A4 sheet. Padding is the page margin. -->
  <article
    class="mx-auto flex h-[297mm] w-[210mm] flex-col bg-white px-[22mm] py-[18mm] font-serif text-[12pt] leading-[1.7] text-black shadow-sm ring-1 ring-slate-200 print:h-[296mm] print:overflow-hidden print:shadow-none print:ring-0"
  >
    <!-- Letterhead -->
    <header class="flex items-center justify-between gap-4 border-b-2 border-black pb-4 text-center">
      <!-- Replace both placeholders with <img> tags of the barangay seal and the municipal logo -->
      <div class="grid size-20 shrink-0 place-items-center rounded-full border border-dashed border-slate-400 text-[8pt] leading-tight text-slate-400 print:border-slate-300">
        Barangay<br />seal
      </div>
      <div class="leading-snug">
        <p class="text-[10pt]">Republic of the Philippines</p>
        <p class="text-[10pt]">{{ BARANGAY.province }}</p>
        <p class="text-[10pt]">{{ BARANGAY.municipality }}</p>
        <p class="mt-1 text-[15pt] font-bold uppercase tracking-wide">{{ BARANGAY.name }}</p>
        <p class="text-[10pt] font-semibold">Office of the Punong Barangay</p>
      </div>
      <div class="grid size-20 shrink-0 place-items-center rounded-full border border-dashed border-slate-400 text-[8pt] leading-tight text-slate-400 print:border-slate-300">
        Municipal<br />logo
      </div>
    </header>

    <!-- Title + control number -->
    <div class="mt-8 text-center">
      <h1 class="text-[20pt] font-bold uppercase tracking-wide">{{ certTypes[request.type].title }}</h1>
    </div>
    <p class="mt-3 text-right text-[10pt]">Control No.: <strong class="tabular-nums">{{ request.controlNo }}</strong></p>

    <!-- Body -->
    <section class="mt-6 flex-1 space-y-4 text-justify">
      <p class="font-semibold">TO WHOM IT MAY CONCERN:</p>

      <template v-if="request.type === 'clearance'">
        <p class="indent-12">
          This is to certify that <strong>{{ name }}</strong>, {{ r.age }} years old, {{ civil }}, Filipino, and a resident of
          {{ r.address }}, {{ place }}, is known to me to be of good moral character and a law-abiding member of this community.
        </p>
        <p class="indent-12">
          This further certifies that, based on the records of this Barangay, {{ pronoun }} has no pending case or derogatory
          record on file as of this date.
        </p>
      </template>

      <template v-else-if="request.type === 'residency'">
        <p class="indent-12">
          This is to certify that <strong>{{ name }}</strong>, {{ r.age }} years old, {{ civil }}, Filipino, is a bona fide
          resident of {{ r.address }}, {{ place }}<template v-if="request.residentSince">, since <strong>{{ request.residentSince }}</strong></template>.
        </p>
        <p class="indent-12">
          This certification is based on the records of this Barangay and on personal knowledge of the undersigned.
        </p>
      </template>

      <template v-else-if="request.type === 'indigency'">
        <p class="indent-12">
          This is to certify that <strong>{{ name }}</strong>, {{ r.age }} years old, {{ civil }}, Filipino, and a resident of
          {{ r.address }}, {{ place }}, belongs to an indigent family in this Barangay and has no sufficient source of income.
        </p>
      </template>

      <template v-else>
        <p class="indent-12">
          This is to certify that <strong>{{ name }}</strong>, {{ r.age }} years old, {{ civil }}, Filipino, and a resident of
          {{ r.address }}, {{ place }}, is the owner or operator of
          <strong>{{ request.businessName }}</strong>, located at {{ request.businessAddress }}.
        </p>
        <p class="indent-12">
          This Barangay has no objection to the operation of the said business, subject to existing laws, ordinances, and
          regulations.
        </p>
      </template>

      <p class="indent-12">
        This certification is issued upon the request of the above-named person for
        <strong>{{ request.purpose.toLowerCase() }}</strong> purposes.
      </p>

      <p class="indent-12">
        Issued this <strong>{{ day }}</strong> day of {{ month }}, {{ year }} at {{ BARANGAY.name }}, {{ BARANGAY.municipality }},
        {{ BARANGAY.province }}, Philippines.
      </p>
    </section>

    <!-- Signatures -->
    <footer class="mt-8 grid grid-cols-2 items-end gap-8">
      <div v-if="showThumb" class="space-y-3 text-[10pt] leading-tight">
        <div class="grid h-24 w-24 place-items-end border border-black p-1 text-[8pt] text-slate-500">Right thumb mark</div>
        <div>
          <div class="w-52 border-b border-black pt-6" />
          <p class="mt-1">Signature of resident</p>
        </div>
      </div>
      <div v-else />

      <div class="text-center">
        <div class="mb-1 h-12" aria-hidden="true" />
        <p class="font-bold uppercase leading-tight">{{ BARANGAY.captain.replace(/^Hon\.\s*/, '') }}</p>
        <p class="text-[10pt] leading-tight">Punong Barangay</p>
      </div>
    </footer>

    <div class="mt-6 flex items-end justify-between border-t border-slate-300 pt-3 text-[9pt] leading-snug text-slate-600 print:border-slate-400">
      <div>
        <p>Prepared by: {{ BARANGAY.secretary }}, Barangay Secretary</p>
        <p>Fee: {{ fee }}<template v-if="request.orNumber"> · O.R. No. {{ request.orNumber }}</template></p>
      </div>
      <p class="text-right italic">Not valid without the official dry seal.</p>
    </div>
  </article>
</template>