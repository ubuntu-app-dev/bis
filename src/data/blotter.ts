import { computed, reactive } from 'vue'
// TODO: the date helpers and Person type live in the animals/bites modules for now.
// Move them to shared files (e.g. utils/dates.ts, data/people.ts) once a third module needs them.
import { addDays, daysBetween, isoDate, offsetDays } from '@/data/animals'
import type { Person } from '@/data/bites'

export type BlotterStatus =
  | 'Recorded'
  | 'For mediation'
  | 'Pangkat conciliation'
  | 'Settled'
  | 'Certificate issued'
  | 'Referred'
  | 'Withdrawn'

export const OPEN_STATUSES: BlotterStatus[] = ['Recorded', 'For mediation', 'Pangkat conciliation']
export const CLOSED_STATUSES: BlotterStatus[] = ['Certificate issued', 'Referred', 'Withdrawn']

/*
 * Katarungang Pambarangay time limits. These follow the Local Government Code (Sec. 410 and 416),
 * but confirm them against the DILG handbook your barangay follows before relying on the countdowns.
 */
export const MEDIATION_DAYS = 15 // Punong Barangay mediation, counted from the first meeting
export const PANGKAT_DAYS = 15 // Pangkat conciliation, counted from the day it convenes
export const PANGKAT_EXTENSION_DAYS = 15 // one extension is allowed
export const REPUDIATION_DAYS = 10 // a party may repudiate a settlement within this period
const DUE_SOON_DAYS = 3

export const incidentTypes = [
  'Physical injury',
  'Verbal abuse or threats',
  'Theft',
  'Property or boundary dispute',
  'Debt or unpaid obligation',
  'Noise complaint',
  'Trespassing',
  'Damage to property',
  'Animal-related',
  'Family or neighbor quarrel',
  'Other',
]

export const referralTargets = [
  'PNP / police station',
  'Prosecutor or court',
  'MSWDO / social welfare',
  'Other agency',
]

export const certificateReasons = [
  'Mediation failed',
  'Conciliation failed',
  'Respondent failed to appear',
  'Settlement repudiated',
]

export type HearingKind = 'Mediation (Punong Barangay)' | 'Conciliation (Pangkat)' | 'Other'
export type Attendance = 'Both parties' | 'Complainant only' | 'Respondent only' | 'Neither party'
export type HearingResult = 'Continued' | 'Settled' | 'No settlement' | 'Postponed'

export const hearingKinds: HearingKind[] = [
  'Mediation (Punong Barangay)',
  'Conciliation (Pangkat)',
  'Other',
]
export const attendanceOptions: Attendance[] = [
  'Both parties',
  'Complainant only',
  'Respondent only',
  'Neither party',
]
export const hearingResults: HearingResult[] = [
  'Continued',
  'Settled',
  'No settlement',
  'Postponed',
]

