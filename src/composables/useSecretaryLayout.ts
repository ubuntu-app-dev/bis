import { computed, ref } from 'vue'

const DESKTOP_BREAKPOINT = 1024 // Tailwind "lg"

// Module-level refs so the header, sidebar and layout all share one state.
const isDesktop = ref(typeof window === 'undefined' ? true : window.innerWidth >= DESKTOP_BREAKPOINT)
const isMobileOpen = ref(false)
const isCollapsed = ref(false)

export function useSecretaryLayout() {
  /** Desktop: visible unless collapsed. Mobile: visible only while the drawer is open. */
  const isSidebarVisible = computed(() => (isDesktop.value ? !isCollapsed.value : isMobileOpen.value))

  function syncViewport() {
    isDesktop.value = window.innerWidth >= DESKTOP_BREAKPOINT
    if (isDesktop.value) isMobileOpen.value = false
  }

  function toggleSidebar() {
    if (isDesktop.value) isCollapsed.value = !isCollapsed.value
    else isMobileOpen.value = !isMobileOpen.value
  }

  function closeMobile() {
    isMobileOpen.value = false
  }

  return {
    isDesktop,
    isMobileOpen,
    isCollapsed,
    isSidebarVisible,
    syncViewport,
    toggleSidebar,
    closeMobile,
  }
}
