/**
 * Resident record access requests.
 * DEVELOPMENT ONLY: requests live in memory and reset on page reload. Replace the three
 * exported functions with API calls; the page only depends on the types below.
 */

export type AccessPurpose =
  'social-services' | 'emergency' | 'data-verification' | 'official-request' | 'other'

export type AccessDuration = '24h' | '3d' | '7d'
export type AccessStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'cancelled'

export interface AccessRequest {
  id: string
  barangayId: string
  barangayName: string
  purpose: AccessPurpose
  subject: string // whose records: a resident, a household, or the criteria
  details: string // why the records are needed
  reference?: string // memo or letter number
  duration: AccessDuration
  status: AccessStatus
  requestedAt: number // ms since epoch
  expiresAt?: number // set once approved
  decisionNote?: string
}

export interface NewAccessRequest {
  barangayId: string
  barangayName: string
  purpose: AccessPurpose
  subject: string
  details: string
  reference?: string
  duration: AccessDuration
}

export const purposeLabels: Record<AccessPurpose, string> = {
  'social-services': 'Social services or assistance program',
  emergency: 'Disaster or emergency response',
  'data-verification': 'Verifying reported data',
  'official-request': 'Official or legal request',
  other: 'Other (explain below)',
}

export const durationLabels: Record<AccessDuration, string> = {
  '24h': '24 hours',
  '3d': '3 days',
  '7d': '7 days',
}

const HOUR = 3_600_000
const DAY = 24 * HOUR
const now = Date.now()

let requests: AccessRequest[] = [
  {
    id: 'req-1004',
    barangayId: 'san-jose',
    barangayName: 'San Jose',
    purpose: 'data-verification',
    subject: '14 households flagged as duplicates',
    details:
      'Verify the duplicate household entries listed in the latest data quality report before the monthly consolidation.',
    reference: 'DQ-2026-10',
    duration: '3d',
    status: 'pending',
    requestedAt: now - 3 * HOUR,
  },
  {
    id: 'req-1003',
    barangayId: 'poblacion',
    barangayName: 'Poblacion',
    purpose: 'social-services',
    subject: 'One household applying for senior assistance',
    details:
      'Confirm household members and ages for an assistance application endorsed by the barangay.',
    duration: '3d',
    status: 'approved',
    requestedAt: now - 2 * DAY,
    expiresAt: now + DAY,
  },
  {
    id: 'req-1002',
    barangayId: 'burgos',
    barangayName: 'Burgos',
    purpose: 'other',
    subject: 'All residents',
    details: 'Needed for general review of the barangay.',
    duration: '7d',
    status: 'denied',
    requestedAt: now - 6 * DAY,
    decisionNote: 'Purpose is too broad. Narrow the request to specific households or residents.',
  },
  {
    id: 'req-1001',
    barangayId: 'mabini',
    barangayName: 'Mabini',
    purpose: 'emergency',
    subject: 'Households in the low-lying purok',
    details: 'Pre-evacuation check of household composition ahead of the typhoon warning.',
    duration: '24h',
    status: 'approved',
    requestedAt: now - 10 * DAY,
    expiresAt: now - 9 * DAY,
  },
]

const wait = () => new Promise((resolve) => setTimeout(resolve, 300)) // pretend network delay
const newestFirst = () => [...requests].sort((a, b) => b.requestedAt - a.requestedAt)

/** An approval whose time is up counts as expired. */
export function effectiveStatus(r: AccessRequest): AccessStatus {
  return r.status === 'approved' && r.expiresAt !== undefined && r.expiresAt <= Date.now()
    ? 'expired'
    : r.status
}

export async function getAccessRequests(): Promise<AccessRequest[]> {
  await wait()
  return newestFirst()
}

export async function createAccessRequest(input: NewAccessRequest): Promise<AccessRequest> {
  await wait()
  const request: AccessRequest = {
    ...input,
    id: `req-${1005 + requests.length - 4}`,
    status: 'pending',
    requestedAt: Date.now(),
  }
  requests = [request, ...requests]
  return request
}

export async function cancelAccessRequest(id: string): Promise<void> {
  await wait()
  requests = requests.map((r) =>
    r.id === id && r.status === 'pending' ? { ...r, status: 'cancelled' } : r,
  )
}
