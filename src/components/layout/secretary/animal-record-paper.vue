<script setup lang="ts">
import { computed } from 'vue'
import { BARANGAY } from '@/data/certifications'
import { ageLabel, formatDate, type Animal, type Vaccination } from '@/data/animals'

const props = defineProps<{ animal: Animal; vaccinations: Vaccination[] }>()

const MAX_ROWS = 10
const MIN_ROWS = 6

// Newest first, capped so the sheet never overflows. Blank lines are left for handwritten entries.
const shown = computed(() => props.vaccinations.slice(0, MAX_ROWS))
const hidden = computed(() => Math.max(0, props.vaccinations.length - MAX_ROWS))
const blankRows = computed(() => Math.max(0, MIN_ROWS - shown.value.length))

const isStray = computed(() => props.animal.ownerType === 'Stray')
const ownerName = computed(() =>
  props.animal.ownerType === 'Resident' ? (props.animal.owner?.name ?? '') : (props.animal.ownerName ?? ''),
)
const ownerAddress = computed(() => props.animal.owner?.address ?? props.animal.location ?? '')
const ownerContact = computed(() => props.animal.owner?.contact ?? props.animal.ownerContact ?? '')

const th = 'border border-black px-2 py-1 text-left font-semibold'
const td = 'border border-black px-2 py-1'
</script>

