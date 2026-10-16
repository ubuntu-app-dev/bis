<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import type { AuditEntry } from '@/data/audit'

const props = defineProps<{ entry: AuditEntry | null }>()
const emit = defineEmits<{ (e: 'close'): void }>()

// Keep the last entry so its content stays visible while the panel slides out.
const shown = ref<AuditEntry | null>(props.entry)
const closeBtn = ref<HTMLButtonElement | null>(null)
let previousFocus: HTMLElement | null = null

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.entry,
  async (entry) => {
    if (entry) {
      shown.value = entry
      previousFocus = document.activeElement as HTMLElement | null
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      closeBtn.value?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus?.()
    }
  },
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

const initials = computed(() =>
  (shown.value?.user ?? '')
    .replace(/^Hon\.\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase(),
)

const fields = computed(() => {
  const e = shown.value
  if (!e) return []
  return [
    { label: 'Event ID', value: e.id, mono: true },
    { label: 'Date and time', value: new Date(e.at).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'medium' }), mono: false },
    { label: 'Recorded as (UTC)', value: e.at, mono: true },
    { label: 'User', value: e.user, mono: false },
    { label: 'Role', value: e.role, mono: false },
    { label: 'Module', value: e.module, mono: false },
    { label: 'Record', value: e.target || '—', mono: true },
    { label: 'Details', value: e.detail || '—', mono: false },
  ]
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="entry" class="fixed inset-0 z-[99998] bg-slate-900/40" aria-hidden="true" @click="emit('close')" />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-to-class="translate-x-full"
    >
      <aside
        v-if="entry && shown"
        class="fixed inset-y-0 right-0 z-[99999] flex w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-drawer-title"
      >
        <header class="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
          <span class="grid size-11 shrink-0 place-items-center rounded-full bg-bis-50 text-[14px] font-medium text-bis-700" aria-hidden="true">
            {{ initials }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 id="audit-drawer-title" class="text-[16px] font-medium leading-6 text-bis-900">{{ shown.action }}</h2>
            <p class="text-[12px] text-slate-500">{{ shown.user }} · {{ shown.role }}</p>
          </div>
          <button
            ref="closeBtn"
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            <BisIcon name="x" :size="18" />
            <span class="sr-only">Close event details</span>
          </button>
        </header>

        <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <p v-if="shown.sensitive" class="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-5 text-amber-800">
            <span class="font-medium">Confidential.</span> This event involved confidential records.
          </p>

          <dl class="divide-y divide-slate-100 rounded-lg border border-slate-200">
            <div v-for="f in fields" :key="f.label" class="flex items-start justify-between gap-4 px-3.5 py-2.5 text-[13px]">
              <dt class="shrink-0 text-slate-500">{{ f.label }}</dt>
              <dd :class="['break-words text-right font-medium text-slate-900', f.mono ? 'tabular-nums' : '']">{{ f.value }}</dd>
            </div>
          </dl>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
          <p class="text-[12px] leading-4 text-slate-500">Audit entries are read-only.<br />They cannot be edited or deleted.</p>
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
            @click="emit('close')"
          >
            Close
          </button>
        </footer>
      </aside>
    </Transition>
  </Teleport>
</template>