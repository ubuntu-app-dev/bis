import { computed, reactive, ref } from 'vue'
import { isoDate } from '@/data/animals'

/*
 * Audit log. Every module calls logAudit() when something is created, changed, viewed in detail,
 * exported or printed.
 *
 * IMPORTANT: this in-memory version only shows the shape. A real audit trail must be written by the
 * server, which stamps the user, the time and the IP address itself, and the log must be append-only
 * (no edit, no delete). A log the browser writes can be bypassed or altered by whoever controls the browser.
 */

export type AuditModule =
  'Blotter' | 'VAWC' | 'Residents' | 'Animals' | 'Bites' | 'Reports' | 'Audit' | 'Account'
export const auditModules: AuditModule[] = [
  'Blotter',
  'VAWC',
  'Residents',
  'Animals',
  'Bites',
  'Reports',
  'Audit',
  'Account',
]

export interface AuditEntry {
  /** e.g. AU-0001 */
  id: string
  /** Full ISO timestamp (UTC). Shown in local time. */
  at: string
  user: string
  role: string
  module: AuditModule
  action: string
  /** The record acted on, e.g. a case number */
  target?: string
  detail?: string
  /** Touches confidential records (VAWC). Highlighted in the log. */
  sensitive?: boolean
}

export type AuditInput = Omit<AuditEntry, 'id' | 'at' | 'user' | 'role'>

/* -------------------------------------------------------------------------- */
/* Who is acting. Call setAuditActor() once after sign-in (e.g. in the layout). */
/* -------------------------------------------------------------------------- */
const actor = ref({ name: 'Lorna Bautista', role: 'Secretary' })
export function setAuditActor(name: string, role: string) {
  actor.value = { name, role }
}

/* -------------------------------------------------------------------------- */
/* Sample entries                                                             */
/* -------------------------------------------------------------------------- */
const year = new Date().getFullYear()
const pad = (n: number) => String(n).padStart(4, '0')

function when(daysAgo: number, hhmm: string) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  const [h, m] = hhmm.split(':').map(Number)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const SEC = { user: 'Lorna Bautista', role: 'Secretary' }
const PB = { user: 'Hon. Ricardo Mercado', role: 'Punong Barangay' }
const STAFF = { user: 'Noel Padilla', role: 'Staff' }

type Seed = Omit<AuditEntry, 'id'>
const seeds: Seed[] = [
  { at: when(0, '09:12'), ...SEC, module: 'Account', action: 'Signed in' },
  {
    at: when(0, '09:20'),
    ...SEC,
    module: 'VAWC',
    action: 'Viewed confidential details',
    target: `VW-${year}-0003`,
    sensitive: true,
  },
  {
    at: when(0, '09:34'),
    ...SEC,
    module: 'VAWC',
    action: 'Record BPO service',
    target: `VW-${year}-0003`,
    detail: 'Served on respondent',
    sensitive: true,
  },
  {
    at: when(1, '16:05'),
    ...SEC,
    module: 'Reports',
    action: 'Generated report',
    target: 'Blotter and Katarungang Pambarangay',
    detail: 'Last month',
  },
  {
    at: when(1, '16:08'),
    ...SEC,
    module: 'Reports',
    action: 'Printed report',
    target: 'Blotter and Katarungang Pambarangay',
  },
  {
    at: when(2, '10:41'),
    ...SEC,
    module: 'VAWC',
    action: 'Created case',
    target: `VW-${year}-0003`,
    sensitive: true,
  },
  {
    at: when(2, '10:55'),
    ...PB,
    module: 'VAWC',
    action: 'Issue BPO',
    target: `VW-${year}-0003`,
    detail: `BPO-${year}-0002 issued by Punong Barangay`,
    sensitive: true,
  },
  { at: when(2, '08:30'), ...PB, module: 'Account', action: 'Signed in' },
  {
    at: when(3, '14:22'),
    ...SEC,
    module: 'Blotter',
    action: 'Created entry',
    target: `BL-${year}-0005`,
  },
  {
    at: when(4, '11:03'),
    ...SEC,
    module: 'Blotter',
    action: 'Record settlement',
    target: `BL-${year}-0002`,
  },
  {
    at: when(5, '15:47'),
    ...STAFF,
    module: 'Residents',
    action: 'Edited resident',
    target: 'RBN-00044',
    detail: 'Changed: contact',
  },
  {
    at: when(6, '09:15'),
    ...STAFF,
    module: 'Bites',
    action: 'Updated outcome',
    target: 'BT-0003',
    detail: 'Under observation',
  },
  {
    at: when(9, '13:10'),
    ...SEC,
    module: 'Blotter',
    action: 'Edited entry',
    target: `BL-${year}-0003`,
    detail: 'Changed: narrative',
  },
  {
    at: when(12, '10:00'),
    ...SEC,
    module: 'Animals',
    action: 'Added vaccination',
    target: 'AN-0004',
    detail: 'Classical swine fever, 8 animals',
  },
  { at: when(14, '08:58'), ...STAFF, module: 'Account', action: 'Signed in' },
  {
    at: when(20, '11:27'),
    ...SEC,
    module: 'VAWC',
    action: 'Created case',
    target: `VW-${year}-0002`,
    sensitive: true,
  },
  {
    at: when(21, '09:40'),
    ...PB,
    module: 'Blotter',
    action: 'Issue certificate to file action',
    target: `BL-${year}-0001`,
    detail: `CFA-${year}-0001, conciliation failed`,
  },
]

const state = reactive<{ items: AuditEntry[]; seq: number }>({
  items: seeds.map((s, i) => ({ ...s, id: `AU-${pad(i + 1)}` })),
  seq: seeds.length,
})

/** Records one event. Safe to call from any store or component. */
export function logAudit(input: AuditInput) {
  state.seq += 1
  state.items.push({
    ...input,
    id: `AU-${pad(state.seq)}`,
    at: new Date().toISOString(),
    user: actor.value.name,
    role: actor.value.role,
  })
}

export function useAudit() {
  /** Newest first */
  const entries = computed(() =>
    [...state.items].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id)),
  )
  const users = computed(() => [...new Set(state.items.map((e) => e.user))].sort())

  return { entries, users, record: logAudit }
}

/** The local calendar date (YYYY-MM-DD) of an entry, for date filters. */
export function entryDate(e: AuditEntry) {
  return isoDate(new Date(e.at))
}

export function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}
