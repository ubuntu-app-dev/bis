<script setup lang="ts">
import BisIcon from '@/icons/BisIcon.vue'

defineProps<{
  modelValue: string
  /** Accessible name, e.g. "Filter by purok" */
  label: string
  options: { value: string; label: string }[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div class="relative">
    <select
      :value="modelValue"
      :aria-label="label"
      class="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-8 text-[13px] text-slate-700 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <BisIcon
      name="chevronDown"
      :size="16"
      class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
    />
  </div>
</template>
