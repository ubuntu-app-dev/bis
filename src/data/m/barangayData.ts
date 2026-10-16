import { getMunicipalDashboard } from './dashboardData'

/**
 * Barangay management data.
 * DEVELOPMENT ONLY: sample officials, contacts and statuses. Population, households and
 * "records updated" come from dashboardData.ts so both pages always agree.
 * Replace getBarangays() with your API call; the page only depends on BarangayRecord.
 */

export type AccountStatus = 'active' | 'suspended' | 'pending'
export type Freshness = 'current' | 'due' | 'overdue'

export interface BarangayRecord {
  id: string
  name: string
  captain: string
  contact: string
  accountStatus: AccountStatus
  completeness: number // 0 to 100, share of required profile fields filled in
  pendingReviews: number // submitted profiles or reports waiting for municipal review
  population: number
  households: number
  recordsUpdatedDaysAgo: number
}

/** Same thresholds as the dashboard: 7 days is current, over 30 is overdue. */
export function freshnessOf(daysAgo: number): Freshness {
  return daysAgo <= 7 ? 'current' : daysAgo <= 30 ? 'due' : 'overdue'
}

type Extra = Pick<
  BarangayRecord,
  'captain' | 'contact' | 'accountStatus' | 'completeness' | 'pendingReviews'
>

const extras: Record<string, Extra> = {
  poblacion: {
    captain: 'Maria Santos',
    contact: '(075) 555-0101',
    accountStatus: 'active',
    completeness: 96,
    pendingReviews: 1,
  },
  'san-isidro': {
    captain: 'Jose Ramos',
    contact: '(075) 555-0102',
    accountStatus: 'active',
    completeness: 88,
    pendingReviews: 0,
  },
  'santa-maria': {
    captain: 'Ana Villanueva',
    contact: '(075) 555-0103',
    accountStatus: 'active',
    completeness: 94,
    pendingReviews: 2,
  },
  'san-jose': {
    captain: 'Pedro Aquino',
    contact: '(075) 555-0104',
    accountStatus: 'active',
    completeness: 79,
    pendingReviews: 1,
  },
  'bagong-silang': {
    captain: 'Rosa Mendoza',
    contact: '(075) 555-0105',
    accountStatus: 'active',
    completeness: 91,
    pendingReviews: 3,
  },
  mabini: {
    captain: 'Carlos Bautista',
    contact: '(075) 555-0106',
    accountStatus: 'active',
    completeness: 99,
    pendingReviews: 0,
  },
  rizal: {
    captain: 'Elena Castillo',
    contact: '(075) 555-0107',
    accountStatus: 'active',
    completeness: 61,
    pendingReviews: 0,
  },
  'del-pilar': {
    captain: 'Ramon Flores',
    contact: '(075) 555-0108',
    accountStatus: 'active',
    completeness: 83,
    pendingReviews: 1,
  },
  burgos: {
    captain: 'Luz Navarro',
    contact: '(075) 555-0109',
    accountStatus: 'suspended',
    completeness: 54,
    pendingReviews: 0,
  },
  magsaysay: {
    captain: 'Dante Reyes',
    contact: '(075) 555-0110',
    accountStatus: 'active',
    completeness: 90,
    pendingReviews: 0,
  },
}

export async function getBarangays(): Promise<BarangayRecord[]> {
  const { barangays } = await getMunicipalDashboard()
  return barangays.map((b) => ({
    id: b.id,
    name: b.name,
    population: b.population,
    households: b.households,
    recordsUpdatedDaysAgo: b.recordsUpdatedDaysAgo,
    ...(extras[b.id] ?? {
      captain: 'Not set',
      contact: 'Not set',
      accountStatus: 'pending' as const,
      completeness: 0,
      pendingReviews: 0,
    }),
  }))
}

// ---------------------------------------------------------------------------
// Barangay profile (one barangay)
// DEVELOPMENT ONLY: officials, checklist and submissions below are generated sample data.
// ---------------------------------------------------------------------------

export interface Official {
  role: string
  name: string
  contact?: string
}

export interface ChecklistItem {
  label: string
  done: boolean
}

export type SubmissionStatus = 'pending' | 'approved' | 'returned'

