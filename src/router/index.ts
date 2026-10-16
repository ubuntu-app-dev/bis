import { createRouter, createWebHistory } from 'vue-router'
import { secretaryRoutes } from './secretary.routes'
import { useAuthStore, HOME_BY_ROLE, type UserRole } from '@/stores/auth'
import { municipalRoutes } from './municipal.routes.ts'

// Temporary landing page for user levels that aren't built yet
const ComingSoon = () => import('@/views/others/coming-soon.vue')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    // Send the bare domain to the login page
    { path: '/', redirect: '/login' },

    // Login
    {
      path: '/login',
      name: 'bis',
      component: () => import('../views/ui/auth/login.vue'),
      meta: {
        title: 'Barangay Information System',
      },
    },

    // Secretary section (layout + every sidebar page)
    secretaryRoutes,
    municipalRoutes,
    // Admin and Municipal: placeholders until you build those sections
    {
      path: '/admin',
      name: 'admin.home',
      component: ComingSoon,
      meta: { title: 'Admin', requiresAuth: true, roles: ['admin'] },
    },
    // {
    //   path: '/municipal',
    //   name: 'municipal.home',
    //   component: ComingSoon,
    //   meta: { title: 'Municipal', requiresAuth: true, roles: ['municipal'] },
    // },
  ],
})

// One guard handles the page title and access control.
router.beforeEach((to) => {
  document.title = `${to.meta.title ?? 'BIS'} | Barangay Information System`

  const auth = useAuthStore()

  // Page needs a login but the user has none -> go to login
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // Page is limited to certain roles and this user's role isn't one of them
  const allowedRoles = to.meta.roles as UserRole[] | undefined
  if (allowedRoles && (!auth.user || !allowedRoles.includes(auth.user.role))) {
    return auth.user ? HOME_BY_ROLE[auth.user.role] : '/login'
  }

  // Already signed in? Skip the login page.
  if (to.name === 'bis' && auth.user) {
    return HOME_BY_ROLE[auth.user.role]
  }
})

export default router
