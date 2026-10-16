import { computed, reactive } from 'vue'
import type { ResidentRow } from '@/data/residents'

export type AnimalCategory = 'Pet' | 'Livestock'
export type OwnerType = 'Resident' | 'Non-resident' | 'Stray'
export type AnimalStatus = 'Active' | 'Deceased' | 'Transferred' | 'Missing'
export type AnimalSex = 'Male' | 'Female' | 'Mixed'
export type VaccStatus = 'Up to date' | 'Due soon' | 'Overdue' | 'Partial' | 'Not vaccinated'

/* -------------------------------------------------------------------------- */
/* Species. `vaccines` feeds the vaccination form later.                      */
/* These lists are placeholders: confirm them with your municipal veterinary  */
/* or agriculture office before using them for real records.                  */
/* -------------------------------------------------------------------------- */
export interface SpeciesConfig {
  key: string
  category: AnimalCategory
  vaccines: string[]
}

export const speciesList: SpeciesConfig[] = [
  { key: 'Dog', category: 'Pet', vaccines: ['Anti-rabies', '5-in-1 (DHPP)'] },
  { key: 'Cat', category: 'Pet', vaccines: ['Anti-rabies', 'Tricat'] },
  { key: 'Other pet', category: 'Pet', vaccines: [] },
  { key: 'Carabao', category: 'Livestock', vaccines: ['Hemorrhagic septicemia', 'Anti-rabies'] },
  { key: 'Cattle', category: 'Livestock', vaccines: ['Hemorrhagic septicemia', 'Anti-rabies'] },
  { key: 'Horse', category: 'Livestock', vaccines: ['Anti-rabies'] },
  { key: 'Goat', category: 'Livestock', vaccines: ['Hemorrhagic septicemia'] },
  { key: 'Pig', category: 'Livestock', vaccines: ['Classical swine fever'] },
  { key: 'Chicken', category: 'Livestock', vaccines: ['Newcastle disease', 'Fowl pox'] },
  { key: 'Duck', category: 'Livestock', vaccines: ['Duck plague'] },
  { key: 'Other livestock', category: 'Livestock', vaccines: [] },
]

export const speciesByKey: Record<string, SpeciesConfig> = Object.fromEntries(
  speciesList.map((s) => [s.key, s]),
)

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/** Owner details copied at the time of registering, so later edits to the resident don't rewrite old records. */
export interface OwnerSnapshot {
  residentId: string
  name: string
  address: string
  purok: number
  contact: string
}

export interface Animal {
  /** Registration number, e.g. AN-0001 */
  id: string
  category: AnimalCategory
  species: string
  /** Pet's name, or a label for a group ("Backyard hogs") */
  name?: string
  breed?: string
  color?: string
  sex: AnimalSex
  /** 1 for an individual animal. More than 1 makes this a group record (livestock only). */
  count: number
  /** An estimate is fine (YYYY-MM-DD) */
  birthdate?: string
  tagNo?: string
  ownerType: OwnerType
  owner?: OwnerSnapshot
  /** Non-resident owners */
  ownerName?: string
  ownerContact?: string
  /** Non-resident: their address. Stray: where it is usually found. */
  location?: string
  status: AnimalStatus
  registeredAt: string
  notes?: string
}

export type AnimalInput = Omit<Animal, 'id' | 'registeredAt'>

export interface Vaccination {
  id: string
  animalId: string
  vaccine: string
  /** YYYY-MM-DD */
  date: string
  nextDue?: string
  /** How many animals were vaccinated (matters for group records) */
  count: number
  administeredBy: string
}

export interface AnimalRow extends Animal {
  title: string
  subtitle: string
  ownerLabel: string
  ownerPlace: string
  ageLabel: string
  vaccStatus: VaccStatus
  /** Most recent dose of any vaccine */
  lastVaccinatedAt?: string
  /** Earliest next-due date across vaccines */
  nextDueAt?: string
  haystack: string
}