export interface Submission {
  id: string
  title: string
  daysAgo: number
  status: SubmissionStatus
  note?: string
}

export interface BarangayProfile extends BarangayRecord {
  email: string
  childrenPct: number
  seniorsPct: number
  malePct: number
  certificatesThisMonth: number
  openCases: number
  officials: Official[]
  councilSize: number
  checklist: ChecklistItem[]
  submissions: Submission[]
}

const FIRST = [
  'Mario',
  'Liza',
  'Dennis',
  'Grace',
  'Rey',
  'Josefa',
  'Noel',
  'Carmen',
  'Arnel',
  'Tessa',
  'Bong',
  'Lourdes',
]
const LAST = [
  'Garcia',
  'Cruz',
  'Torres',
  'Domingo',
  'Salvador',
  'Ocampo',
  'Lim',
  'Pascual',
  'Santiago',
  'Soriano',
  'Dizon',
  'Valdez',
]
const CHECKLIST_LABELS = [
  'Barangay profile details',
  'Officials and contacts',
  'Resident records',
  'Household records',
  'Monthly report',
  'Certificate log',
  'Animal registry',
  'Case summaries',
]
const SUBMISSION_TITLES = ['Monthly report', 'Resident data update', 'Barangay profile']

const hashOf = (id: string) => [...id].reduce((t, c) => t + c.charCodeAt(0), 0)
const pick = (list: string[], n: number) => list[n % list.length]

/** Returns null when no barangay has this id. */
export async function getBarangayProfile(id: string): Promise<BarangayProfile | null> {
  const { barangays } = await getMunicipalDashboard()
  const b = barangays.find((x) => x.id === id)
  if (!b) return null

  const e: Extra = extras[id] ?? {
    captain: 'Not set',
    contact: 'Not set',
    accountStatus: 'pending',
    completeness: 0,
    pendingReviews: 0,
  }
  const h = hashOf(id)

  const officials: Official[] = [
    { role: 'Punong Barangay', name: e.captain, contact: e.contact },
    {
      role: 'Barangay Secretary',
      name: `${pick(FIRST, h)} ${pick(LAST, h * 3)}`,
      contact: `secretary.${id}@barangay.example`,
    },
    {
      role: 'Barangay Treasurer',
      name: `${pick(FIRST, h + 5)} ${pick(LAST, h * 5 + 1)}`,
      contact: undefined,
    },
    {
      role: 'SK Chairperson',
      name: `${pick(FIRST, h + 7)} ${pick(LAST, h * 7 + 2)}`,
      contact: undefined,
    },
  ]

  // Sample rule: the first N sections are complete, where N follows the completeness percentage.
  const doneCount = Math.round((CHECKLIST_LABELS.length * e.completeness) / 100)
  const checklist = CHECKLIST_LABELS.map((label, i) => ({ label, done: i < doneCount }))

  const submissions: Submission[] = []
  for (let i = 0; i < e.pendingReviews; i++) {
    submissions.push({
      id: `${id}-pending-${i}`,
      title: pick(SUBMISSION_TITLES, h + i),
      daysAgo: 1 + i * 2,
      status: 'pending',
    })
  }
  if (e.completeness < 70) {
    submissions.push({
      id: `${id}-returned`,
      title: 'Barangay profile',
      daysAgo: 12,
      status: 'returned',
      note: 'Returned for missing officials and household records',
    })
  }
  submissions.push(
    { id: `${id}-approved-1`, title: 'Monthly report', daysAgo: 33, status: 'approved' },
    { id: `${id}-approved-2`, title: 'Resident data update', daysAgo: 61, status: 'approved' },
  )
  submissions.sort((x, y) => x.daysAgo - y.daysAgo)

  return {
    id: b.id,
    name: b.name,
    population: b.population,
    households: b.households,
    recordsUpdatedDaysAgo: b.recordsUpdatedDaysAgo,
    childrenPct: b.childrenPct,
    seniorsPct: b.seniorsPct,
    malePct: b.malePct,
    certificatesThisMonth: b.certificatesThisMonth,
    openCases: b.openCases,
    ...e,
    email: `${id}@barangay.example`,
    officials,
    councilSize: 7,
    checklist,
    submissions,
  }
}
