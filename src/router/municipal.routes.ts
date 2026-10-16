import type { RouteRecordRaw } from 'vue-router'

// Every sidebar link gets a working route now; swap `component` as you build each page.
const ComingSoon = () => import('@/views/others/coming-soon.vue')

function placeholder(path: string, name: string, title: string): RouteRecordRaw {
  return { path, name, component: ComingSoon, meta: { title } }
}

export const municipalRoutes: RouteRecordRaw = {
  path: '/municipal',
  component: () => import('@/components/layout/municipal/layout.vue'),
  // Read by the global beforeEach guard in router/index.ts.
  meta: { requiresAuth: true, roles: ['municipal'] },
  children: [
    // Overview
    {
      path: '',
      name: 'municipal.dashboard',
      component: () => import('@/views/ui/pages/municipal/dashboard.vue'),
      meta: { title: 'Municipal overview' },
    },

    // 1. Barangay management
    // Static paths first; ':id' must stay last so it never swallows 'officials', 'updates', etc.
    {
      path: 'barangays',
      name: 'municipal.barangays',
      component: () => import('@/views/ui/pages/municipal/brgymgmt/barangays.vue'),
      meta: { title: 'All barangays' },
    },
    {
      path: 'barangays/officials',
      name: 'municipal.barangays.officials',
      component: () => import('@/views/ui/pages/municipal/brgymgmt/officials.vue'),
      meta: { title: 'Barangay officials and contacts' },
    },
    {
      path: 'barangays/submissions',
      name: 'municipal.barangays.submissions',
      component: () => import('@/views/ui/pages/municipal/brgymgmt/submissions.vue'),
      meta: { title: 'Submitted profiles and reports' },
    },
    {
      path: 'barangays/updates',
      name: 'municipal.barangays.updates',
      component: () => import('@/views/ui/pages/municipal/brgymgmt/updates.vue'),
      meta: { title: 'Data update tracker' },
    },
    {
      path: 'population',
      name: 'municipal.population',
      component: () => import('@/views/ui/pages/municipal/population/population-overview.vue'),
      meta: { title: 'Population overview' },
    },

    // placeholder(
    //   'barangays/officials',
    //   'municipal.barangays.officials',
    //   'Barangay officials and contacts',
    // ),
    // placeholder(
    //   'barangays/submissions',
    //   'municipal.barangays.submissions',
    //   'Submitted profiles and reports',
    // ),

    {
      path: 'barangays/:id',
      name: 'municipal.barangay.details',
      component: () => import('@/views/ui/pages/municipal/brgymgmt/barangay-profile.vue'),
      meta: { title: 'Barangay profile' },
    },

    {
      path: 'population/access',
      name: 'municipal.population.access',
      component: () => import('@/views/ui/pages/municipal/population/records-access.vue'),
      meta: { title: 'Resident record access' },
    },

    {
      path: 'user/access/audit',
      name: 'municipal.user.access.audit',
      component: () => import('@/views/ui/pages/municipal/useraccess/audit.vue'),
      meta: { title: 'Resident record access' },
    },
    {
      path: 'population/households',
      name: 'municipal.households',
      component: () => import('@/views/ui/pages/municipal/population/households.vue'),
      meta: { title: 'Households' },
    },

    {
      path: 'population/age-sex',
      name: 'municipal.population.agesex',
      component: () => import('@/views/ui/pages/municipal/population/age-sex.vue'),
      meta: { title: 'Age and sex' },
    },
    {
      path: 'population/sectors',
      name: 'municipal.population.sectors',
      component: () => import('@/views/ui/pages/municipal/population/sectors.vue'),
      meta: { title: 'Sectors' },
    },

    // 2. Population and household statistics (aggregated by default)
    // placeholder('population', 'municipal.population', 'Population overview'),
    // placeholder('population/households', 'municipal.population.households', 'Household statistics'),
    // placeholder('population/age-sex', 'municipal.population.agesex', 'Age and sex'),
    // placeholder('population/sectors', 'municipal.population.sectors', 'Sectors'),
    // Individual resident records: opened only with a stated, authorized purpose.
    // placeholder('population/access', 'municipal.population.access', 'Resident record access'),

    // 3. Reports and analytics
    placeholder('reports', 'municipal.reports', 'Generate report'),
    placeholder('reports/compare', 'municipal.reports.compare', 'Compare barangays'),
    placeholder('reports/data-quality', 'municipal.reports.quality', 'Data quality'),
    placeholder('reports/exports', 'municipal.reports.exports', 'Exported reports'),

    // 4. Document management and tracking
    { path: 'documents', redirect: '/municipal/documents/incoming' },
    placeholder('documents/incoming', 'municipal.documents.incoming', 'Incoming from barangays'),
    placeholder('documents/outgoing', 'municipal.documents.outgoing', 'Outgoing documents'),
    placeholder('documents/approvals', 'municipal.documents.approvals', 'Approvals and deadlines'),
    placeholder('documents/municipal', 'municipal.documents.municipal', 'Municipal documents'),
    placeholder('documents/archive', 'municipal.documents.archive', 'Document archive'),

    // 7. User and access management
    { path: 'access', redirect: '/municipal/access/staff' },
    placeholder('access/staff', 'municipal.access.staff', 'Municipal staff'),
    placeholder('access/roles', 'municipal.access.roles', 'Roles and permissions'),
    placeholder('access/accounts', 'municipal.access.accounts', 'Barangay accounts'),
    placeholder('access/logins', 'municipal.access.logins', 'Login activity'),
    placeholder('access/audit', 'municipal.access.audit', 'Audit trail'),
  ],
}
