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
    ],
  },
  {
    title: 'Certifications',
    items: [
      { label: 'Requests', icon: 'inbox', to: '/secretary/certifications/requests' },
      {
        label: 'Certificates',
        icon: 'certificate',
        children: [
          { label: 'Barangay Clearance', to: '/secretary/certifications/clearance' },
          { label: 'Certificate of Residency', to: '/secretary/certifications/residency' },
          { label: 'Certificate of Indigency', to: '/secretary/certifications/indigency' },
          { label: 'Business Clearance', to: '/secretary/certifications/business' },
        ],
      },
      { label: 'Issued Records', icon: 'archive', to: '/secretary/certifications/records' },
    ],
  },
  {
    title: 'Animals',
    items: [
      { label: 'Animal registry', icon: 'paw', to: '/secretary/animals/registry' },
      { label: 'Vaccinations', icon: 'syringe', to: '/secretary/animals/vaccinations' },
      { label: 'Bite incidents', icon: 'alert', to: '/secretary/animals/bites' },
    ],
  },
  {
    title: 'Peace and Order',
    items: [
      { label: 'Blotter Records', icon: 'scale', to: '/secretary/cases/blotter' },
      { label: 'VAWC Cases', icon: 'shield', to: '/secretary/vawc/cases' },
    ],
  },
  {
    title: 'System Governance',
    items: [
      { label: 'Generate Reports', icon: 'file', to: '/secretary/reports' },
      { label: 'Audit Logs', icon: 'clock', to: '/secretary/logs' },
    ],
  },
]