export function ownerOf(row: ResidentRow): OwnerSnapshot {
  return {
    residentId: row.id,
    name: [row.firstName, row.middleName, row.lastName, row.suffix].filter(Boolean).join(' '),
    address: `${row.address}, Purok ${row.purok}`,
    purok: row.purok,
    contact: row.contact,
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Local-date ISO string (YYYY-MM-DD). Not toISOString(), which is UTC and can be a day off in the Philippines. */
export function isoDate(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function offsetDays(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

export function formatDate(iso: string, style: 'short' | 'long' = 'short') {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    day: 'numeric',
  })
}

export function ageLabel(birthdate?: string) {
  if (!birthdate) return '—'
  const b = new Date(`${birthdate}T00:00:00`)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + now.getMonth() - b.getMonth()
  if (now.getDate() < b.getDate()) months--
  if (months < 0) return '—'
  if (months < 1) return '< 1 mo'
  if (months < 12) return `${months} mo`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m ? `${y} yr ${m} mo` : `${y} yr`
}

const DUE_SOON_DAYS = 30
/** Doses of the same vaccine this close together count as one round (a drive may top up a group in a second visit). */
const SAME_ROUND_DAYS = 30

export function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000,
  )
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return isoDate(d)
}

/** Adds whole months, clamping to the end of shorter months (31 Aug + 6 months = 28 Feb, not 3 Mar). */
export function addMonths(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
  return isoDate(d)
}

export interface VaccineRound {
  vaccine: string
  /** Date of the most recent dose in this round */
  date: string
  /** Animals covered across the round */
  covered: number
  /** Earliest next-due date among the doses */
  due?: string
}

/** One entry per vaccine this animal has had, describing its most recent round. */
export function latestRounds(animalId: string, vaccs: Vaccination[]): VaccineRound[] {
  const byVaccine = new Map<string, Vaccination[]>()
  for (const v of vaccs) {
    if (v.animalId !== animalId) continue
    byVaccine.set(v.vaccine, [...(byVaccine.get(v.vaccine) ?? []), v])
  }
  return [...byVaccine.entries()].map(([vaccine, list]) => {
    // const date = list
    //   .map((v) => v.date)
    //   .sort()
    //   .at(-1)!

    const date = list
      .map((v) => v.date)
      .sort()
      .pop()!
    const round = list.filter((v) => daysBetween(v.date, date) <= SAME_ROUND_DAYS)
    return {
      vaccine,
      date,
      covered: round.reduce((sum, v) => sum + v.count, 0),
      due: round
        .map((v) => v.nextDue)
        .filter((d): d is string => !!d)
        .sort()[0],
    }
  })
}

function statusOfRound(
  a: Animal,
  r: VaccineRound | undefined,
): { status: VaccStatus; remaining: number } {
  if (!r) return { status: 'Not vaccinated', remaining: a.count }
  const today = isoDate()
  if (r.due && r.due < today) return { status: 'Overdue', remaining: a.count }
  if (r.covered < a.count) return { status: 'Partial', remaining: a.count - r.covered }
  if (r.due && daysBetween(today, r.due) <= DUE_SOON_DAYS)
    return { status: 'Due soon', remaining: a.count }
  return { status: 'Up to date', remaining: 0 }
}

/** Status of one specific vaccine, plus how many animals still need it. Used by the vaccination drive page. */
export function vaccineStatus(a: Animal, vaccine: string, vaccs: Vaccination[]) {
  return statusOfRound(
    a,
    latestRounds(a.id, vaccs).find((r) => r.vaccine === vaccine),
  )
}

/** Overall status: the worst result across every vaccine the animal has had. */
export function vaccinationStatus(a: Animal, vaccs: Vaccination[]): VaccStatus {
  const rounds = latestRounds(a.id, vaccs)
  if (!rounds.length) return 'Not vaccinated'
  const statuses = rounds.map((r) => statusOfRound(a, r).status)
  const worstFirst: VaccStatus[] = ['Overdue', 'Partial', 'Due soon', 'Up to date']
  return worstFirst.find((x) => statuses.includes(x)) ?? 'Up to date'
}

