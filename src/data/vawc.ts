import { computed, reactive } from 'vue'
import { addDays, daysBetween, isoDate, offsetDays } from '@/data/animals'
import type { Person } from '@/data/bites'

/*
 * Anti-VAWC Act (RA 9262). This module follows the barangay's role under the law, but confirm the
 * figures and wording against the IRR and the DILG guidance your barangay uses before relying on them.
 *
 *  - VAWC cases are NOT mediated or settled under Katarungang Pambarangay. There is no Pangkat here.
 *  - A Barangay Protection Order (BPO) is issued the day the application is made, is effective for
 *    15 days, and is served on the respondent right after it is issued.
 *  - The barangay cannot extend a BPO. Longer protection (TPO / PPO) comes from the court.
 *  - Case records are confidential.
 */
export const BPO_DAYS = 15
const EXPIRES_SOON_DAYS = 3

/* -------------------------------------------------------------------------- */
/* Lists                                                                      */
/* -------------------------------------------------------------------------- */
export type AbuseType = 'Physical' | 'Sexual' | 'Psychological' | 'Economic'

// Plain-language hints for the person filling in the form. They are not the legal definitions.
export const abuseOptions: { key: AbuseType; hint: string }[] = [
  { key: 'Physical', hint: 'Hitting, kicking, choking, or any act that causes bodily harm.' },
  { key: 'Sexual', hint: 'Forced sexual acts, or sexual acts the victim did not agree to.' },
  {
    key: 'Psychological',
    hint: 'Threats, stalking, harassment, humiliation, or repeated verbal abuse.',
  },
  { key: 'Economic', hint: 'Withholding money or support, or controlling income or work.' },
]

export const OTHER_RELATIONSHIP = 'Other relationship'
export const relationships = [
  'Husband',
  'Former husband',
  'Live-in partner',
  'Former live-in partner',
  'Dating or sexual partner',
  'Former dating or sexual partner',
  'Father of her child',
  OTHER_RELATIONSHIP,
]

export const reportedByOptions = [
  'The victim',
  'Relative or neighbor',
  'Barangay official or tanod',
  'Hospital, police or another agency',
]

export const assistanceTypes = [
  'Responded to a call for help',
  'Weapon confiscated',
  'Victim brought to a hospital or clinic',
  'Victim taken to a safe place or shelter',
  'Accompanied victim to get her belongings',
  'Safety plan discussed',
  'Other help',
]

export const referralTargets = [
  'PNP Women and Children Protection Desk',
  'MSWDO / social welfare',
  'Hospital or RHU (medical, medico-legal)',
  'Prosecutor’s office',
  'Family Court (protection order)',
  'Other office',
]

export const closingReasons = [
  'Endorsed to court or prosecutor',
  'Victim moved to a safe place or another area',
  'Handled by another office',
  'Other',
]

export type BpoIssuer = 'Punong Barangay' | 'Barangay Kagawad'
export const bpoIssuers: BpoIssuer[] = ['Punong Barangay', 'Barangay Kagawad']

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export type VawcStatus = 'Open' | 'Closed'
export type EventKind =
  | 'BPO issued'
  | 'BPO served'
  | 'BPO violated'
  | 'Assistance'
  | 'Referral'
  | 'Edited'
  | 'Closed'
  | 'Reopened'

export interface VawcEvent {
  id: string
  /** YYYY-MM-DD */
  date: string
  kind: EventKind
  title: string
  note?: string
}

export interface Bpo {
  /** e.g. BPO-2026-0001 */
  no: string
  issuedAt: string
  issuedBy: BpoIssuer
  /** Only set when a Kagawad issued it: confirms the Punong Barangay was unavailable */
  pbUnavailable?: boolean
  servedAt?: string
  servedBy?: string
}

export interface VawcCase {
  /** e.g. VW-2026-0001 */
  id: string
  incidentDate: string
  incidentTime?: string
  reportedAt: string
  place: string
  abuseTypes: AbuseType[]
  relationship: string
  reportedBy: string
  /** The victim is in immediate danger or needs medical attention */
  immediateDanger: boolean
  narrative: string
  victims: Person[]
  respondents: Person[]
  bpo?: Bpo
  events: VawcEvent[]
  status: VawcStatus
  closedAt?: string
  closedReason?: string
  remarks?: string
}

