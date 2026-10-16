import { formatDate, isoDate, useAnimals } from '@/data/animals'
import { OPEN_STATUSES, useBlotter, type BlotterStatus } from '@/data/blotter'
import { bodyParts, outcomes, useBites } from '@/data/bites'
import { createSampleResidents, toRow as residentRow, type ResidentRow } from '@/data/residents'
import { abuseOptions, useVawc } from '@/data/vawc'
import type { CsvCell } from '@/utils/csv'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface Range {
  from: string
  to: string
}
export interface ReportTable {
  title: string
  columns: string[]
  rows: CsvCell[][]
}
export interface Report {
  key: string
  title: string
  period: string
  generatedAt: string
  stats: { label: string; value: CsvCell }[]
  tables: ReportTable[]
  notes: string[]
}
type Body = Pick<Report, 'stats' | 'tables' | 'notes'>

export interface ReportType {
  key: string
  label: string
  description: string
  /** false = a snapshot as of today (no date range) */
  usesPeriod: boolean
  build: (r: Range) => Body
}

/* -------------------------------------------------------------------------- */
/* Periods                                                                    */
/* -------------------------------------------------------------------------- */
export const presets = [
  { key: 'month', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'lastQuarter', label: 'Last quarter' },
  { key: 'year', label: 'This year' },
  { key: 'custom', label: 'Custom dates' },
]

export function presetRange(key: string): Range {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const q = Math.floor(m / 3) * 3
  const ymd = (yy: number, mm: number, dd: number) => isoDate(new Date(yy, mm, dd)) // months and days may overflow safely
  switch (key) {
    case 'lastMonth':
      return { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) }
    case 'quarter':
      return { from: ymd(y, q, 1), to: isoDate() }
    case 'lastQuarter':
      return { from: ymd(y, q - 3, 1), to: ymd(y, q, 0) }
    case 'year':
      return { from: ymd(y, 0, 1), to: isoDate() }
    default:
      return { from: ymd(y, m, 1), to: isoDate() }
  }
}

const inRange = (date: string, r: Range) => date >= r.from && date <= r.to

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
/** Counts items by a key (a key may return several labels). `order` fixes the order and shows zero rows. */
function tally<T>(list: T[], key: (t: T) => string | string[], order: string[] = []): CsvCell[][] {
  const counts = new Map<string, number>()
  for (const item of list) {
    const k = key(item)
    for (const label of Array.isArray(k) ? k : [k]) counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  for (const o of order) if (!counts.has(o)) counts.set(o, 0)
  const rank = (label: string) => {
    const i = order.indexOf(label)
    return i === -1 ? 999 : i
  }
  const total = list.length
  return [...counts.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, n]) => [label, n, total ? `${Math.round((n / total) * 100)}%` : '—'])
}

const COUNT_COLS = (first: string) => [first, 'Count', '% of total']

/* -------------------------------------------------------------------------- */
/* Blotter and Katarungang Pambarangay                                        */
/* -------------------------------------------------------------------------- */
const blotterStatuses: BlotterStatus[] = [
  'Recorded',
  'For mediation',
  'Pangkat conciliation',
  'Settled',
  'Certificate issued',
  'Referred',
  'Withdrawn',
]