export const blotterStatusDot: Record<BlotterStatus, string> = {
  Recorded: 'bg-slate-400',
  'For mediation': 'bg-sky-500',
  'Pangkat conciliation': 'bg-violet-500',
  Settled: 'bg-emerald-500',
  'Certificate issued': 'bg-amber-500',
  Referred: 'bg-orange-500',
  Withdrawn: 'bg-slate-300',
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface Hearing {
  id: string
  /** YYYY-MM-DD */
  date: string
  kind: HearingKind
  attended: Attendance
  result: HearingResult
  notes?: string
}

export interface BlotterEntry {
  /** Entry number, e.g. BL-2026-0001 */
  id: string
  incidentDate: string
  incidentTime?: string
  reportedAt: string
  place: string
  incidentType: string
  narrative: string
  complainants: Person[]
  respondents: Person[]
  witnesses: Person[]
  status: BlotterStatus
  /** Date of the first meeting before the Punong Barangay */
  mediationStart?: string
  /** Date the Pangkat convened */
  pangkatStart?: string
  pangkatExtended?: boolean
  settlementDate?: string
  settlementTerms?: string
  certificateNo?: string
  certificateIssuedAt?: string
  certificateReason?: string
  referredTo?: string
  /** Reason or details when a case is referred or withdrawn */
  closingNote?: string
  hearings: Hearing[]
  remarks?: string
}

export type BlotterInput = Pick<
  BlotterEntry,
  | 'incidentDate'
  | 'incidentTime'
  | 'place'
  | 'incidentType'
  | 'narrative'
  | 'complainants'
  | 'respondents'
  | 'witnesses'
  | 'remarks'
>

/* -------------------------------------------------------------------------- */
/* Names. People under 18 are shown as initials in lists.                     */
/* -------------------------------------------------------------------------- */
export function isMinor(p: Person) {
  return p.age !== undefined && p.age < 18
}

export function displayName(p: Person) {
  return isMinor(p)
    ? p.name
        .split(/\s+/)
        .map((w) => `${w[0]}.`)
        .join(' ')
    : p.name
}

export function partiesLabel(list: Person[]) {
  const [first, ...rest] = list
  if (!first) return '—'
  return rest.length ? `${displayName(first)} +${rest.length}` : displayName(first)
}

/** Full names, for legal forms that need them. */
export function joinNames(list: Person[]) {
  return list.map((p) => p.name).join(', ')
}

/* -------------------------------------------------------------------------- */
/* Deadlines                                                                  */
/* -------------------------------------------------------------------------- */
export type DeadlineState = 'On track' | 'Due soon' | 'Overdue'
export interface Deadline {
  title: string
  due: string
  state: DeadlineState
  text: string
}

function periodOf(e: BlotterEntry): { title: string; due: string } | null {
  if (e.status === 'For mediation' && e.mediationStart) {
    return { title: 'Mediation period', due: addDays(e.mediationStart, MEDIATION_DAYS) }
  }
  if (e.status === 'Pangkat conciliation' && e.pangkatStart) {
    const days = PANGKAT_DAYS + (e.pangkatExtended ? PANGKAT_EXTENSION_DAYS : 0)
    return {
      title: e.pangkatExtended ? 'Pangkat period (extended)' : 'Pangkat period',
      due: addDays(e.pangkatStart, days),
    }
  }
  if (e.status === 'Settled' && e.settlementDate) {
    return { title: 'Repudiation period', due: addDays(e.settlementDate, REPUDIATION_DAYS) }
  }
  return null
}

function countdown(left: number) {
  if (left > 1) return `${left} days left`
  if (left === 1) return '1 day left'
  if (left === 0) return 'Due today'
  return `Overdue by ${-left} ${-left === 1 ? 'day' : 'days'}`
}

export function deadlineOf(e: BlotterEntry): Deadline | null {
  const p = periodOf(e)
  if (!p) return null
  const left = daysBetween(isoDate(), p.due)
  // Once a settlement's repudiation window has passed there is nothing left to chase.
  if (e.status === 'Settled' && left < 0) return { ...p, state: 'On track', text: 'Period ended' }
  return {
    ...p,
    state: left < 0 ? 'Overdue' : left <= DUE_SOON_DAYS ? 'Due soon' : 'On track',
    text: countdown(left),
  }
}

/* -------------------------------------------------------------------------- */
/* Row for lists                                                              */
/* -------------------------------------------------------------------------- */
export interface BlotterRow extends BlotterEntry {
  deadline: Deadline | null
  complainantLabel: string
  respondentLabel: string
  hasMinor: boolean
  haystack: string
}

export function toRow(e: BlotterEntry): BlotterRow {
  const everyone = [...e.complainants, ...e.respondents, ...e.witnesses]
  return {
    ...e,
    deadline: deadlineOf(e),
    complainantLabel: partiesLabel(e.complainants),
    respondentLabel: partiesLabel(e.respondents),
    hasMinor: everyone.some(isMinor),
    haystack:
      `${e.id} ${e.incidentType} ${e.place} ${joinNames(everyone)} ${e.certificateNo ?? ''}`.toLowerCase(),
  }
}

/* -------------------------------------------------------------------------- */
/* Actions. The case moves forward only through these.                        */
/* -------------------------------------------------------------------------- */
export type BlotterAction =
  'mediation' | 'pangkat' | 'extend' | 'settle' | 'certificate' | 'refer' | 'withdraw' | 'hearing'

export const actionLabels: Record<BlotterAction, string> = {
  mediation: 'Start mediation',
  pangkat: 'Start Pangkat',
  extend: 'Extend Pangkat period',
  settle: 'Record settlement',
  certificate: 'Issue certificate to file action',
  refer: 'Refer to another office',
  withdraw: 'Withdraw',
  hearing: 'Log hearing',
}

/** The first action in each list is the natural next step. */
export function availableActions(e: BlotterEntry): BlotterAction[] {
  switch (e.status) {
    case 'Recorded':
      return ['mediation', 'refer', 'withdraw']
    case 'For mediation':
      return ['hearing', 'settle', 'pangkat', 'certificate', 'refer', 'withdraw']
    case 'Pangkat conciliation':
      return e.pangkatExtended
        ? ['hearing', 'settle', 'certificate', 'refer', 'withdraw']
        : ['hearing', 'settle', 'extend', 'certificate', 'refer', 'withdraw']
    case 'Settled':
      // The only way out of a settlement is a repudiation.
      return ['certificate']
    default:
      return []
  }
}

export type ActionPayload =
  | { action: 'mediation'; date: string }
  | { action: 'pangkat'; date: string }
  | { action: 'extend' }
  | { action: 'settle'; date: string; terms: string }
  | { action: 'certificate'; reason: string }
  | { action: 'refer'; target: string; note?: string }
  | { action: 'withdraw'; note?: string }
  | { action: 'hearing'; hearing: Omit<Hearing, 'id'> }

/* -------------------------------------------------------------------------- */
/* Printable forms                                                            */
/* -------------------------------------------------------------------------- */
export type PrintKind = 'extract' | 'summons' | 'settlement' | 'cfa'

/** The forms that make sense at the case's current stage. The first one is the default. */
export function printForms(e: BlotterEntry): { kind: PrintKind; label: string }[] {
  const list: { kind: PrintKind; label: string }[] = [
    { kind: 'extract', label: 'Certified blotter extract' },
  ]
  if (OPEN_STATUSES.includes(e.status))
    list.push({ kind: 'summons', label: 'Summons / notice of hearing' })
  if (e.settlementDate) list.push({ kind: 'settlement', label: 'Amicable settlement' })
  if (e.certificateNo) list.push({ kind: 'cfa', label: 'Certificate to file action' })
  return list
}

/* -------------------------------------------------------------------------- */
/* Store (in memory)                                                          */
/* TODO: replace the function bodies with API calls.                          */
/* -------------------------------------------------------------------------- */
const year = new Date().getFullYear()
const caseNo = (n: number) => `BL-${year}-${String(n).padStart(4, '0')}`

function res(
  residentId: string,
  name: string,
  age: number,
  sex: string,
  purok: number,
  contact?: string,
): Person {
  return { residentId, name, age, sex, address: `Sitio Riverside, Purok ${purok}`, contact }
}
function outsider(name: string, age?: number, sex?: string, address = 'Not given'): Person {
  return { name, age, sex, address }
}

const state = reactive<{ items: BlotterEntry[]; hseq: number }>({
  hseq: 4,
  items: [
    {
      id: caseNo(5),
      incidentDate: offsetDays(-2),
      incidentTime: '21:30',
      reportedAt: offsetDays(-1),
      place: 'Along the main road, Purok 3',
      incidentType: 'Noise complaint',
      status: 'Recorded',
      hearings: [],
      narrative:
        'Complainant reported loud videoke until past midnight on several nights, disturbing the sleep of her children.',
      complainants: [res('R-0012', 'Ana Marie Reyes', 27, 'Female', 3, '0917 555 0112')],
      respondents: [outsider('Unknown neighbor (house beside the sari-sari store)')],
      witnesses: [],
    },
    {
      id: caseNo(4),
      incidentDate: offsetDays(-14),
      reportedAt: offsetDays(-13),
      place: 'Rice field boundary, Purok 5',
      incidentType: 'Property or boundary dispute',
      status: 'For mediation',
      mediationStart: offsetDays(-12),
      narrative:
        'Dispute over the boundary marker between two adjacent rice fields. The respondent moved the marker by about two meters.',
      complainants: [res('R-0031', 'Roberto Villanueva', 64, 'Male', 5, '0917 555 0131')],
      respondents: [res('R-0007', 'Mark Anthony Cruz', 41, 'Male', 1, '0917 555 0107')],
      witnesses: [],
      hearings: [
        {
          id: 'HR-0001',
          date: offsetDays(-12),
          kind: 'Mediation (Punong Barangay)',
          attended: 'Both parties',
          result: 'Continued',
          notes: 'Parties agreed to have the boundary re-measured.',
        },
      ],
    },
    {
      id: caseNo(3),
      incidentDate: offsetDays(-40),
      reportedAt: offsetDays(-39),
      place: 'Respondent’s residence, Purok 2',
      incidentType: 'Debt or unpaid obligation',
      status: 'Pangkat conciliation',
      mediationStart: offsetDays(-33),
      pangkatStart: offsetDays(-20),
      narrative:
        'Complainant lent ₱15,000 to the respondent and has not been repaid after the agreed date.',
      complainants: [res('R-0044', 'Liza Mae Santos', 35, 'Female', 2, '0917 555 0144')],
      respondents: [outsider('Pedro Ramos', 52, 'Male', 'Sitio Bagong Silang, next barangay')],
      witnesses: [],
      hearings: [
        {
          id: 'HR-0002',
          date: offsetDays(-33),
          kind: 'Mediation (Punong Barangay)',
          attended: 'Both parties',
          result: 'No settlement',
        },
        {
          id: 'HR-0003',
          date: offsetDays(-20),
          kind: 'Conciliation (Pangkat)',
          attended: 'Both parties',
          result: 'Continued',
          notes: 'Respondent asked for more time to gather payment.',
        },
      ],
    },
    {
      id: caseNo(2),
      incidentDate: offsetDays(-12),
      reportedAt: offsetDays(-11),
      place: 'Basketball court, Purok 4',
      incidentType: 'Physical injury',
      status: 'Settled',
      mediationStart: offsetDays(-9),
      settlementDate: offsetDays(-4),
      narrative: 'A scuffle after a basketball game left the complainant with a bruised arm.',
      complainants: [res('R-0019', 'Jun Carlo Dizon', 30, 'Male', 4)],
      respondents: [res('R-0052', 'Paolo Dela Cruz', 16, 'Male', 4)],
      witnesses: [res('R-0060', 'Rey Mendoza', 28, 'Male', 4)],
      settlementTerms:
        'The respondent apologized and will pay ₱1,500 for the complainant’s medical expenses on or before the agreed date. Both parties agree to keep the peace.',
      hearings: [
        {
          id: 'HR-0004',
          date: offsetDays(-4),
          kind: 'Mediation (Punong Barangay)',
          attended: 'Both parties',
          result: 'Settled',
        },
      ],
    },
    {
      id: caseNo(1),
      incidentDate: offsetDays(-60),
      reportedAt: offsetDays(-59),
      place: 'Complainant’s store, Purok 1',
      incidentType: 'Theft',
      status: 'Certificate issued',
      mediationStart: offsetDays(-55),
      pangkatStart: offsetDays(-40),
      certificateNo: `CFA-${year}-0001`,
      certificateIssuedAt: offsetDays(-25),
      certificateReason: 'Conciliation failed',
      narrative:
        'Complainant reported missing goods from her store, which she believes were taken by the respondent.',
      complainants: [res('R-0044', 'Liza Mae Santos', 35, 'Female', 2)],
      respondents: [outsider('Unknown person')],
      witnesses: [],
      hearings: [],
    },
  ],
})

export function useBlotter() {
  const rows = computed<BlotterRow[]>(() => state.items.map(toRow))

  function getById(id: string) {
    return state.items.find((e) => e.id === id)
  }

  function create(input: BlotterInput): BlotterEntry {
    const prefix = `BL-${new Date().getFullYear()}-`
    const used = state.items
      .filter((e) => e.id.startsWith(prefix))
      .map((e) => Number(e.id.slice(prefix.length)))
    const entry: BlotterEntry = {
      ...input,
      id: `${prefix}${String(Math.max(0, ...used) + 1).padStart(4, '0')}`,
      reportedAt: isoDate(),
      status: 'Recorded',
      hearings: [],
    }
    state.items.unshift(entry)
    return entry
  }

  function update(id: string, input: BlotterInput) {
    const entry = getById(id)
    if (entry) Object.assign(entry, input)
    return entry
  }

  function nextCertificateNo() {
    const prefix = `CFA-${new Date().getFullYear()}-`
    const used = state.items
      .filter((e) => e.certificateNo?.startsWith(prefix))
      .map((e) => Number(e.certificateNo!.slice(prefix.length)))
    return `${prefix}${String(Math.max(0, ...used) + 1).padStart(4, '0')}`
  }

  /** Applies one step to a case. Returns false if that step isn't allowed from the current status. */
  function apply(id: string, p: ActionPayload): boolean {
    const e = getById(id)
    if (!e || !availableActions(e).includes(p.action)) return false

    switch (p.action) {
      case 'mediation':
        e.status = 'For mediation'
        e.mediationStart = p.date
        break
      case 'pangkat':
        e.status = 'Pangkat conciliation'
        e.pangkatStart = p.date
        break
      case 'extend':
        e.pangkatExtended = true
        break
      case 'settle':
        e.status = 'Settled'
        e.settlementDate = p.date
        e.settlementTerms = p.terms
        break
      case 'certificate':
        e.status = 'Certificate issued'
        e.certificateReason = p.reason
        e.certificateIssuedAt = isoDate()
        e.certificateNo = nextCertificateNo()
        break
      case 'refer':
        e.status = 'Referred'
        e.referredTo = p.target
        e.closingNote = p.note
        break
      case 'withdraw':
        e.status = 'Withdrawn'
        e.closingNote = p.note
        break
      case 'hearing':
        state.hseq += 1
        e.hearings.push({ ...p.hearing, id: `HR-${String(state.hseq).padStart(4, '0')}` })
        break
    }
    return true
  }

  return { rows, getById, create, update, apply }
}
