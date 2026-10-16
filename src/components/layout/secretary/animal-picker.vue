<script setup lang="ts">
import { computed, ref } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import type { AnimalRow } from '@/data/animals'

const props = defineProps<{
  animals: AnimalRow[]
  inputId?: string
  invalid?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'pick', row: AnimalRow): void }>()

const search = ref('')

const matches = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return props.animals.filter((r) => r.status === 'Active' && r.haystack.includes(q)).slice(0, 6)
})

function pick(row: AnimalRow) {
  emit('pick', row)
  search.value = ''
}
</script>

<template>
  <div class="relative">
    <label :for="inputId ?? 'animal-picker'" class="sr-only">Search animals</label>
    <BisIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      :id="inputId ?? 'animal-picker'"
      v-model="search"
      type="search"
      autocomplete="off"
      :placeholder="placeholder ?? 'Search name, species, tag no. or owner'"
      :aria-invalid="invalid || undefined"
      class="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20"
    />

    <ul v-if="matches.length" class="absolute inset-x-0 top-full z-10 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
      <li v-for="r in matches" :key="r.id">
        <button
          type="button"
          class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
          @click="pick(r)"
        >
          <span class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-50 text-[12px] font-medium text-bis-700" aria-hidden="true">{{ r.species[0] }}</span>
          <span class="min-w-0">
            <span class="block truncate text-[13px] font-medium text-slate-900">{{ r.title }}</span>
            <span class="block truncate text-[12px] text-slate-400">
              {{ r.subtitle }} · <span class="tabular-nums">{{ r.id }}</span> · {{ r.ownerLabel }}
            </span>
          </span>
        </button>
      </li>
    </ul>
    <p v-else-if="search.trim()" class="mt-2 text-[12px] text-slate-500">No active animal matches “{{ search }}”.</p>
  </div>
</template>