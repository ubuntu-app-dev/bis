import { computed, reactive } from 'vue'
import { addDays, daysBetween, isoDate, offsetDays } from '@/data/animals'
import type { ResidentRow } from '@/data/residents'

export type BiteCategory = 'I' | 'II' | 'III'
export type Provocation = 'Provoked' | 'Unprovoked' | 'Unknown'
export type AnimalOutcome =
  'Under observation' | 'Healthy after observation' | 'Sick or died' | 'Cannot be traced'
export type CaseStatus = 'Open' | 'Closed'
export type ObservationState = 'Under observation' | 'Needs update' | 'Completed' | 'Not observed'

/** Observation period for a biting dog or cat. Confirm the number with your municipal veterinary office. */
export const OBSERVATION_DAYS = 14

/**
 * WHO / DOH exposure categories. The wording is shown to the person filling in the report;
 * confirm it against the current DOH guideline used by your rural health unit.
 */
export const biteCategories: { key: BiteCategory; label: string; description: string }[] = [
  {
    key: 'I',
    label: 'Category I',
    description: 'Touching or feeding the animal, or licks on unbroken skin.',
  },
  {
    key: 'II',
    label: 'Category II',
    description: 'Nibbling of uncovered skin, or minor scratches without bleeding.',
  },
  {
    key: 'III',
    label: 'Category III',
    description:
      'Bites or scratches that break the skin, licks on broken skin, or contact with the eyes, mouth or other mucous membranes.',
  },
]

export const bodyParts = ['Head or neck', 'Face', 'Arm or hand', 'Trunk', 'Leg or foot', 'Other']

export const biteActions = [
  'Wound washed with soap and water',
  'Referred to animal bite treatment center or RHU',
  'Post-exposure vaccine started',
  'Animal confined for observation',
  'Reported to municipal veterinary office',
]

export const outcomes: AnimalOutcome[] = [
  'Under observation',
  'Healthy after observation',
  'Sick or died',
  'Cannot be traced',
]

// Tailwind classes shared by the list and the drawer.
export const categoryChip: Record<BiteCategory, string> = {
  I: 'bg-slate-100 text-slate-700',
  II: 'bg-amber-50 text-amber-700',
  III: 'bg-red-50 text-red-700',
}