export function toRow(a: Animal, vaccs: Vaccination[]): AnimalRow {
  const ownerLabel =
    a.ownerType === 'Resident'
      ? (a.owner?.name ?? 'Unknown')
      : a.ownerType === 'Non-resident'
        ? (a.ownerName ?? 'Unknown')
        : 'Stray (no owner)'
  const ownerPlace =
    a.ownerType === 'Resident'
      ? a.owner
        ? `Purok ${a.owner.purok}`
        : ''
      : (a.location ?? (a.ownerType === 'Non-resident' ? 'Outside the barangay' : ''))
  const title = a.name?.trim() || (a.count > 1 ? `${a.species} group` : a.species)
  const subtitle = `${a.count > 1 ? `${a.count} × ` : ''}${a.species}${a.breed ? ` · ${a.breed}` : ''}`

  const rounds = latestRounds(a.id, vaccs)

  return {
    ...a,
    title,
    subtitle,
    ownerLabel,
    ownerPlace,
    ageLabel: ageLabel(a.birthdate),
    vaccStatus: vaccinationStatus(a, vaccs),
    // lastVaccinatedAt: rounds
    //   .map((r) => r.date)
    //   .sort()
    //   .at(-1),
    lastVaccinatedAt: rounds
      .map((r) => r.date)
      .sort()
      .pop(),

    nextDueAt: rounds
      .map((r) => r.due)
      .filter((d): d is string => !!d)
      .sort()[0],
    haystack:
      `${a.id} ${a.species} ${a.name ?? ''} ${a.breed ?? ''} ${a.tagNo ?? ''} ${ownerLabel}`.toLowerCase(),
  }
}

// Tailwind dot colours, shared by the registry and the drawer.
export const vaccDot: Record<VaccStatus, string> = {
  'Up to date': 'bg-emerald-500',
  'Due soon': 'bg-amber-500',
  Overdue: 'bg-red-500',
  Partial: 'bg-orange-500',
  'Not vaccinated': 'bg-slate-400',
}

export const animalStatusDot: Record<AnimalStatus, string> = {
  Active: 'bg-emerald-500',
  Transferred: 'bg-amber-500',
  Missing: 'bg-orange-500',
  Deceased: 'bg-slate-400',
}

/* -------------------------------------------------------------------------- */
/* Store (in memory)                                                          */
/* TODO: replace the function bodies with API calls. Components only use      */
/* useAnimals(), so nothing else has to change.                               */
/* -------------------------------------------------------------------------- */
function owner(residentId: string, name: string, purok: number, contact: string): OwnerSnapshot {
  return { residentId, name, address: `Sitio Riverside, Purok ${purok}`, purok, contact }
}

