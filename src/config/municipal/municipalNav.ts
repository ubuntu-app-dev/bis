import type { NavItem } from '@/config/secretary/secretaryNav.ts'

/** NavItem plus an optional count/label pill, e.g. { label: 'Barangays', badge: 24 }. */
export type MunicipalNavItem = NavItem & { badge?: string | number }

export interface MunicipalNavSection {
  title: string
  items: MunicipalNavItem[]
}

/**
 * Municipal level = consolidated, cross-barangay view.
 * Icon names come from src/icons/bisIcons.ts.
 * Each group is one municipal module; its children are the pages inside it.
 */
export const municipalNav: MunicipalNavSection[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', icon: 'grid', to: '/municipal' }],
  },
  {
    title: 'Data and reporting',
    items: [
      {
        label: 'Barangay management',
        icon: 'building',
        children: [
          { label: 'All barangays', to: '/municipal/barangays' },
          { label: 'Officials and contacts', to: '/municipal/barangays/officials' },
          { label: 'Submitted profiles', to: '/municipal/barangays/submissions' },
          { label: 'Data update tracker', to: '/municipal/barangays/updates' },
        ],
      },
      {
        label: 'Population and households',
        icon: 'users',
        children: [
          { label: 'Population overview', to: '/municipal/population' },
          { label: 'Households', to: '/municipal/population/households' },
          { label: 'Age and sex', to: '/municipal/population/age-sex' },
          { label: 'Sectors', to: '/municipal/population/sectors' },
          { label: 'Resident record access', to: '/municipal/population/access' },
        ],
      },
      {
        label: 'Reports and analytics',
        icon: 'barChart',
        children: [
          { label: 'Generate report', to: '/municipal/reports' },
          { label: 'Compare barangays', to: '/municipal/reports/compare' },
          { label: 'Data quality', to: '/municipal/reports/data-quality' },
          { label: 'Exported reports', to: '/municipal/reports/exports' },
        ],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        label: 'Document management',
        icon: 'file',
        children: [
          { label: 'Incoming from barangays', to: '/municipal/documents/incoming' },
          { label: 'Outgoing', to: '/municipal/documents/outgoing' },
          { label: 'Approvals and deadlines', to: '/municipal/documents/approvals' },
          { label: 'Municipal documents', to: '/municipal/documents/municipal' },
          { label: 'Archive', to: '/municipal/documents/archive' },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'User and access',
        icon: 'shield',
        children: [
          { label: 'Municipal staff', to: '/municipal/access/staff' },
          { label: 'Roles and permissions', to: '/municipal/access/roles' },
          { label: 'Barangay accounts', to: '/municipal/access/accounts' },
          { label: 'Login activity', to: '/municipal/access/logins' },
          { label: 'Audit trail', to: '/municipal/user/access/audit' },
        ],
      },
    ],
  },
]
