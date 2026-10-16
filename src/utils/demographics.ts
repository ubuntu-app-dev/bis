// Pure aggregation helpers for the resident demographics page.
// No Vue, no DOM: feed it the resident rows and render whatever comes back.

import type { ResidentRow } from '@/data/residents'

export type DemoRow = Pick<
  ResidentRow,
  | 'age'
  | 'sex'
  | 'civilStatus'
  | 'purok'
  | 'householdNo'
  | 'isVoter'
  | 'isPwd'
  | 'is4Ps'
  | 'isSoloParent'
  | 'occupation'
>

export interface SexSplit {
  male: number
  female: number
  total: number
}

export interface PyramidBand extends SexSplit {
  label: string
}

export interface CountItem {
  key: string
  label: string
  count: number
}

export interface PurokItem extends SexSplit {
  purok: number
}

export interface Demographics {
  total: number
  male: number
  female: number
  households: number
  avgHouseholdSize: number
  medianAge: number
  meanAge: number
  voters: number
  seniors: number
  minors: number
  dependency: { young: number; working: number; old: number; ratio: number | null }
  ageGroups: CountItem[] // minors / adults / seniors
  pyramid: { bands: PyramidBand[]; max: number }
  byPurok: PurokItem[]
  byCivil: CountItem[]
  sectors: CountItem[]
  occupations: CountItem[]
}

const BAND_SIZE = 5
const BAND_COUNT = 17 // 0–4 … 75–79, 80+
const CIVIL_ORDER = ['Single', 'Married', 'Widowed', 'Separated']
const TOP_OCCUPATIONS = 6
const UNSPECIFIED = 'Not specified'

export function bandLabel(i: number) {
  return i === BAND_COUNT - 1
    ? `${i * BAND_SIZE}+`
    : `${i * BAND_SIZE}–${i * BAND_SIZE + BAND_SIZE - 1}`
}

/** Round up to a "nice" axis maximum: 1, 2, 5 × 10ⁿ. */
export function niceMax(n: number) {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  const f = n / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

export function percent(n: number, total: number, digits = 1) {
  return total > 0 ? `${((n / total) * 100).toFixed(digits)}%` : '—'
}

function median(sortedAges: number[]) {
  const n = sortedAges.length
  if (!n) return 0
  const mid = Math.floor(n / 2)
  return n % 2 ? sortedAges[mid] : (sortedAges[mid - 1] + sortedAges[mid]) / 2
}

function emptySplit(): SexSplit {
  return { male: 0, female: 0, total: 0 }
}

function addTo(split: SexSplit, sex: string) {
  split.total++
  if (sex === 'Male') split.male++
  else if (sex === 'Female') split.female++
}

export function computeDemographics(rows: DemoRow[]): Demographics {
  const total = rows.length
  const ages = rows.map((r) => r.age).sort((a, b) => a - b)

  let male = 0
  let female = 0
  let voters = 0
  let pwd = 0
  let fourPs = 0
  let solo = 0
  let minors = 0
  let seniors = 0
  let young = 0
  let working = 0
  let old = 0

  const bands: PyramidBand[] = Array.from({ length: BAND_COUNT }, (_, i) => ({
    label: bandLabel(i),
    ...emptySplit(),
  }))
  const purokMap = new Map<number, PurokItem>()
  for (let p = 1; p <= 7; p++) purokMap.set(p, { purok: p, ...emptySplit() })
  const civilMap = new Map<string, number>(CIVIL_ORDER.map((c) => [c, 0]))
  const jobMap = new Map<string, { label: string; count: number }>()
  const households = new Set<string>()
  let unspecified = 0

  for (const r of rows) {
    if (r.sex === 'Male') male++
    else if (r.sex === 'Female') female++
    if (r.isVoter) voters++
    if (r.isPwd) pwd++
    if (r.is4Ps) fourPs++
    if (r.isSoloParent) solo++
    if (r.age < 18) minors++
    if (r.age >= 60) seniors++
    if (r.age < 15) young++
    else if (r.age >= 65) old++
    else working++

    addTo(bands[Math.min(Math.floor(Math.max(0, r.age) / BAND_SIZE), BAND_COUNT - 1)], r.sex)

    if (!purokMap.has(r.purok)) purokMap.set(r.purok, { purok: r.purok, ...emptySplit() })
    addTo(purokMap.get(r.purok)!, r.sex)

    civilMap.set(r.civilStatus, (civilMap.get(r.civilStatus) ?? 0) + 1)

    if (r.householdNo) households.add(r.householdNo)

    const job = (r.occupation ?? '').trim()
    if (!job || job === '—' || job === '-') unspecified++
    else {
      const k = job.toLowerCase()
      const cur = jobMap.get(k)
      if (cur) cur.count++
      else jobMap.set(k, { label: job, count: 1 })
    }
  }

  const named = [...jobMap.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )
  const top = named.slice(0, TOP_OCCUPATIONS)
  const otherCount = named.slice(TOP_OCCUPATIONS).reduce((s, j) => s + j.count, 0)
  const occupations: CountItem[] = top.map((j) => ({
    key: j.label.toLowerCase(),
    label: j.label,
    count: j.count,
  }))
  if (otherCount) occupations.push({ key: 'other', label: 'Other', count: otherCount })
  if (unspecified) occupations.push({ key: 'unspecified', label: UNSPECIFIED, count: unspecified })

  const bandMax = bands.reduce((m, b) => Math.max(m, b.male, b.female), 0)
  const adults = total - minors - seniors

  return {
    total,
    male,
    female,
    households: households.size,
    avgHouseholdSize: households.size ? total / households.size : 0,
    medianAge: median(ages),
    meanAge: total ? ages.reduce((s, a) => s + a, 0) / total : 0,
    voters,
    seniors,
    minors,
    dependency: {
      young,
      working,
      old,
      ratio: working ? Math.round(((young + old) / working) * 100) : null,
    },
    ageGroups: [
      { key: 'minors', label: 'Minors (0–17)', count: minors },
      { key: 'adults', label: 'Adults (18–59)', count: adults },
      { key: 'seniors', label: 'Senior citizens (60+)', count: seniors },
    ],
    pyramid: { bands, max: bandMax },
    byPurok: [...purokMap.values()].sort((a, b) => a.purok - b.purok),
    byCivil: [...civilMap.entries()].map(([label, count]) => ({
      key: label.toLowerCase(),
      label,
      count,
    })),
    sectors: [
      { key: 'voters', label: 'Registered voters', count: voters },
      { key: 'seniors', label: 'Senior citizens', count: seniors },
      { key: 'pwd', label: 'Persons with disability', count: pwd },
      { key: '4ps', label: '4Ps beneficiaries', count: fourPs },
      { key: 'solo', label: 'Solo parents', count: solo },
    ],
    occupations,
  }
}
