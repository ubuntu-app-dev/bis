<script setup lang="ts">
import { BARANGAY } from '@/data/certifications'
</script>

<template>
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
</template>
