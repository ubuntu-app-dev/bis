import type { BisIconName } from '@/icons/bisIcons'

export interface NavChild {
  label: string
  to: string
}

export interface NavItem {
  label: string
  icon: BisIconName
  /** Direct link. Leave out when the item has children. */
  to?: string
  /** Expandable sub-menu. */
  children?: NavChild[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

/**
 * Mirrors the sidebar of the offline BIS secretary page.
 * NOTE: the sub-menu entries under "Residents & Stats" and "Certifications"
 * are placeholders. Rename them to match your offline system.
 */
export const secretaryNav: NavSection[] = [
  {
    title: 'Core Dashboard',
    items: [{ label: 'Analytics & Overview', icon: 'grid', to: '/secretary' }],
  },
  {
    title: 'Demographics',
    items: [
      {
        label: 'Residents & Stats',
        icon: 'users',
        children: [
          { label: 'Resident Records', to: '/secretary/residents' },
          { label: 'Households', to: '/secretary/households' },
          { label: 'Demographic Statistics', to: '/secretary/statistics' },
        ],
      },
      {
        label: 'Certifications',
        icon: 'file',
        children: [
          { label: 'Barangay Clearance', to: '/secretary/certifications/clearance' },
          { label: 'Certificate of Residency', to: '/secretary/certifications/residency' },
          { label: 'Certificate of Indigency', to: '/secretary/certifications/indigency' },
          { label: 'Barangay ID', to: '/secretary/certifications/barangay-id' },
        ],
      },
    ],
  },
  {
    title: 'Public Services',
    items: [
      { label: 'Business Licensing', icon: 'store', to: '/secretary/business-licensing' },
      { label: 'Animal Tracking', icon: 'heart', to: '/secretary/animal-tracking' },
    ],
  },
  {
    title: 'Justice & Security',
    items: [
      { label: 'Blotter Records', icon: 'scale', to: '/secretary/blotter-records' },
      { label: 'VAWC Cases', icon: 'shield', to: '/secretary/vawc-cases' },
    ],
  },
  {
    title: 'System Governance',
    items: [
      { label: 'Generate Reports', icon: 'file', to: '/secretary/reports' },
      { label: 'Audit Logs', icon: 'clock', to: '/secretary/audit-logs' },
    ],
  },
]