const state = reactive<{
  animals: Animal[]
  vaccinations: Vaccination[]
  seq: number
  vseq: number
}>({
  seq: 7,
  vseq: 6,
  animals: [
    {
      id: 'AN-0007',
      category: 'Pet',
      species: 'Dog',
      name: 'Unnamed brown dog',
      color: 'Brown',
      sex: 'Male',
      count: 1,
      ownerType: 'Stray',
      location: 'Near the barangay hall, Purok 2',
      status: 'Active',
      registeredAt: offsetDays(-3),
      notes: 'Seen several times near the market. Appears friendly.',
    },
    {
      id: 'AN-0006',
      category: 'Livestock',
      species: 'Chicken',
      name: 'Free-range flock',
      sex: 'Mixed',
      count: 40,
      ownerType: 'Resident',
      owner: owner('R-0044', 'Liza Mae Santos', 2, '0917 555 0144'),
      status: 'Active',
      registeredAt: offsetDays(-60),
    },
    {
      id: 'AN-0005',
      category: 'Livestock',
      species: 'Carabao',
      name: 'Berto',
      color: 'Dark gray',
      sex: 'Male',
      count: 1,
      tagNo: 'C-014',
      birthdate: offsetDays(-365 * 6),
      ownerType: 'Resident',
      owner: owner('R-0031', 'Roberto Villanueva', 5, '0917 555 0131'),
      status: 'Active',
      registeredAt: offsetDays(-200),
    },
    {
      id: 'AN-0004',
      category: 'Livestock',
      species: 'Pig',
      name: 'Backyard hogs',
      sex: 'Mixed',
      count: 12,
      ownerType: 'Resident',
      owner: owner('R-0007', 'Mark Anthony Cruz', 1, '0917 555 0107'),
      status: 'Active',
      registeredAt: offsetDays(-90),
    },
    {
      id: 'AN-0003',
      category: 'Pet',
      species: 'Dog',
      name: 'Bantay',
      breed: 'Aspin',
      color: 'Black and white',
      sex: 'Male',
      count: 1,
      birthdate: offsetDays(-365 * 2),
      ownerType: 'Resident',
      owner: owner('R-0044', 'Liza Mae Santos', 2, '0917 555 0144'),
      status: 'Active',
      registeredAt: offsetDays(-30),
    },
    {
      id: 'AN-0002',
      category: 'Pet',
      species: 'Cat',
      name: 'Mingming',
      breed: 'Puspin',
      color: 'Orange',
      sex: 'Female',
      count: 1,
      birthdate: offsetDays(-365 * 4),
      ownerType: 'Resident',
      owner: owner('R-0012', 'Ana Marie Reyes', 3, '0917 555 0112'),
      status: 'Active',
      registeredAt: offsetDays(-420),
    },
    {
      id: 'AN-0001',
      category: 'Pet',
      species: 'Dog',
      name: 'Brownie',
      breed: 'Aspin',
      color: 'Brown',
      sex: 'Male',
      count: 1,
      tagNo: 'T-0231',
      birthdate: offsetDays(-365 * 3),
      ownerType: 'Resident',
      owner: owner('R-0031', 'Roberto Villanueva', 5, '0917 555 0131'),
      status: 'Active',
      registeredAt: offsetDays(-500),
    },
  ],
  vaccinations: [
    {
      id: 'VX-0001',
      animalId: 'AN-0001',
      vaccine: 'Anti-rabies',
      date: offsetDays(-120),
      nextDue: offsetDays(245),
      count: 1,
      administeredBy: 'Municipal Veterinary Office',
    },
    {
      id: 'VX-0002',
      animalId: 'AN-0002',
      vaccine: 'Anti-rabies',
      date: offsetDays(-400),
      nextDue: offsetDays(-35),
      count: 1,
      administeredBy: 'Municipal Veterinary Office',
    },
    {
      id: 'VX-0003',
      animalId: 'AN-0004',
      vaccine: 'Classical swine fever',
      date: offsetDays(-20),
      nextDue: offsetDays(160),
      count: 8,
      administeredBy: 'Barangay Animal Health Worker',
    },
    {
      id: 'VX-0004',
      animalId: 'AN-0005',
      vaccine: 'Hemorrhagic septicemia',
      date: offsetDays(-350),
      nextDue: offsetDays(14),
      count: 1,
      administeredBy: 'Municipal Veterinary Office',
    },
    {
      id: 'VX-0005',
      animalId: 'AN-0006',
      vaccine: 'Newcastle disease',
      date: offsetDays(-45),
      nextDue: offsetDays(135),
      count: 40,
      administeredBy: 'Barangay Animal Health Worker',
    },
  ],
})

export function useAnimals() {
  const rows = computed<AnimalRow[]>(() => state.animals.map((a) => toRow(a, state.vaccinations)))

  function getById(id: string) {
    return state.animals.find((a) => a.id === id)
  }

  function vaccinationsOf(animalId: string) {
    return state.vaccinations
      .filter((v) => v.animalId === animalId)
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  function register(input: AnimalInput): Animal {
    state.seq += 1
    const animal: Animal = {
      ...input,
      id: `AN-${String(state.seq).padStart(4, '0')}`,
      registeredAt: isoDate(),
    }
    state.animals.unshift(animal)
    return animal
  }

  function update(id: string, input: AnimalInput) {
    const animal = getById(id)
    if (animal) Object.assign(animal, input)
    return animal
  }

  function addVaccination(input: Omit<Vaccination, 'id'>) {
    state.vseq += 1
    const v: Vaccination = { ...input, id: `VX-${String(state.vseq).padStart(4, '0')}` }
    state.vaccinations.push(v)
    return v
  }

  /** Every vaccination record, newest first */
  const vaccinations = computed(() =>
    [...state.vaccinations].sort((a, b) => b.date.localeCompare(a.date)),
  )

  return { rows, vaccinations, getById, vaccinationsOf, register, update, addVaccination }
}
