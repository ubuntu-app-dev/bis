// Sample data + row mapper for the household records page.
// Replace createSampleHouseholds() with your API call; keep toRow() so the page needs no changes.

export type Tenure = 'Owned' | 'Rented' | 'Informal settler' | 'Living with relatives'
export type HouseholdStatus = 'Active' | 'Transferred' | 'Dissolved'
export type DwellingType = 'Concrete' | 'Semi-concrete' | 'Light materials'
export type WaterSource = 'Piped (Level III)' | 'Deep well' | 'Shared faucet'
export type ToiletFacility = 'Water-sealed' | 'Shared' | 'None'

export interface HouseholdMember {
  id: string
  firstName: string
  lastName: string
  relationship: string // 'Head' | 'Spouse' | 'Son' | ...
  sex: 'Male' | 'Female'
  age: number
  occupation: string
  isPwd: boolean
  isVoter: boolean
}

export interface Household {
  id: string
  householdNo: string
  headLastName: string
  headFirstName: string
  headMiddleName: string
  purok: number
  address: string
  contact: string
  tenure: Tenure
  dwellingType: DwellingType
  waterSource: WaterSource
  toiletFacility: ToiletFacility
  hasElectricity: boolean
  is4Ps: boolean
  isIndigent: boolean
  status: HouseholdStatus
  dateRegistered: string // YYYY-MM-DD
  members: HouseholdMember[]
}

export interface HouseholdTag {
  key: string
  label: string
  class: string
}

export interface HouseholdRow extends Household {
  memberCount: number
  hasPwdMember: boolean
  hasSeniorMember: boolean
  headName: string // "Dela Cruz, Juan M."
  headDisplayName: string
  initials: string
  tags: HouseholdTag[]
  haystack: string
}

export function toRow(h: Household): HouseholdRow {
  const middle = h.headMiddleName ? ` ${h.headMiddleName.charAt(0)}.` : ''
  const hasPwdMember = h.members.some((m) => m.isPwd)
  const hasSeniorMember = h.members.some((m) => m.age >= 60)

  const tags: HouseholdTag[] = []
  if (h.is4Ps) tags.push({ key: '4ps', label: '4Ps', class: 'bg-sky-50 text-sky-700' })
  if (h.isIndigent)
    tags.push({ key: 'indigent', label: 'Indigent', class: 'bg-rose-50 text-rose-700' })
  if (hasPwdMember)
    tags.push({ key: 'pwd', label: 'PWD member', class: 'bg-violet-50 text-violet-700' })
  if (hasSeniorMember)
    tags.push({ key: 'senior', label: 'Senior member', class: 'bg-amber-50 text-amber-700' })

  return {
    ...h,
    memberCount: h.members.length,
    hasPwdMember,
    hasSeniorMember,
    headName: `${h.headLastName}, ${h.headFirstName}${middle}`,
    headDisplayName: `${h.headFirstName} ${h.headLastName}`,
    initials: `${h.headFirstName.charAt(0)}${h.headLastName.charAt(0)}`.toUpperCase(),
    tags,
    haystack: [
      h.id,
      h.householdNo,
      h.headLastName,
      h.headFirstName,
      h.headMiddleName,
      h.address,
      ...h.members.map((m) => `${m.firstName} ${m.lastName}`),
    ]
      .join(' ')
      .toLowerCase(),
  }
}

/* ------------------------------ Sample data ------------------------------ */
const LAST = [
  'Dela Cruz',
  'Santos',
  'Reyes',
  'Garcia',
  'Mendoza',
  'Bautista',
  'Villanueva',
  'Ramos',
  'Castillo',
  'Aquino',
  'Navarro',
  'Peña',
  'Domingo',
  'Salazar',
  'Torres',
]
const MALE = [
  'Juan',
  'Jose',
  'Pedro',
  'Ricardo',
  'Roberto',
  'Fernando',
  'Eduardo',
  'Antonio',
  'Miguel',
  'Carlos',
]
const FEMALE = [
  'Maria',
  'Ana',
  'Luzviminda',
  'Elena',
  'Teresita',
  'Corazon',
  'Imelda',
  'Rosario',
  'Liza',
  'Gloria',
]
const MIDDLE = ['Manalo', 'Cruz', 'Lopez', 'Flores', 'Rivera', 'Gonzales']
const STREETS = [
  'Mabini St.',
  'Rizal Ave.',
  'Sampaguita St.',
  'Narra Rd.',
  'Acacia Lane',
  'Mahogany St.',
  'Bonifacio St.',
]
const JOBS = [
  'Farmer',
  'Tricycle driver',
  'Vendor',
  'Teacher',
  'Construction worker',
  'Barangay health worker',
  'Fisherfolk',
  'Self-employed',
  'Laborer',
]
const TENURES: Tenure[] = [
  'Owned',
  'Owned',
  'Owned',
  'Rented',
  'Living with relatives',
  'Informal settler',
]
const DWELLINGS: DwellingType[] = ['Concrete', 'Semi-concrete', 'Semi-concrete', 'Light materials']
const WATER: WaterSource[] = [
  'Piped (Level III)',
  'Piped (Level III)',
  'Deep well',
  'Shared faucet',
]
const TOILETS: ToiletFacility[] = ['Water-sealed', 'Water-sealed', 'Shared', 'None']
const RELATIONSHIPS = ['Spouse', 'Son', 'Daughter', 'Mother', 'Father', 'Grandchild', 'Sibling']