function blotterReport(r: Range): Body {
  const rows = useBlotter().rows.value.filter((e) => inRange(e.reportedAt, r))
  const count = (s: BlotterStatus[]) => rows.filter((e) => s.includes(e.status)).length
  const withCertificate = rows.filter((e) => e.certificateReason)

  const tables: ReportTable[] = [
    {
      title: 'By type of incident',
      columns: COUNT_COLS('Incident'),
      rows: tally(rows, (e) => e.incidentType, []),
    },
    {
      title: 'By status today',
      columns: COUNT_COLS('Status'),
      rows: tally(rows, (e) => e.status, blotterStatuses),
    },
  ]
  if (withCertificate.length) {
    tables.push({
      title: 'Certificates to file action, by reason',
      columns: COUNT_COLS('Reason'),
      rows: tally(withCertificate, (e) => e.certificateReason!),
    })
  }
  tables.push({
    title: 'Entries',
    columns: ['Entry no.', 'Incident', 'Reported', 'Place', 'Status'],
    rows: [...rows]
      .sort((a, b) => a.reportedAt.localeCompare(b.reportedAt) || a.id.localeCompare(b.id))
      .map((e) => [e.id, e.incidentType, formatDate(e.reportedAt), e.place, e.status]),
  })

  return {
    stats: [
      { label: 'Entries recorded', value: rows.length },
      { label: 'Settled', value: count(['Settled']) },
      { label: 'Certificates to file action', value: count(['Certificate issued']) },
      { label: 'Referred', value: count(['Referred']) },
      { label: 'Withdrawn', value: count(['Withdrawn']) },
      { label: 'Still open', value: count(OPEN_STATUSES) },
      {
        label: 'Past their deadline',
        value: rows.filter((e) => e.status !== 'Settled' && e.deadline?.state === 'Overdue').length,
      },
    ],
    tables,
    notes: [
      'Entries are counted by the date they were recorded. Status is as of today, not as of the last day of the period.',
      'Names of the people involved are left out of this report.',
      'Check the layout against the monthly Katarungang Pambarangay report your city or municipality asks for.',
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* VAWC (counts only)                                                         */
/* -------------------------------------------------------------------------- */
function vawcReport(r: Range): Body {
  const all = useVawc().rows.value
  const cases = all.filter((c) => inRange(c.reportedAt, r))
  const events = all.flatMap((c) => c.events).filter((e) => inRange(e.date, r))
  const bpos = all.filter((c) => c.bpo && inRange(c.bpo.issuedAt, r))
  const ofKind = (kind: string) => events.filter((e) => e.kind === kind)

  return {
    stats: [
      { label: 'Cases reported', value: cases.length },
      { label: 'Involving a child', value: cases.filter((c) => c.hasChild).length },
      { label: 'BPOs issued', value: bpos.length },
      { label: 'Of those, served', value: bpos.filter((c) => c.bpo?.servedAt).length },
      { label: 'BPO violations logged', value: ofKind('BPO violated').length },
      { label: 'Referrals made', value: ofKind('Referral').length },
      { label: 'Still open', value: cases.filter((c) => c.status === 'Open').length },
    ],
    tables: [
      {
        title: 'By type of abuse',
        columns: COUNT_COLS('Type'),
        rows: tally(
          cases,
          (c) => c.abuseTypes,
          abuseOptions.map((a) => a.key),
        ),
      },
      {
        title: 'By relationship of respondent to victim',
        columns: COUNT_COLS('Relationship'),
        rows: tally(cases, (c) => c.relationship),
      },
      {
        title: 'Referrals, by office',
        columns: COUNT_COLS('Office'),
        rows: tally(ofKind('Referral'), (e) => e.title),
      },
      {
        title: 'Help given',
        columns: COUNT_COLS('Kind of help'),
        rows: tally(ofKind('Assistance'), (e) => e.title),
      },
    ],
    notes: [
      'Counts only. No names, addresses or case details are included, because VAWC records are confidential.',
      'A case with more than one type of abuse is counted under each type, so the rows can add up to more than the number of cases.',
      'BPOs, referrals and violations are counted by the date they happened, so they can belong to cases reported in an earlier period.',
      'Ask the PNP Women and Children Protection Desk or your municipal office which format they require for VAWC reports.',
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* Animal bites and vaccination                                               */
/* -------------------------------------------------------------------------- */
function animalReport(r: Range): Body {
  const bites = useBites().rows.value.filter((b) => inRange(b.incidentDate, r))
  const { rows: animals, vaccinations } = useAnimals()
  const active = animals.value.filter((a) => a.status === 'Active')
  const given = vaccinations.value.filter((v) => inRange(v.date, r))

  const heads = new Map<string, { records: number; animals: number }>()
  for (const a of active) {
    const h = heads.get(a.species) ?? { records: 0, animals: 0 }
    h.records += 1
    h.animals += a.count
    heads.set(a.species, h)
  }
  const byVaccine = new Map<string, number>()
  for (const v of given) byVaccine.set(v.vaccine, (byVaccine.get(v.vaccine) ?? 0) + v.count)

  return {
    stats: [
      { label: 'Bite incidents', value: bites.length },
      { label: 'Category III', value: bites.filter((b) => b.category === 'III').length },
      {
        label: 'Animal under observation',
        value: bites.filter((b) => b.observationState === 'Under observation').length,
      },
      {
        label: 'Observation needs an update',
        value: bites.filter((b) => b.observationState === 'Needs update').length,
      },
      {
        label: 'Animal could not be traced',
        value: bites.filter((b) => b.outcome === 'Cannot be traced').length,
      },
      { label: 'Animals vaccinated', value: given.reduce((sum, v) => sum + v.count, 0) },
    ],
    tables: [
      {
        title: 'Bites by exposure category',
        columns: COUNT_COLS('Category'),
        rows: tally(bites, (b) => `Category ${b.category}`, [
          'Category I',
          'Category II',
          'Category III',
        ]),
      },
      {
        title: 'Bites by animal',
        columns: COUNT_COLS('Animal'),
        rows: tally(bites, (b) => b.species),
      },
      {
        title: 'Bites by registration',
        columns: COUNT_COLS('Animal'),
        rows: tally(bites, (b) =>
          b.animalKind === 'Registered' ? 'Registered animal' : 'Unregistered or stray',
        ),
      },
      {
        title: 'Bites by animal outcome',
        columns: COUNT_COLS('Outcome'),
        rows: tally(bites, (b) => b.outcome, outcomes),
      },
      {
        title: 'Bites by part of the body',
        columns: COUNT_COLS('Body part'),
        rows: tally(bites, (b) => b.bodyPart, bodyParts),
      },
      {
        title: 'Registered animals today, by species',
        columns: ['Species', 'Records', 'Animals'],
        rows: [...heads.entries()]
          .sort((a, b) => b[1].animals - a[1].animals)
          .map(([s, h]) => [s, h.records, h.animals]),
      },
      {
        title: 'Vaccination status of registered animals today',
        columns: COUNT_COLS('Status'),
        rows: tally(active, (a) => a.vaccStatus, [
          'Up to date',
          'Due soon',
          'Overdue',
          'Partial',
          'Not vaccinated',
        ]),
      },
      {
        title: 'Vaccinations given in the period',
        columns: ['Vaccine', 'Animals vaccinated'],
        rows: [...byVaccine.entries()].sort((a, b) => b[1] - a[1]).map(([v, n]) => [v, n]),
      },
    ],
    notes: [
      'Bites are counted by the date of the incident. Outcomes and observation status are as of today.',
      'Registered animals and their vaccination status are as of today, counted by record. A group record such as a flock counts once.',
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* Resident profile (snapshot)                                                */
/* -------------------------------------------------------------------------- */
function ageGroup(r: ResidentRow) {
  if (r.age < 13) return 'Children (0–12)'
  if (r.age < 18) return 'Teens (13–17)'
  if (r.age < 60) return 'Adults (18–59)'
  return 'Seniors (60 and over)'
}

function residentReport(): Body {
  // TODO: use the same residents source as the Resident records page (store or API).
  const people = createSampleResidents()
    .map(residentRow)
    .filter((p) => p.status === 'Active')
  const total = people.length
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : '—')
  const puroks = [...new Set(people.map((p) => p.purok))]
    .sort((a, b) => a - b)
    .map((p) => `Purok ${p}`)

  const sectors: [string, number][] = [
    ['Registered voters', people.filter((p) => p.isVoter).length],
    ['Senior citizens (60 and over)', people.filter((p) => p.age >= 60).length],
    ['Persons with disability', people.filter((p) => p.isPwd).length],
    ['4Ps beneficiaries', people.filter((p) => p.is4Ps).length],
    ['Solo parents', people.filter((p) => p.isSoloParent).length],
  ]

  return {
    stats: [
      { label: 'Residents', value: total },
      { label: 'Households', value: new Set(people.map((p) => p.householdNo)).size },
      { label: 'Registered voters', value: sectors[0][1] },
      { label: 'Senior citizens', value: sectors[1][1] },
      { label: 'Persons with disability', value: sectors[2][1] },
    ],
    tables: [
      {
        title: 'By sex',
        columns: COUNT_COLS('Sex'),
        rows: tally(people, (p) => p.sex, ['Female', 'Male']),
      },
      {
        title: 'By age group',
        columns: COUNT_COLS('Age group'),
        rows: tally(people, ageGroup, [
          'Children (0–12)',
          'Teens (13–17)',
          'Adults (18–59)',
          'Seniors (60 and over)',
        ]),
      },
      {
        title: 'By purok',
        columns: COUNT_COLS('Purok'),
        rows: tally(people, (p) => `Purok ${p.purok}`, puroks),
      },
      {
        title: 'By civil status',
        columns: COUNT_COLS('Civil status'),
        rows: tally(people, (p) => p.civilStatus, ['Single', 'Married', 'Widowed', 'Separated']),
      },
      {
        title: 'Sectors',
        columns: COUNT_COLS('Sector'),
        rows: sectors.map(([label, n]) => [label, n, pct(n)]),
      },
    ],
    notes: [
      'Counts active residents as of today. Transferred and deceased residents are not included.',
      'A resident can belong to more than one sector.',
    ],
  }
}

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */
export const reportTypes: ReportType[] = [
  {
    key: 'blotter',
    label: 'Blotter and Katarungang Pambarangay',
    description:
      'Entries recorded in the period, by incident type and outcome, with the list of entries.',
    usesPeriod: true,
    build: blotterReport,
  },
  {
    key: 'vawc',
    label: 'VAWC summary',
    description:
      'Counts only: cases, BPOs issued and served, referrals and help given. No names or details.',
    usesPeriod: true,
    build: vawcReport,
  },
  {
    key: 'animals',
    label: 'Animal bites and vaccination',
    description: 'Bite incidents, animal outcomes, registered animals and vaccinations given.',
    usesPeriod: true,
    build: animalReport,
  },
  {
    key: 'residents',
    label: 'Resident profile',
    description: 'Population by sex, age group, purok, civil status and sector, as of today.',
    usesPeriod: false,
    build: () => residentReport(),
  },
]

export function generateReport(key: string, range: Range): Report {
  const type = reportTypes.find((t) => t.key === key) ?? reportTypes[0]
  return {
    key: type.key,
    title: type.label,
    period: type.usesPeriod
      ? `${formatDate(range.from, 'long')} to ${formatDate(range.to, 'long')}`
      : `As of ${formatDate(isoDate(), 'long')}`,
    generatedAt: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
    ...type.build(range),
  }
}

/** Flattens a report into CSV rows: heading, summary, then each table. */
export function reportToCsvRows(rep: Report): CsvCell[][] {
  const rows: CsvCell[][] = [
    [rep.title],
    [rep.period],
    [`Generated ${rep.generatedAt}`],
    [],
    ['Summary'],
  ]
  for (const s of rep.stats) rows.push([s.label, s.value])
  for (const t of rep.tables) {
    rows.push([], [t.title], t.columns, ...t.rows)
  }
  if (rep.notes.length) rows.push([], ['Notes'], ...rep.notes.map((n) => [n]))
  return rows
}
