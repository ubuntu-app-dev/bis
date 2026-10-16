<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BisIcon from '@/icons/BisIcon.vue'
import { useSecretaryLayout } from '@/composables/useSecretaryLayout'

defineProps<{
  barangayName: string
  user: { name: string; role: string }
}>()

const emit = defineEmits<{
  (e: 'search', query: string): void
  (e: 'sign-out'): void
}>()

const { isSidebarVisible, toggleSidebar } = useSecretaryLayout()

const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const hasUnread = ref(true) // TODO: drive from your notifications API

const menuOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

const today = new Intl.DateTimeFormat('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  }
  if (e.key === 'Escape') menuOpen.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (menuOpen.value && !menuRoot.value?.contains(e.target as Node)) menuOpen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
})

const iconButton =
  'relative grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600'
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6"
  >
    <button
      type="button"
      :class="iconButton"
      :aria-label="isSidebarVisible ? 'Hide sidebar' : 'Show sidebar'"
      :aria-expanded="isSidebarVisible"
      @click="toggleSidebar"
    >
      <BisIcon name="panelLeft" :size="18" />
    </button>

    <div class="hidden min-w-0 leading-tight sm:block">
      <p class="truncate text-sm font-semibold text-slate-900">Barangay {{ barangayName }}</p>
      <p class="truncate text-xs text-slate-500">{{ today }}</p>
    </div>

    <form
      class="relative mx-auto hidden h-9 w-full max-w-md md:block"
      role="search"
      @submit.prevent="emit('search', query)"
    >
      <label for="secretary-search" class="sr-only">Search records or documents</label>
      <BisIcon
        name="search"
        :size="16"
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        id="secretary-search"
        ref="searchInput"
        v-model="query"
        type="search"
        placeholder="Search records or documents"
        autocomplete="off"
        class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-16 text-sm text-slate-900 placeholder:text-slate-500 transition-colors focus:border-bis-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-bis-600/20"
      />
      <kbd
        class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500"
      >
        {{ isMac ? '⌘K' : 'Ctrl K' }}
      </kbd>
    </form>

    <div class="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
      <button type="button" :class="iconButton" :aria-label="hasUnread ? 'Notifications, unread' : 'Notifications'">
        <BisIcon name="bell" :size="18" />
        <span v-if="hasUnread" class="absolute right-2 top-2 size-2 rounded-full bg-red-600 ring-2 ring-white" />
      </button>

      <!-- Account menu -->
      <div ref="menuRoot" class="relative">
        <button
          type="button"
          class="flex h-9 items-center gap-2.5 rounded-lg border border-transparent pl-1 pr-2 transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span class="grid size-7 place-items-center rounded-full bg-bis-600 text-xs font-semibold text-white">
            {{ user.name.slice(0, 1) }}
          </span>
          <span class="hidden text-left leading-tight lg:block">
            <span class="block text-sm font-medium text-slate-900">{{ user.name }}</span>
            <span class="block text-xs text-slate-500">{{ user.role }}</span>
          </span>
          <BisIcon
            name="chevronDown"
            :size="16"
            :class="['text-slate-400 transition-transform duration-150', menuOpen ? 'rotate-180' : '']"
          />
        </button>

        <div
          v-if="menuOpen"
          role="menu"
          class="absolute right-0 top-full mt-2 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <div class="border-b border-slate-100 px-3 pb-3 pt-2">
            <p class="truncate text-sm font-semibold text-slate-900">{{ user.name }}</p>
            <p class="truncate text-xs text-slate-500">{{ user.role }}</p>
          </div>
          <!-- Add RouterLink items here (Profile, Account settings) once those routes exist -->
          <button
            type="button"
            role="menuitem"
            class="mt-1.5 flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-sm text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-red-600"
            @click="emit('sign-out')"
          >
            <BisIcon name="logout" :size="16" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>