<template>
  <!-- A4 sheet. Padding is the page margin. -->
  <article
    class="mx-auto flex h-[297mm] w-[210mm] flex-col bg-white px-[20mm] py-[16mm] font-serif text-[11pt] leading-[1.5] text-black shadow-sm ring-1 ring-slate-200 print:h-[296mm] print:overflow-hidden print:shadow-none print:ring-0"
  >
    <!-- Letterhead -->
    <header class="flex items-center justify-between gap-4 border-b-2 border-black pb-3 text-center">
      <!-- Replace both placeholders with <img> tags of the barangay seal and the municipal logo -->
      <div class="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-slate-400 text-[7pt] leading-tight text-slate-400 print:border-slate-300">
        Barangay<br />seal
      </div>
      <div class="leading-snug">
        <p class="text-[9pt]">Republic of the Philippines</p>
        <p class="text-[9pt]">{{ BARANGAY.province }} · {{ BARANGAY.municipality }}</p>
        <p class="mt-0.5 text-[14pt] font-bold uppercase tracking-wide">{{ BARANGAY.name }}</p>
        <p class="text-[9pt] font-semibold">Office of the Punong Barangay</p>
      </div>
      <div class="grid size-16 shrink-0 place-items-center rounded-full border border-dashed border-slate-400 text-[7pt] leading-tight text-slate-400 print:border-slate-300">
        Municipal<br />logo
      </div>
    </header>

    <div class="mt-5 text-center">
      <h1 class="text-[16pt] font-bold uppercase tracking-wide">Animal registration record</h1>
    </div>
    <p class="mt-1 text-right text-[10pt]">
      Registration No.: <strong class="tabular-nums">{{ animal.id }}</strong> · Registered {{ formatDate(animal.registeredAt, 'long') }}
    </p>

    <!-- Animal -->
    <section class="mt-3">
      <h2 class="border-b border-black pb-0.5 text-[11pt] font-bold">Animal</h2>
      <dl class="mt-1.5 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-1 text-[10.5pt]">
        <dt class="text-slate-600 print:text-black">Species</dt>
        <dd class="font-semibold">{{ animal.species }} ({{ animal.category.toLowerCase() }})</dd>
        <dt class="text-slate-600 print:text-black">Name</dt>
        <dd class="font-semibold">{{ animal.name || '—' }}</dd>

        <dt class="text-slate-600 print:text-black">Quantity</dt>
        <dd class="font-semibold">{{ animal.count }}{{ animal.count > 1 ? ' (group record)' : '' }}</dd>
        <dt class="text-slate-600 print:text-black">Sex</dt>
        <dd class="font-semibold">{{ animal.sex }}</dd>

        <dt class="text-slate-600 print:text-black">Breed</dt>
        <dd class="font-semibold">{{ animal.breed || '—' }}</dd>
        <dt class="text-slate-600 print:text-black">Color</dt>
        <dd class="font-semibold">{{ animal.color || '—' }}</dd>

        <dt class="text-slate-600 print:text-black">Age</dt>
        <dd class="font-semibold">{{ ageLabel(animal.birthdate) }}</dd>
        <dt class="text-slate-600 print:text-black">Tag no.</dt>
        <dd class="font-semibold">{{ animal.tagNo || '—' }}</dd>
      </dl>
    </section>

    <!-- Owner -->
    <section class="mt-4">
      <h2 class="border-b border-black pb-0.5 text-[11pt] font-bold">{{ isStray ? 'Stray animal' : 'Owner' }}</h2>
      <dl class="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[10.5pt]">
        <template v-if="!isStray">
          <dt class="text-slate-600 print:text-black">Name</dt>
          <dd class="font-semibold">{{ ownerName || '—' }}</dd>
          <dt class="text-slate-600 print:text-black">Contact</dt>
          <dd class="font-semibold">{{ ownerContact || '—' }}</dd>
        </template>
        <dt class="text-slate-600 print:text-black">{{ isStray ? 'Usually found at' : 'Address' }}</dt>
        <dd class="font-semibold">{{ ownerAddress || '—' }}</dd>
      </dl>
    </section>

    <!-- Vaccination record -->
    <section class="mt-4 flex-1">
      <h2 class="border-b border-black pb-0.5 text-[11pt] font-bold">Vaccination record</h2>
      <table class="mt-2 w-full border-collapse text-[9.5pt]">
        <thead>
          <tr>
            <th :class="th">Date</th>
            <th :class="th">Vaccine</th>
            <th v-if="animal.count > 1" :class="[th, 'w-16']">No. given</th>
            <th :class="th">Next due</th>
            <th :class="th">Administered by</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in shown" :key="v.id">
            <td :class="[td, 'whitespace-nowrap']">{{ formatDate(v.date) }}</td>
            <td :class="td">{{ v.vaccine }}</td>
            <td v-if="animal.count > 1" :class="[td, 'text-center tabular-nums']">{{ v.count }}</td>
            <td :class="[td, 'whitespace-nowrap']">{{ v.nextDue ? formatDate(v.nextDue) : '' }}</td>
            <td :class="td">{{ v.administeredBy }}</td>
          </tr>
          <tr v-for="n in blankRows" :key="`blank-${n}`" aria-hidden="true">
            <td :class="[td, 'h-7']" />
            <td :class="td" />
            <td v-if="animal.count > 1" :class="td" />
            <td :class="td" />
            <td :class="td" />
          </tr>
        </tbody>
      </table>
      <p v-if="hidden" class="mt-1 text-[9pt] italic">{{ hidden }} older {{ hidden === 1 ? 'entry is' : 'entries are' }} not shown. See the barangay registry.</p>
    </section>

    <!-- Signatures -->
    <footer class="mt-6 grid grid-cols-2 gap-8 text-center text-[10pt]">
      <div>
        <div class="h-10" aria-hidden="true" />
        <p class="font-bold uppercase leading-tight">{{ BARANGAY.secretary }}</p>
        <p class="leading-tight">Barangay Secretary</p>
      </div>
      <div>
        <div class="h-10" aria-hidden="true" />
        <p class="font-bold uppercase leading-tight">{{ BARANGAY.captain.replace(/^Hon\.\s*/, '') }}</p>
        <p class="leading-tight">Punong Barangay</p>
      </div>
    </footer>

    <p class="mt-4 border-t border-slate-300 pt-2 text-[8.5pt] italic text-slate-600 print:border-slate-400 print:text-black">
      Keep this record. Show it when the animal is vaccinated, transferred, or involved in an incident. Not valid without the official dry seal.
    </p>
  </article>
</template>