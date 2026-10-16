import { getMunicipalDashboard } from './dashboardData'

/**
 * Municipal audit trail: record changes, record access, administrative actions and reports.
 * DEVELOPMENT ONLY: events are generated sample data. Replace getAuditEvents() and
 * addAuditEvent() with API calls. The server should write audit entries itself; the page
 * should never be the only thing that records an action.
 */

export type AuditCategory = 'record-change' | 'record-access' | 'admin' | 'report'
export type AuditOutcome = 'success' | 'failed' | 'denied'

export interface AuditChange {
  field: string
  from: string
  to: string
}

export interface AuditEvent {
  id: string
  at: number // ms since epoch
  actorName: string
  actorRole: string
  category: AuditCategory
  action: string
  target: string
  barangayId?: string
  barangayName?: string
  outcome: AuditOutcome
  note?: string
  changes?: AuditChange[]
}

export const categoryLabels: Record<AuditCategory, string> = {
  'record-change': 'Record change',
  'record-access': 'Record access',
  admin: 'Administrative',
  report: 'Report',
}

const MUNICIPAL_STAFF = ['Municipal Officer', 'Records Reviewer', 'System Administrator']

type Builder = (
  i: number,
  b: { id: string; name: string },
) => Omit<AuditEvent, 'id' | 'at' | 'barangayId' | 'barangayName'> & { noBarangay?: boolean }

const secretary = (b: { name: string }) => ({
  actorName: `Secretary, ${b.name}`,
  actorRole: 'Barangay secretary',
})
const staff = (i: number) => ({ actorName: MUNICIPAL_STAFF[i % 3], actorRole: 'Municipal staff' })
const code = (prefix: string, i: number, mod: number, base: number) =>
  `${prefix}-${base + ((i * 37) % mod)}`

const builders: Builder[] = [
  (i, b) => ({
    ...secretary(b),
    category: 'record-change',
    action: 'Updated a resident record',
    target: `Resident ${code('R', i, 900, 10000)}`,
    outcome: 'success',
    changes: [{ field: 'Address', from: 'Purok 2', to: 'Purok 4' }],
  }),
  (i, b) => ({
    ...secretary(b),
    category: 'record-change',
    action: 'Added a household',
    target: `Household ${code('HH', i, 400, 1000)}`,
    outcome: 'success',
    note: 'New household with 5 members',
  }),
  (i, b) => ({
    ...secretary(b),
    category: 'record-change',
    action: 'Archived a household record',
    target: `Household ${code('HH', i, 400, 1000)}`,
    outcome: 'success',
    note: 'Reason: moved out of the barangay',
    changes: [{ field: 'Status', from: 'Active', to: 'Archived' }],
  }),
  (_i, b) => ({
    ...staff(1),
    category: 'admin',
    action: 'Reset a barangay account password',
    target: `Account: ${b.name}`,
    outcome: 'success',
  }),
  () => ({
    ...staff(2),
    category: 'admin',
    action: 'Changed a staff role',
    target: 'Staff: Records Reviewer',
    outcome: 'success',
    noBarangay: true,
    changes: [{ field: 'Role', from: 'Viewer', to: 'Reviewer' }],
  }),
  (i) => ({
    ...staff(1),
    category: 'record-access',
    action: 'Approved a record access request',
    target: `Request req-${1001 + (i % 4)}`,
    outcome: 'success',
  }),
  (i) => ({
    ...staff(0),
    category: 'record-access',
    action: 'Tried to open resident records without approval',
    target: `Resident ${code('R', i, 900, 10000)}`,
    outcome: 'denied',
    note: 'No active access request for this barangay',
  }),
  () => ({
    ...staff(0),
    category: 'record-access',
    action: 'Opened resident records under an approved request',
    target: 'Request req-1003',
    outcome: 'success',
  }),
  () => ({
    ...staff(0),
    category: 'report',
    action: 'Generated a municipal report',
    target: 'Monthly population summary',
    outcome: 'success',
    noBarangay: true,
  }),
  () => ({
    ...staff(0),
    category: 'report',
    action: 'Exported a report to PDF',
    target: 'Barangay comparison',
    outcome: 'success',
    noBarangay: true,
  }),
  () => ({
    ...staff(1),
    category: 'report',
    action: 'Approved a barangay submission',
    target: 'Monthly report',
    outcome: 'success',
  }),
  () => ({
    ...staff(1),
    category: 'report',
    action: 'Returned a barangay submission',
    target: 'Barangay profile',
    outcome: 'success',
    note: 'Returned for a missing officials list',
  }),
  () => ({
    ...staff(0),
    category: 'report',
    action: 'Export failed',
    target: 'Household statistics (Excel)',
    outcome: 'failed',
    noBarangay: true,
    note: 'The file was too large. Narrow the filters and try again.',
  }),
]

let cache: AuditEvent[] | null = null

async function build(): Promise<AuditEvent[]> {
  const { barangays } = await getMunicipalDashboard()
  const now = Date.now()
  const events: AuditEvent[] = []
  for (let i = 0; i < 48; i++) {
    const b = barangays[(i * 3) % barangays.length]
    const { noBarangay, ...event } = builders[(i * 5 + (i >> 2)) % builders.length](i, b)
    const minutesAgo = Math.round(12 + i * i * 7 + i * 40)
    events.push({
      ...event,
      id: `evt-${5000 - i}`,
      at: now - minutesAgo * 60_000,
      barangayId: noBarangay ? undefined : b.id,
      barangayName: noBarangay ? undefined : b.name,
    })
  }
  return events
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  await new Promise((resolve) => setTimeout(resolve, 300)) // pretend network delay
  cache ??= await build()
  return [...cache].sort((a, b) => b.at - a.at)
}

/** Records an action taken on the audit page itself, such as exporting the trail. */
export async function addAuditEvent(event: Omit<AuditEvent, 'id' | 'at'>): Promise<AuditEvent> {
  cache ??= await build()
  const created: AuditEvent = { ...event, id: `evt-${5001 + cache.length - 48}`, at: Date.now() }
  cache = [created, ...cache]
  return created
}
