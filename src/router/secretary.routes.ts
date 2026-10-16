import type { RouteRecordRaw } from 'vue-router'

// const ModulePlaceholder = () => import('@/views/ui/pages/secretary/module-placeholder.vue')

/** Every sidebar link gets a working route; swap `component` as you build each module. */
// function placeholder(
//   path: string,
//   name: string,
//   title: string,
//   description: string,
// ): RouteRecordRaw {
//   return { path, name, component: ModulePlaceholder, meta: { title, description } }
// }

export const secretaryRoutes: RouteRecordRaw = {
  path: '/secretary',
  component: () => import('@/components/layout/secretary/layout.vue'),
  // Read these in a global beforeEach guard (see README snippet in chat).
  meta: { requiresAuth: true, roles: ['secretary'] },
  children: [
    {
      path: '',
      name: 'secretary.dashboard',
      component: () => import('@/views/ui/pages/secretary/dashboard.vue'),
      meta: { title: 'Analytics & Overview' },
    },
    {
      path: 'residents',
      name: 'secretary.residents',
      component: () => import('@/views/ui/pages/secretary/resident/resident-records.vue'),
      meta: { title: 'Resident records' },
    },
    {
      path: 'residents/new',
      name: 'secretary.resident.new',
      component: () => import('@/views/ui/pages/secretary/resident/resident-add.vue'),
      meta: { title: 'New resident' },
    },
    {
      path: 'residents/:id/edit',
      name: 'secretary.resident.edit',
      component: () => import('@/views/ui/pages/secretary/resident/resident-edit.vue'),
      meta: { title: 'Resident profile' },
    },
    {
      path: 'households',
      name: 'secretary.households',
      component: () => import('@/views/ui/pages/secretary/household/household-records.vue'),
      meta: { title: 'Household records' },
    },
    {
      path: 'households/new',
      name: 'secretary.household.new',
      component: () => import('@/views/ui/pages/secretary/household/household-add.vue'),
      meta: { title: 'New household' },
    },
    {
      path: 'households/:id/edit',
      name: 'secretary.household.edit',
      component: () => import('@/views/ui/pages/secretary/household/household-edit.vue'),
      meta: { title: 'Household profile' },
    },
    {
      path: 'statistics',
      name: 'secretary.demographics',
      component: () => import('@/views/ui/pages/secretary/demographics/resident-demographics.vue'),
      meta: { title: 'Demographics' },
    },

    {
      path: 'certifications',
      children: [
        { path: '', redirect: '/secretary/certifications/requests' },
        {
          path: 'requests',
          component: () => import('@/views/ui/pages/secretary/certifications/request-page.vue'),
          props: { mode: 'queue' },
        },
        {
          path: 'records',
          component: () => import('@/views/ui/pages/secretary/certifications/request-page.vue'),
          props: { mode: 'records' },
        },
        {
          path: 'print/:id',
          component: () =>
            import('@/views/ui/pages/secretary/certifications/certificate-print-page.vue'),
        },
        {
          path: ':type(clearance|residency|indigency|business)',
          component: () =>
            import('@/views/ui/pages/secretary/certifications/certificate-form-page.vue'),
        },
      ],
    },
    {
      path: 'animals',
      children: [
        { path: '', redirect: '/secretary/animals/registry' },
        {
          path: 'registry',
          component: () => import('@/views/ui/pages/secretary/animals/animal-registry-page.vue'),
        },
        {
          path: 'registry/new',
          component: () => import('@/views/ui/pages/secretary/animals/animal-form-page.vue'),
        },
        {
          path: 'registry/:id/edit',
          component: () => import('@/views/ui/pages/secretary/animals/animal-form-page.vue'),
        },
        {
          path: 'registry/print/:id',
          component: () => import('@/views/ui/pages/secretary/animals/animal-print-page.vue'),
        },
        {
          path: 'vaccinations',
          component: () =>
            import('@/views/ui/pages/secretary/animals/animal-vaccinations-page.vue'),
        },
        {
          path: 'vaccinations/drive',
          component: () =>
            import('@/views/ui/pages/secretary/animals/animal-vaccinations-drive-page.vue'),
        },
        {
          path: 'bites',
          component: () =>
            import('@/views/ui/pages/secretary/animals/animal-bite-incidents-page.vue'),
        },
        {
          path: 'bites/new',
          component: () =>
            import('@/views/ui/pages/secretary/animals/animal-bite-incidents-form-page.vue'),
        },
        {
          path: 'bites/:id/edit',
          component: () =>
            import('@/views/ui/pages/secretary/animals/animal-bite-incidents-form-page.vue'),
        },
      ],
    },
    // Demographics > Certifications
    // placeholder(
    //   'certifications/clearance',
    //   'secretary.cert.clearance',
    //   'Barangay Clearance',
    //   'Issue and track barangay clearances.',
    // ),
    // placeholder(
    //   'certifications/residency',
    //   'secretary.cert.residency',
    //   'Certificate of Residency',
    //   'Issue certificates of residency.',
    // ),
    // placeholder(
    //   'certifications/indigency',
    //   'secretary.cert.indigency',
    //   'Certificate of Indigency',
    //   'Issue certificates of indigency.',
    // ),
    // placeholder(
    //   'certifications/barangay-id',
    //   'secretary.cert.id',
    //   'Barangay ID',
    //   'Issue and renew barangay IDs.',
    // ),

    // Justice & Security
    // placeholder(
    //   'blotter-records',
    //   'secretary.blotter',
    //   'Blotter Records',
    //   'Incident reports and case resolution.',
    // ),
    // placeholder('vawc-cases', 'secretary.vawc', 'VAWC Cases', 'Confidential VAWC case handling.'),
    {
      path: 'cases',
      children: [
        { path: '', redirect: '/secretary/cases/blotter' },
        {
          path: 'blotter',
          component: () => import('@/views/ui/pages/secretary/blotter/blotter-record-page.vue'),
        },
        {
          path: 'blotter/new',
          component: () => import('@/views/ui/pages/secretary/blotter/blotter-form-page.vue'),
        },
        {
          path: 'blotter/:id/edit',
          component: () => import('@/views/ui/pages/secretary/blotter/blotter-form-page.vue'),
        },
        {
          path: 'vawc',
          component: () => import('@/views/ui/pages/secretary/animals/animal-registry-page.vue'),
        },
      ],
    },

    {
      path: 'vawc',
      children: [
        { path: '', redirect: '/secretary/vawc/cases' },
        {
          path: 'cases',
          component: () => import('@/views/ui/pages/secretary/vawc/vawc-record-page.vue'),
        },
        // keep this above ':id/edit'
        {
          path: 'cases/new',
          component: () => import('@/views/ui/pages/secretary/vawc/vawc-form-page.vue'),
        },
        {
          path: 'cases/:id/edit',
          component: () => import('@/views/ui/pages/secretary/vawc/vawc-form-page.vue'),
        },
      ],
    },
    {
      path: 'reports',
      component: () => import('@/views/ui/pages/secretary/reports/report-generator.vue'),
    },
    {
      path: 'logs',
      component: () => import('@/views/ui/pages/secretary/reports/audit-log.vue'),
    },

    // System Governance
  ],
}