function buildMembers(h: {
  n: number
  i: number
  lastName: string
  headFirst: string
  headSex: 'Male' | 'Female'
  count: number
  senior: boolean
  pwd: boolean
}): HouseholdMember[] {
  const headAge = 28 + ((h.i * 3) % 32)
  const members: HouseholdMember[] = [
    {
      id: `M-${h.n}-1`,
      firstName: h.headFirst,
      lastName: h.lastName,
      relationship: 'Head',
      sex: h.headSex,
      age: headAge,
      occupation: JOBS[h.i % JOBS.length],
      isPwd: false,
      isVoter: true,
    },
  ]

  for (let k = 1; k < h.count; k++) {
    const rel = RELATIONSHIPS[(h.i + k - 1) % RELATIONSHIPS.length]
    const sex: 'Male' | 'Female' =
      rel === 'Spouse'
        ? h.headSex === 'Male'
          ? 'Female'
          : 'Male'
        : rel === 'Son' || rel === 'Father'
          ? 'Male'
          : rel === 'Daughter' || rel === 'Mother'
            ? 'Female'
            : (h.i + k) % 2 === 0
              ? 'Male'
              : 'Female'
    const pool = sex === 'Male' ? MALE : FEMALE
    const age =
      rel === 'Spouse'
        ? Math.max(18, headAge - 2)
        : rel === 'Mother' || rel === 'Father'
          ? headAge + 26
          : rel === 'Grandchild'
            ? 2 + ((h.i + k) % 9)
            : rel === 'Sibling'
              ? Math.max(18, headAge - 4)
              : Math.max(1, headAge - 24 - k)
    members.push({
      id: `M-${h.n}-${k + 1}`,
      firstName: pool[(h.i + k * 3) % pool.length],
      lastName: h.lastName,
      relationship: rel,
      sex,
      age,
      occupation: age < 6 ? '—' : age < 18 ? 'Student' : JOBS[(h.i + k) % JOBS.length],
      isPwd: false,
      isVoter: age >= 18,
    })
  }

  // Make the sample data agree with the household's senior / PWD flags.
  if (h.senior && !members.some((m) => m.age >= 60)) {
    const m = members[members.length - 1]
    m.age = 60 + (h.i % 20)
    m.occupation = 'Retired'
    m.isVoter = true
  }
  if (h.pwd) members[members.length > 1 ? 1 : 0].isPwd = true

  return members
}

export function createSampleHouseholds(count = 64): Household[] {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    const purok = (i % 7) + 1
    const status: HouseholdStatus =
      n % 17 === 0 ? 'Transferred' : n % 29 === 0 ? 'Dissolved' : 'Active'
    const month = String((i % 12) + 1).padStart(2, '0')
    const day = String((i % 27) + 1).padStart(2, '0')
    const headSex: 'Male' | 'Female' = i % 3 === 0 ? 'Female' : 'Male'
    const headPool = headSex === 'Male' ? MALE : FEMALE
    const lastName = LAST[(i * 7) % LAST.length]
    const headFirst = headPool[(i * 4 + 3) % headPool.length]

    return {
      id: `HH-${String(n).padStart(4, '0')}`,
      householdNo: `P${purok}-${String(Math.floor(i / 7) + 1).padStart(3, '0')}`,
      headLastName: lastName,
      headFirstName: headFirst,
      headMiddleName: MIDDLE[i % MIDDLE.length],
      purok,
      address: `${((i * 13) % 180) + 1} ${STREETS[i % STREETS.length]}`,
      contact: `0917${String(1000000 + ((i * 7919) % 8999999)).slice(0, 7)}`,
      tenure: TENURES[i % TENURES.length],
      dwellingType: DWELLINGS[i % DWELLINGS.length],
      waterSource: WATER[i % WATER.length],
      toiletFacility: TOILETS[i % TOILETS.length],
      hasElectricity: n % 11 !== 0,
      is4Ps: n % 5 === 0,
      isIndigent: n % 4 === 0,
      status,
      dateRegistered: `${2018 + (i % 7)}-${month}-${day}`,
      members: buildMembers({
        n,
        i,
        lastName,
        headFirst,
        headSex,
        count: ((i * 5) % 8) + 1,
        senior: n % 3 === 0,
        pwd: n % 9 === 0,
      }),
    }
  })
}