export const observationDot: Record<ObservationState, string> = {
  'Under observation': 'bg-sky-500',
  'Needs update': 'bg-red-500',
  Completed: 'bg-emerald-500',
  'Not observed': 'bg-slate-400',
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface Person {
  residentId?: string
  name: string
  age?: number
  sex?: string
  address: string
  contact?: string
}

export interface BiteIncident {
  /** Case number, e.g. BT-0001 */
  id: string
  /** YYYY-MM-DD */
  incidentDate: string
  reportedAt: string
  victimType: 'Resident' | 'Non-resident'
  victim: Person
  bodyPart: string
  category: BiteCategory
  place: string
  provocation: Provocation
  /** Registered = linked to an animal in the registry (strays can be registered too) */
  animalKind: 'Registered' | 'Unregistered'
  animalId?: string
  /** Copied when linked, e.g. "Brownie (Dog)", so the report stays readable if the animal record changes */
  animalLabel: string
  species: string
  /** For unregistered animals: color, size, marks, where it went */
  animalDescription?: string
  outcome: AnimalOutcome
  actions: string[]
  status: CaseStatus
  notes?: string
}

export type BiteInput = Omit<BiteIncident, 'id' | 'reportedAt'>

export interface BiteRow extends BiteIncident {
  observationEnds: string
  observationState: ObservationState
  observationLabel: string
  haystack: string
}

export function personOf(row: ResidentRow): Person {
  return {
    residentId: row.id,
    name: [row.firstName, row.middleName, row.lastName, row.suffix].filter(Boolean).join(' '),
    age: row.age,
    sex: row.sex,
    address: `${row.address}, Purok ${row.purok}`,
    contact: row.contact,
  }
}

/* -------------------------------------------------------------------------- */
/* Observation countdown                                                      */
/* -------------------------------------------------------------------------- */
function observation(i: BiteIncident): { ends: string; state: ObservationState; label: string } {
  const ends = addDays(i.incidentDate, OBSERVATION_DAYS)

  if (i.outcome === 'Healthy after observation')
    return { ends, state: 'Completed', label: 'Healthy after observation' }
  if (i.outcome === 'Sick or died') return { ends, state: 'Completed', label: 'Sick or died' }
  if (i.outcome === 'Cannot be traced')
    return { ends, state: 'Not observed', label: 'Cannot be traced' }

  const left = daysBetween(isoDate(), ends)
  if (left > 1) return { ends, state: 'Under observation', label: `${left} days left` }
  if (left === 1) return { ends, state: 'Under observation', label: '1 day left' }
  if (left === 0) return { ends, state: 'Under observation', label: 'Ends today' }
  return {
    ends,
    state: 'Needs update',
    label: `Ended ${-left} ${-left === 1 ? 'day' : 'days'} ago`,
  }
}

export function toRow(i: BiteIncident): BiteRow {
  const o = observation(i)
  return {
    ...i,
    observationEnds: o.ends,
    observationState: o.state,
    observationLabel: o.label,
    haystack: `${i.id} ${i.victim.name} ${i.animalLabel} ${i.species} ${i.place}`.toLowerCase(),
  }
}

/* -------------------------------------------------------------------------- */
/* Store (in memory)                                                          */
/* TODO: replace the function bodies with API calls.                          */
/* Victim details are sensitive. Limit this module to the roles that need it. */
/* -------------------------------------------------------------------------- */
const state = reactive<{ items: BiteIncident[]; seq: number }>({
  seq: 4,
  items: [
    {
      id: 'BT-0004',
      incidentDate: offsetDays(-3),
      reportedAt: offsetDays(-3),
      victimType: 'Non-resident',
      victim: {
        name: 'Kevin Dela Peña',
        age: 9,
        sex: 'Male',
        address: 'Visiting from the next barangay',
      },
      bodyPart: 'Leg or foot',
      category: 'III',
      place: 'Road near the barangay hall, Purok 2',
      provocation: 'Unprovoked',
      animalKind: 'Registered',
      animalId: 'AN-0007',
      animalLabel: 'Unnamed brown dog (Dog)',
      species: 'Dog',
      outcome: 'Under observation',
      actions: [
        'Wound washed with soap and water',
        'Referred to animal bite treatment center or RHU',
        'Post-exposure vaccine started',
        'Reported to municipal veterinary office',
      ],
      status: 'Open',
    },
    {
      id: 'BT-0003',
      incidentDate: offsetDays(-10),
      reportedAt: offsetDays(-10),
      victimType: 'Resident',
      victim: {
        residentId: 'R-0012',
        name: 'Ana Marie Reyes',
        age: 27,
        sex: 'Female',
        address: 'Sitio Riverside, Purok 3',
        contact: '0917 555 0112',
      },
      bodyPart: 'Arm or hand',
      category: 'II',
      place: 'Neighbor’s yard, Purok 3',
      provocation: 'Provoked',
      animalKind: 'Registered',
      animalId: 'AN-0003',
      animalLabel: 'Bantay (Dog)',
      species: 'Dog',
      outcome: 'Under observation',
      actions: ['Wound washed with soap and water', 'Animal confined for observation'],
      status: 'Open',
    },
    {
      id: 'BT-0002',
      incidentDate: offsetDays(-20),
      reportedAt: offsetDays(-19),
      victimType: 'Non-resident',
      victim: {
        name: 'Pedro Ramos',
        age: 52,
        sex: 'Male',
        address: 'Sitio Bagong Silang, next barangay',
      },
      bodyPart: 'Leg or foot',
      category: 'II',
      place: 'Public market',
      provocation: 'Unprovoked',
      animalKind: 'Unregistered',
      animalLabel: 'Unregistered dog',
      species: 'Dog',
      animalDescription: 'Black dog, no collar. Ran toward the river.',
      outcome: 'Cannot be traced',
      actions: [
        'Wound washed with soap and water',
        'Referred to animal bite treatment center or RHU',
      ],
      status: 'Closed',
    },
    {
      id: 'BT-0001',
      incidentDate: offsetDays(-40),
      reportedAt: offsetDays(-40),
      victimType: 'Resident',
      victim: {
        residentId: 'R-0007',
        name: 'Mark Anthony Cruz',
        age: 41,
        sex: 'Male',
        address: 'Sitio Riverside, Purok 1',
        contact: '0917 555 0107',
      },
      bodyPart: 'Arm or hand',
      category: 'II',
      place: 'Own yard, Purok 1',
      provocation: 'Provoked',
      animalKind: 'Registered',
      animalId: 'AN-0001',
      animalLabel: 'Brownie (Dog)',
      species: 'Dog',
      outcome: 'Healthy after observation',
      actions: ['Wound washed with soap and water', 'Animal confined for observation'],
      status: 'Closed',
      notes: 'Owner kept the dog tied for 14 days. No signs of illness.',
    },
  ],
})

export function useBites() {
  const rows = computed<BiteRow[]>(() => state.items.map(toRow))

  function getById(id: string) {
    return state.items.find((i) => i.id === id)
  }

  function report(input: BiteInput): BiteIncident {
    state.seq += 1
    const incident: BiteIncident = {
      ...input,
      id: `BT-${String(state.seq).padStart(4, '0')}`,
      reportedAt: isoDate(),
    }
    state.items.unshift(incident)
    return incident
  }

  function update(id: string, input: BiteInput) {
    const incident = getById(id)
    if (incident) Object.assign(incident, input)
    return incident
  }

  function setOutcome(id: string, outcome: AnimalOutcome) {
    const incident = getById(id)
    if (incident && incident.status === 'Open') incident.outcome = outcome
  }

  /** A case can only be closed once the animal's observation has a result. */
  function closeCase(id: string) {
    const incident = getById(id)
    if (incident && incident.outcome !== 'Under observation') incident.status = 'Closed'
  }

  function reopenCase(id: string) {
    const incident = getById(id)
    if (incident) incident.status = 'Open'
  }

  return { rows, getById, report, update, setOutcome, closeCase, reopenCase }
}
