<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BisIcon from '@/icons/BisIcon.vue'
import { municipalNav, type MunicipalNavItem } from '@/config/municipal/municipalNav.ts'
import { useSecretaryLayout } from '@/composables/useSecretaryLayout'

defineProps<{
  user: { name: string; office: string; initials: string }
}>()

const emit = defineEmits<{ (e: 'sign-out'): void }>()

const route = useRoute()
const { isSidebarVisible, closeMobile } = useSecretaryLayout()

const currentPath = computed(() => route.path.replace(/\/+$/, '') || '/')

const allLinks = municipalNav.flatMap((section) =>
  section.items.flatMap((item) => (item.to ? [item.to] : (item.children ?? []).map((c) => c.to))),
)

function matches(to: string) {
  if (to === '/municipal') return currentPath.value === '/municipal'
  return currentPath.value === to || currentPath.value.startsWith(`${to}/`)
}

// Only the most specific match is active, so "All barangays" is not lit on /barangays/officials.
const activeTo = computed(() =>
  allLinks.filter(matches).sort((a, b) => b.length - a.length)[0],
)

function isPathActive(to: string) {
  return to === activeTo.value
}

function isGroupActive(item: MunicipalNavItem) {
  return !!item.children?.some((child) => isPathActive(child.to))
}

// Which expandable groups are open (keyed by label).
const openGroups = reactive<Record<string, boolean>>({})

// Auto-open the group that contains the current page.
watch(
  () => route.path,
  () => {
    for (const section of municipalNav) {
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

// Row = the clickable line. Tile = the small rounded square behind each icon.
const rowBase =
  'group relative flex h-10 w-full items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white'
const rowActive = 'bg-white/10 text-white'
const rowIdle = 'text-slate-300 hover:bg-white/5 hover:text-white'
const tileBase =
  'grid size-7 shrink-0 place-items-center rounded-md transition-colors motion-reduce:transition-none'
const tileActive = 'bg-bis-600 text-white shadow-sm shadow-black/30'
const tileIdle = 'text-slate-400 group-hover:text-white'
</script>

<template>
  <aside
    aria-label="Municipal navigation"
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900 transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none',
      isSidebarVisible ? 'visible translate-x-0' : 'invisible -translate-x-full',
    ]"
  >
    <!-- Brand (height matches the header so the two lines line up) -->
    <div class="flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
      <span
        class="grid size-9 shrink-0 place-items-center rounded-xl bg-bis-600 text-white shadow-md shadow-black/30 ring-1 ring-white/15"
        aria-hidden="true"
      >
        <BisIcon name="building" :size="18" />
      </span>
      <span class="min-w-0 leading-tight">
        <span class="block truncate text-sm font-semibold text-white">Municipal Office</span>
        <span class="block truncate text-xs text-slate-400">Barangay Information System</span>
      </span>
    </div>

    <!-- Navigation (scrolls on its own, footer stays pinned) -->
    <nav
      aria-label="Municipal sections"
      class="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-color:#334155_transparent] [scrollbar-width:thin]"
    >
      <div v-for="section in municipalNav" :key="section.title">
        <p class="mb-2 px-2 text-xs font-medium text-slate-500">{{ section.title }}</p>

        <ul class="space-y-1">
          <li v-for="item in section.items" :key="item.label">
            <!-- Direct link -->
            <RouterLink
              v-if="item.to"
              :to="item.to"
              :class="[rowBase, isPathActive(item.to) ? rowActive : rowIdle]"
              :aria-current="isPathActive(item.to) ? 'page' : undefined"
              @click="closeMobile"
            >
              <!-- Active marker hugging the sidebar edge -->
              <span
                v-if="isPathActive(item.to)"
                class="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-bis-600"
                aria-hidden="true"
              />
              <span :class="[tileBase, isPathActive(item.to) ? tileActive : tileIdle]">
                <BisIcon :name="item.icon" :size="17" />
              </span>
              <span class="flex-1 truncate">{{ item.label }}</span>
              <span
                v-if="item.badge !== undefined"
                class="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-200"
              >
                {{ item.badge }}
              </span>
            </RouterLink>

            <!-- Expandable module group -->
            <template v-else-if="item.children">
              <button
                type="button"
                :class="[rowBase, isGroupActive(item) ? 'text-white hover:bg-white/5' : rowIdle]"
                :aria-expanded="!!openGroups[item.label]"
                @click="toggleGroup(item.label)"
              >
                <span :class="[tileBase, isGroupActive(item) ? 'bg-white/10 text-white' : tileIdle]">
                  <BisIcon :name="item.icon" :size="17" />
                </span>
                <span class="flex-1 truncate text-left">{{ item.label }}</span>
                <BisIcon
                  name="chevronDown"
                  :size="16"
                  :class="['text-slate-500 transition-transform duration-200', openGroups[item.label] ? 'rotate-180' : '']"
                />
              </button>

              <div
                :class="[
                  'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                  openGroups[item.label] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                ]"
              >
                <ul
                  class="ml-[1.35rem] min-h-0 overflow-hidden border-l border-slate-700"
                  :class="openGroups[item.label] ? 'my-1' : ''"
                >
                  <li v-for="child in item.children" :key="child.to">
                    <RouterLink
                      :to="child.to"
                      :tabindex="openGroups[item.label] ? 0 : -1"
                      :aria-current="isPathActive(child.to) ? 'page' : undefined"
                      :class="[
                        '-ml-px block border-l-2 py-2 pl-4 pr-3 text-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white',
                        isPathActive(child.to)
                          ? 'border-bis-600 font-medium text-white'
                          : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-white',
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
    <div class="shrink-0 border-t border-slate-800 p-3">
      <div class="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
        <div class="relative shrink-0">
          <div
            class="grid size-9 place-items-center rounded-full bg-bis-600 text-xs font-semibold text-white ring-1 ring-white/15"
            aria-hidden="true"
          >
            {{ user.initials }}
          </div>
          <span
            class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-slate-900"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0 flex-1 leading-tight">
          <p class="truncate text-sm font-medium text-white">{{ user.name }}</p>
          <p class="truncate text-xs text-slate-400">{{ user.office }}</p>
        </div>
        <button
          type="button"
          class="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400"
          @click="emit('sign-out')"
        >
          <BisIcon name="logout" :size="18" />
          <span class="sr-only">Sign out</span>
        </button>
      </div>
    </div>
  </aside>
</template>