export type VawcInput = Pick<
  VawcCase,
  | 'incidentDate'
  | 'incidentTime'
  | 'place'
  | 'abuseTypes'
  | 'relationship'
  | 'reportedBy'
  | 'immediateDanger'
  | 'narrative'
  | 'victims'
  | 'respondents'
  | 'remarks'
>

export const eventDot: Record<EventKind, string> = {
  'BPO issued': 'bg-bis-600',
  'BPO served': 'bg-emerald-500',
  'BPO violated': 'bg-red-500',
  Assistance: 'bg-sky-500',
  Referral: 'bg-violet-500',
  Edited: 'bg-slate-300',
  Closed: 'bg-slate-500',
  Reopened: 'bg-amber-500',
}

/* -------------------------------------------------------------------------- */
/* Names. Lists always show initials; full names are for the opened case.     */
/* -------------------------------------------------------------------------- */
export const isChild = (p: Person) => p.age !== undefined && p.age < 18

export function maskName(p: Person) {
  return (
    p.name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w[0]}.`)
      .join(' ') || '—'
  )
}

export function partiesLabel(list: Person[]) {
  const [first, ...rest] = list
  if (!first) return '—'
  return rest.length ? `${maskName(first)} +${rest.length}` : maskName(first)
}

/* -------------------------------------------------------------------------- */
/* BPO countdown                                                              */
/* -------------------------------------------------------------------------- */
export type BpoState = 'None' | 'In effect' | 'Expires soon' | 'Expired'

export const bpoDot: Record<BpoState, string> = {
  None: 'bg-slate-300',
  'In effect': 'bg-emerald-500',
  'Expires soon': 'bg-amber-500',
  Expired: 'bg-slate-400',
}

export function bpoInfo(e: VawcCase): { state: BpoState; ends: string; label: string } {
  if (!e.bpo) return { state: 'None', ends: '', label: '' }
  const ends = addDays(e.bpo.issuedAt, BPO_DAYS)
  const left = daysBetween(isoDate(), ends)
  if (left < 0)
    return { state: 'Expired', ends, label: `Expired ${-left} ${-left === 1 ? 'day' : 'days'} ago` }
  const label = left > 1 ? `${left} days left` : left === 1 ? '1 day left' : 'Ends today'
  return { state: left <= EXPIRES_SOON_DAYS ? 'Expires soon' : 'In effect', ends, label }
}

/* -------------------------------------------------------------------------- */
/* Row for lists                                                              */
/* -------------------------------------------------------------------------- */
export interface VawcRow extends VawcCase {
  bpoState: BpoState
  bpoEnds: string
  bpoLabel: string
  /** Why this case needs someone's attention now. Empty when nothing is pending. */
  attention: string
  victimLabel: string
  respondentLabel: string
  hasChild: boolean
  haystack: string
}

export function toRow(e: VawcCase): VawcRow {
  const b = bpoInfo(e)
  const open = e.status === 'Open'
  const noActionYet = open && !e.bpo && !e.events.some((ev) => ev.kind !== 'Edited')
  const unserved = open && !!e.bpo && !e.bpo.servedAt
  const attention = noActionYet
    ? 'No action recorded'
    : unserved
      ? b.state === 'Expired'
        ? 'BPO expired, never served'
        : 'BPO not yet served'
      : ''
  return {
    ...e,
    bpoState: b.state,
    bpoEnds: b.ends,
    bpoLabel: b.label,
    attention,
    victimLabel: partiesLabel(e.victims),
    respondentLabel: partiesLabel(e.respondents),
    hasChild: e.victims.some(isChild),
    // Deliberately no names: a search box that matches names would reveal who is in a case.
    haystack:
      `${e.id} ${e.bpo?.no ?? ''} ${e.abuseTypes.join(' ')} ${e.relationship} ${e.place}`.toLowerCase(),
  }
}

/* -------------------------------------------------------------------------- */
/* Actions. The case moves forward only through these.                        */
/* -------------------------------------------------------------------------- */
export type VawcAction = 'bpo' | 'serve' | 'violation' | 'assist' | 'refer' | 'close' | 'reopen'

export const actionLabels: Record<VawcAction, string> = {
  bpo: 'Issue BPO',
  serve: 'Record BPO service',
  violation: 'Log BPO violation',
  assist: 'Log assistance',
  refer: 'Log referral',
  close: 'Close case',
  reopen: 'Reopen case',
}

/** The first action in the list is the natural next step. */
export function availableActions(e: VawcCase): VawcAction[] {
  if (e.status === 'Closed') return ['reopen']
  const list: VawcAction[] = []
  const state = bpoInfo(e).state
  if (e.bpo && !e.bpo.servedAt && state !== 'Expired') list.push('serve')
  list.push('refer', 'assist')
  // One BPO per case. The barangay cannot extend it; the victim goes to court for a TPO or PPO.
  if (!e.bpo) list.push('bpo')
  else list.push('violation')
  // A case can only be closed once it has been referred somewhere.
  if (e.events.some((ev) => ev.kind === 'Referral')) list.push('close')
  return list
}

export type ActionPayload =
  | { action: 'bpo'; date: string; issuedBy: BpoIssuer; pbUnavailable: boolean }
  | { action: 'serve'; date: string; servedBy: string; note?: string }
  | { action: 'violation'; date: string; note: string }
  | { action: 'assist'; date: string; type: string; note?: string }
  | { action: 'refer'; date: string; target: string; note?: string }
  | { action: 'close'; reason: string; note?: string }
  | { action: 'reopen'; note: string }

/** Returns a message when the step is not allowed, or '' when it is. Used by the dialog and again by the store. */
export function actionError(e: VawcCase, p: ActionPayload): string {
  if (!availableActions(e).includes(p.action)) return 'That step is not available for this case.'
  const today = isoDate()
  const dateProblem = (date: string, from: string, fromLabel: string) => {
    if (!date) return 'Enter a date.'
    if (date < from) return `The date cannot be before ${fromLabel}.`
    if (date > today) return 'The date cannot be in the future.'
    return ''
  }

  switch (p.action) {
    case 'bpo': {
      const d = dateProblem(p.date, e.incidentDate, 'the incident')
      if (d) return d
      if (p.issuedBy === 'Barangay Kagawad' && !p.pbUnavailable) {
        return 'A Kagawad can issue a BPO only when the Punong Barangay is unavailable. Confirm that to continue.'
      }
      return ''
    }
    case 'serve': {
      if (!e.bpo) return 'There is no BPO to serve.'
      const d = dateProblem(p.date, e.bpo.issuedAt, 'the date the BPO was issued')
      if (d) return d
      return p.servedBy.trim() ? '' : 'Enter who served the order.'
    }
    case 'violation': {
      if (!e.bpo) return 'There is no BPO.'
      const d = dateProblem(p.date, e.bpo.issuedAt, 'the date the BPO was issued')
      if (d) return d
      if (p.date > addDays(e.bpo.issuedAt, BPO_DAYS))
        return `The violation must fall within the ${BPO_DAYS} days the BPO was in effect.`
      return p.note.trim() ? '' : 'Describe what happened.'
    }
    case 'assist':
      return (
        dateProblem(p.date, e.incidentDate, 'the incident') ||
        (p.type ? '' : 'Choose the kind of help.')
      )
    case 'refer':
      return (
        dateProblem(p.date, e.incidentDate, 'the incident') ||
        (p.target ? '' : 'Choose where the case was referred.')
      )
    case 'close':
      return p.reason ? '' : 'Choose the reason.'
    case 'reopen':
      return p.note.trim() ? '' : 'Say why the case is being reopened.'
  }
}

/* -------------------------------------------------------------------------- */
/* Store (in memory)                                                          */
/* TODO: replace the function bodies with API calls. Numbers (VW-, BPO-, EV-) */
/* must be assigned by the server so two users can't get the same one.        */
/* Log every time a case is opened or its details are revealed.               */
/* -------------------------------------------------------------------------- */
const year = new Date().getFullYear()
const pad = (n: number) => String(n).padStart(4, '0')
const caseNo = (n: number) => `VW-${year}-${pad(n)}`
const bpoNo = (n: number) => `BPO-${year}-${pad(n)}`

function nextSeq(values: (string | undefined)[], prefix: string) {
  const used = values
    .filter((v): v is string => !!v && v.startsWith(prefix))
    .map((v) => Number(v.slice(prefix.length)))
    .filter(Number.isFinite)
  return Math.max(0, ...used) + 1
}

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
function outsider(name: string, age: number, sex: string, address: string): Person {
  return { name, age, sex, address }
}

let evCounter = 0
const ev = (date: string, kind: EventKind, title: string, note?: string): VawcEvent => ({
  id: `EV-${pad(++evCounter)}`,
  date,
  kind,
  title,
  note,
})

const sample: VawcCase[] = [
  {
    id: caseNo(4),
    incidentDate: offsetDays(-1),
    reportedAt: offsetDays(-1),
    place: 'Residence, Purok 6',
    abuseTypes: ['Psychological'],
    relationship: 'Former dating or sexual partner',
    reportedBy: 'The victim',
    immediateDanger: false,
    narrative:
      'The victim reported repeated threats by text and being followed on her way to work.',
    victims: [res('R-0058', 'Jasmine Padilla', 24, 'Female', 6, '0917 555 0158')],
    respondents: [outsider('Carlo Mendoza', 26, 'Male', 'Poblacion, next barangay')],
    events: [],
    status: 'Open',
  },
  {
    id: caseNo(3),
    incidentDate: offsetDays(-2),
    reportedAt: offsetDays(-2),
    place: 'Residence, Purok 3',
    abuseTypes: ['Physical', 'Psychological'],
    relationship: 'Husband',
    reportedBy: 'Relative or neighbor',
    immediateDanger: true,
    narrative:
      'A neighbor called the barangay after hearing shouting. The victim had bruises on her arm and her child was crying.',
    victims: [
      res('R-0070', 'Rosalie Torres', 31, 'Female', 3, '0917 555 0170'),
      res('R-0071', 'Mia Torres', 7, 'Female', 3),
    ],
    respondents: [res('R-0072', 'Edgar Torres', 34, 'Male', 3, '0917 555 0172')],
    bpo: { no: bpoNo(2), issuedAt: offsetDays(-2), issuedBy: 'Punong Barangay' },
    events: [
      ev(offsetDays(-2), 'Assistance', 'Victim brought to a hospital or clinic'),
      ev(offsetDays(-2), 'BPO issued', `${bpoNo(2)} issued by Punong Barangay`),
    ],
    status: 'Open',
  },
  {
    id: caseNo(2),
    incidentDate: offsetDays(-20),
    reportedAt: offsetDays(-20),
    place: 'Residence, Purok 2',
    abuseTypes: ['Psychological', 'Economic'],
    relationship: 'Former live-in partner',
    reportedBy: 'The victim',
    immediateDanger: false,
    narrative:
      'The respondent keeps coming to the house, threatens the victim, and has stopped giving support for their child.',
    victims: [res('R-0066', 'Teresita Domingo', 38, 'Female', 2, '0917 555 0166')],
    respondents: [outsider('Ramil Soriano', 40, 'Male', 'Sitio Bagong Silang, next barangay')],
    bpo: {
      no: bpoNo(1),
      issuedAt: offsetDays(-19),
      issuedBy: 'Punong Barangay',
      servedAt: offsetDays(-19),
      servedBy: 'Tanod R. Aquino',
    },
    events: [
      ev(offsetDays(-19), 'BPO issued', `${bpoNo(1)} issued by Punong Barangay`),
      ev(offsetDays(-19), 'BPO served', 'Served on respondent by Tanod R. Aquino'),
      ev(offsetDays(-19), 'Referral', 'PNP Women and Children Protection Desk'),
      ev(
        offsetDays(-18),
        'Referral',
        'MSWDO / social welfare',
        'For counseling and support for the child.',
      ),
    ],
    status: 'Open',
  },
  {
    id: caseNo(1),
    incidentDate: offsetDays(-45),
    reportedAt: offsetDays(-45),
    place: 'Residence, Purok 4',
    abuseTypes: ['Physical'],
    relationship: 'Husband',
    reportedBy: 'The victim',
    immediateDanger: true,
    narrative: 'The victim came to the barangay hall with an injured arm and asked for help.',
    victims: [res('R-0063', 'Norma Salazar', 45, 'Female', 4, '0917 555 0163')],
    respondents: [res('R-0064', 'Gilbert Salazar', 47, 'Male', 4)],
    events: [
      ev(offsetDays(-45), 'Assistance', 'Responded to a call for help'),
      ev(offsetDays(-45), 'Referral', 'PNP Women and Children Protection Desk'),
      ev(offsetDays(-44), 'Referral', 'Prosecutor’s office'),
      ev(offsetDays(-30), 'Closed', 'Endorsed to court or prosecutor'),
    ],
    status: 'Closed',
    closedAt: offsetDays(-30),
    closedReason: 'Endorsed to court or prosecutor',
  },
]

const state = reactive<{ items: VawcCase[]; eseq: number }>({ items: sample, eseq: evCounter })

const fieldLabels: Record<keyof VawcInput, string> = {
  incidentDate: 'date',
  incidentTime: 'time',
  place: 'place',
  abuseTypes: 'type of abuse',
  relationship: 'relationship',
  reportedBy: 'who reported',
  immediateDanger: 'urgency',
  narrative: 'narrative',
  victims: 'victims',
  respondents: 'respondents',
  remarks: 'remarks',
}

export function useVawc() {
  const rows = computed<VawcRow[]>(() => state.items.map(toRow))

  function getById(id: string) {
    return state.items.find((e) => e.id === id)
  }

  function pushEvent(e: VawcCase, date: string, kind: EventKind, title: string, note?: string) {
    state.eseq += 1
    e.events.push({ id: `EV-${pad(state.eseq)}`, date, kind, title, note })
  }

  function create(input: VawcInput): VawcCase {
    const prefix = `VW-${new Date().getFullYear()}-`
    const entry: VawcCase = {
      ...input,
      abuseTypes: [...input.abuseTypes],
      victims: [...input.victims],
      respondents: [...input.respondents],
      id: `${prefix}${pad(
        nextSeq(
          state.items.map((i) => i.id),
          prefix,
        ),
      )}`,
      reportedAt: isoDate(),
      status: 'Open',
      events: [],
    }
    state.items.unshift(entry)
    return entry
  }

  /** Closed cases can't be edited: reopen first. Every edit leaves a line in the activity log. */
  function update(id: string, input: VawcInput) {
    const e = getById(id)
    if (!e || e.status === 'Closed') return undefined
    const changed = (Object.keys(input) as (keyof VawcInput)[]).filter(
      (k) => JSON.stringify(input[k] ?? null) !== JSON.stringify(e[k] ?? null),
    )
    if (!changed.length) return e
    Object.assign(e, input)
    pushEvent(
      e,
      isoDate(),
      'Edited',
      'Entry edited',
      `Changed: ${changed.map((k) => fieldLabels[k]).join(', ')}`,
    )
    return e
  }

  function nextBpoNo() {
    const prefix = `BPO-${new Date().getFullYear()}-`
    return `${prefix}${pad(
      nextSeq(
        state.items.map((i) => i.bpo?.no),
        prefix,
      ),
    )}`
  }

  /** Applies one step. Returns an error message, or '' when it worked. */
  function apply(id: string, p: ActionPayload): string {
    const e = getById(id)
    if (!e) return 'Case not found.'
    const error = actionError(e, p)
    if (error) return error
    const today = isoDate()
    const note = 'note' in p ? p.note?.trim() || undefined : undefined

    switch (p.action) {
      case 'bpo': {
        const no = nextBpoNo()
        e.bpo = {
          no,
          issuedAt: p.date,
          issuedBy: p.issuedBy,
          pbUnavailable: p.issuedBy === 'Barangay Kagawad' ? true : undefined,
        }
        pushEvent(e, p.date, 'BPO issued', `${no} issued by ${p.issuedBy}`)
        break
      }
      case 'serve':
        if (e.bpo) {
          e.bpo.servedAt = p.date
          e.bpo.servedBy = p.servedBy.trim()
        }
        pushEvent(e, p.date, 'BPO served', `Served on respondent by ${p.servedBy.trim()}`, note)
        break
      case 'violation':
        pushEvent(e, p.date, 'BPO violated', 'Respondent violated the BPO', note)
        break
      case 'assist':
        pushEvent(e, p.date, 'Assistance', p.type, note)
        break
      case 'refer':
        pushEvent(e, p.date, 'Referral', p.target, note)
        break
      case 'close':
        e.status = 'Closed'
        e.closedAt = today
        e.closedReason = p.reason
        pushEvent(e, today, 'Closed', p.reason, note)
        break
      case 'reopen':
        e.status = 'Open'
        e.closedAt = undefined
        e.closedReason = undefined
        pushEvent(e, today, 'Reopened', 'Case reopened', note)
        break
    }
    return ''
  }

  return { rows, getById, create, update, apply }
}
