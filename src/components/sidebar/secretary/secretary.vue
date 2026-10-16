<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { secretaryNav, type NavItem } from '@/config/secretary/secretaryNav.ts'
import { useSecretaryLayout } from '@/composables/useSecretaryLayout'

defineProps<{
  user: { name: string; office: string; initials: string }
}>()

const emit = defineEmits<{ (e: 'sign-out'): void }>()

const route = useRoute()
const { isSidebarVisible, closeMobile } = useSecretaryLayout()

const currentPath = computed(() => route.path.replace(/\/+$/, '') || '/')

function isPathActive(to: string) {
  if (to === '/secretary') return currentPath.value === '/secretary'
  return currentPath.value === to || currentPath.value.startsWith(`${to}/`)
}

function isGroupActive(item: NavItem) {
  return !!item.children?.some((child) => isPathActive(child.to))
}

// Which expandable groups are open (keyed by label).
const openGroups = reactive<Record<string, boolean>>({})

// Auto-open the group that contains the current page.
watch(
  () => route.path,
  () => {
    for (const section of secretaryNav) {
      for (const item of section.items) {
        if (item.children && isGroupActive(item)) openGroups[item.label] = true
      }
    }
  },
  { immediate: true },
)

function toggleGroup(label: string) {
  openGroups[label] = !openGroups[label]
}

const rowBase =
  'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bis-600'
const rowActive = 'bg-bis-50 text-bis-700'
const rowIdle = 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
</script>

<template>
  <aside
    aria-label="Secretary navigation"
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-[transform,visibility] duration-300 ease-out',
      isSidebarVisible ? 'visible translate-x-0' : 'invisible -translate-x-full',
    ]"
  >
    <!-- Brand (height matches the header so the two lines line up) -->
    <div class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4">
      <span
        class="grid size-8 shrink-0 place-items-center rounded-lg bg-bis-600 text-[11px] font-bold tracking-wide text-white"
        aria-hidden="true"
      >
        BIS
      </span>
      <span class="text-[13px] font-semibold leading-tight text-slate-900">
        Barangay<br /><span class="font-medium text-slate-500">Information System</span>
      </span>
    </div>

    <!-- Navigation (scrolls on its own, footer stays pinned) -->
    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
      <div v-for="section in secretaryNav" :key="section.title">
        <p class="mb-1.5 px-3 text-xs font-semibold text-slate-500">{{ section.title }}</p>

        <ul class="space-y-0.5">
          <li v-for="item in section.items" :key="item.label">
            <!-- Direct link -->
            <RouterLink
              v-if="item.to"
              :to="item.to"
              :class="[rowBase, isPathActive(item.to) ? rowActive : rowIdle]"
              :aria-current="isPathActive(item.to) ? 'page' : undefined"
              @click="closeMobile"
            >
              <BisIcon
                :name="item.icon"
                :size="18"
                :class="isPathActive(item.to) ? 'text-bis-600' : 'text-slate-500'"
              />
              <span class="truncate">{{ item.label }}</span>
            </RouterLink>

            <!-- Expandable group: when a child is active the parent is only emphasised,
                 not filled, so there is a single highlighted row at a time -->
            <template v-else-if="item.children">
              <button
                type="button"
                :class="[rowBase, rowIdle, isGroupActive(item) ? '!text-slate-900' : '']"
                :aria-expanded="!!openGroups[item.label]"
                @click="toggleGroup(item.label)"
              >
                <BisIcon
                  :name="item.icon"
                  :size="18"
                  :class="isGroupActive(item) ? 'text-bis-600' : 'text-slate-500'"
                />
                <span class="flex-1 truncate text-left">{{ item.label }}</span>
                <BisIcon
                  name="chevronDown"
                  :size="16"
                  :class="['text-slate-400 transition-transform duration-200', openGroups[item.label] ? 'rotate-180' : '']"
                />
              </button>

              <!-- grid-rows trick animates height without measuring it -->
              <div
                :class="[
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  openGroups[item.label] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                ]"
              >
                <ul
                  class="ml-[1.6rem] min-h-0 overflow-hidden border-l border-slate-200"
                  :class="openGroups[item.label] ? 'my-0.5' : ''"
                >
                  <li v-for="child in item.children" :key="child.to">
                    <RouterLink
                      :to="child.to"
                      :tabindex="openGroups[item.label] ? 0 : -1"
                      :aria-current="isPathActive(child.to) ? 'page' : undefined"
                      :class="[
                        '-ml-px block border-l-2 py-2 pl-4 pr-3 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bis-600',
                        isPathActive(child.to)
                          ? 'border-bis-600 bg-bis-50 font-medium text-bis-700'
                          : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900',
                      ]"
                      @click="closeMobile"
                    >
                      {{ child.label }}
                    </RouterLink>
                  </li>
                </ul>
              </div>
            </template>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Footer: current user + sign out -->
    <div class="shrink-0 border-t border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center gap-3 px-1">
        <div
          class="grid size-8 shrink-0 place-items-center rounded-full bg-bis-600 text-[11px] font-semibold text-white"
          aria-hidden="true"
        >
          {{ user.initials }}
        </div>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-medium text-slate-900">{{ user.name }}</p>
          <p class="truncate text-xs text-slate-500">{{ user.office }}</p>
        </div>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-600"
          @click="emit('sign-out')"
        >
          <BisIcon name="logout" :size="18" />
          <span class="sr-only">Sign out</span>
        </button>
      </div>
    </div>
  </aside>
</template>