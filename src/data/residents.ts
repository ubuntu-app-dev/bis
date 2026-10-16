/**
 * Resident types, helpers, and SAMPLE data.
 * Replace createSampleResidents() with your API call (GET /api/residents).
 * For thousands of records, move search/filter/sort/paging to the server.
 */

export type Sex = 'Male' | 'Female'
export type CivilStatus = 'Single' | 'Married' | 'Widowed' | 'Separated'
export type ResidentStatus = 'Active' | 'Transferred' | 'Deceased'

export interface Resident {
  id: string
  lastName: string
  firstName: string
  middleName: string
  suffix: string
  sex: Sex
  birthdate: string // YYYY-MM-DD
  civilStatus: CivilStatus
  purok: number
  householdNo: string
  address: string
  occupation: string
  contact: string
  isVoter: boolean
  isPwd: boolean
  is4Ps: boolean
  isSoloParent: boolean
  status: ResidentStatus
}

export interface Tag {
  key: string
  label: string
  class: string
}

export interface ResidentRow extends Resident {
  age: number
  /** "Dela Cruz, Maria S." (list style) */
  name: string
  /** "Maria Santos Dela Cruz" (natural order) */
  displayName: string
  initials: string
  tags: Tag[]
  haystack: string // lowercase text used by the search box
}

export function ageOf(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number)
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--
  return age
}

export function listName(r: Resident): string {
  const middle = r.middleName ? ` ${r.middleName[0]}.` : ''
  const suffix = r.suffix ? ` ${r.suffix}` : ''
  return `${r.lastName}${suffix}, ${r.firstName}${middle}`
}

export function naturalName(r: Resident): string {
  return [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(' ')
}

export function tagsOf(r: Resident, age: number): Tag[] {
  const tags: Tag[] = []
  if (r.isVoter) tags.push({ key: 'voter', label: 'Voter', class: 'bg-bis-50 text-bis-700' })
  if (age >= 60) tags.push({ key: 'senior', label: 'Senior', class: 'bg-amber-50 text-amber-700' })
  if (r.isPwd) tags.push({ key: 'pwd', label: 'PWD', class: 'bg-violet-50 text-violet-700' })
  if (r.is4Ps) tags.push({ key: '4ps', label: '4Ps', class: 'bg-emerald-50 text-emerald-700' })
  if (r.isSoloParent)
    tags.push({ key: 'solo', label: 'Solo parent', class: 'bg-rose-50 text-rose-700' })
  return tags
}

export function toRow(r: Resident): ResidentRow {
  const age = ageOf(r.birthdate)
  return {
    ...r,
    age,
    name: listName(r),
    displayName: naturalName(r),
    initials: `${r.firstName[0] ?? ''}${r.lastName[0] ?? ''}`.toUpperCase(),
    tags: tagsOf(r, age),
    haystack: `${listName(r)} ${naturalName(r)} ${r.id} ${r.householdNo}`.toLowerCase(),
  }
}

/* ------------------------------ Sample data ------------------------------- */

const SURNAMES = [
  'Dela Cruz',
  'Santos',
  'Reyes',
  'Garcia',
  'Ramos',
  'Mendoza',
  'Bautista',
  'Villanueva',
  'Aquino',
  'Castillo',
  'Flores',
  'Gonzales',
  'Torres',
  'Navarro',
  'Domingo',
  'Salazar',
  'Pascual',
  'Mercado',
  'Cruz',
  'Lim',
  'Soriano',
  'Valdez',
  'Macaraeg',
  'Dizon',
  'Manalo',
  'Padilla',
  'Ocampo',
  'Evangelista',
]
const MALE_NAMES = [
  'Juan',
  'Jose',
  'Mark',
  'John Paul',
  'Ricardo',
  'Eduardo',
  'Rodel',
  'Arnel',
  'Jericho',
  'Noel',
  'Carlo',
  'Ronnie',
  'Edgar',
  'Benjie',
  'Allan',
  'Dennis',
  'Gilbert',
  'Jomar',
  'Romeo',
  'Victor',
]
const FEMALE_NAMES = [
  'Maria',
  'Ana',
  'Rosario',
  'Liza',
  'Marites',
  'Cynthia',
  'Jocelyn',
  'Elena',
  'Grace',
  'Rowena',
  'Angelica',
  'Mylene',
  'Teresita',
  'Luzviminda',
  'Joy',
  'Cherry',
  'Norma',
  'Arlene',
  'Divina',
  'Katrina',
]
const STREETS = [
  'Mabini St.',
  'Rizal St.',
  'Sampaguita St.',
  'Narra Ave.',
  'Mahogany Rd.',
  'Bonifacio St.',
  'Acacia Lane',
]
const WORK = [
  'Farmer',
  'Vendor',
  'Tricycle driver',
  'Teacher',
  'Carpenter',
  'Laborer',
  'Sari-sari store owner',
  'Barangay worker',
  'Unemployed',
]

export function createSampleResidents(count = 186): Resident[] {
  let seed = 20261015
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  function pick<T>(list: T[]): T {
    return list[Math.floor(rnd() * list.length)]
  }
  const pad = (n: number, w: number) => String(n).padStart(w, '0')

  // Households first, so family members share a surname, purok and address.
  const households = Array.from({ length: 60 }, (_, h) => {
    const purok = 1 + Math.floor(rnd() * 7)
    return {
      no: `HH-${purok}${pad(h + 1, 3)}`,
      purok,
      surname: pick(SURNAMES),
      address: `${1 + Math.floor(rnd() * 80)} ${pick(STREETS)}`,
    }
  })

  // Age mix roughly matches the dashboard: children 17%, teens 13%, adults 61%, seniors 9%.
  function sampleAge() {
    const r = rnd()
    if (r < 0.174) return Math.floor(rnd() * 13)
    if (r < 0.304) return 13 + Math.floor(rnd() * 5)
    if (r < 0.913) return 18 + Math.floor(rnd() * 42)
    return 60 + Math.floor(rnd() * 30)
  }

  const now = new Date()
  const nowMonthDay = (now.getMonth() + 1) * 100 + now.getDate()

  return Array.from({ length: count }, (_, i) => {
    const home = pick(households)
    const sex: Sex = rnd() < 0.581 ? 'Female' : 'Male'
    const age = sampleAge()

    const month = 1 + Math.floor(rnd() * 12)
    const day = 1 + Math.floor(rnd() * 28)
    const birthYear = now.getFullYear() - age - (month * 100 + day > nowMonthDay ? 1 : 0)

    let civilStatus: CivilStatus = 'Single'
    if (age >= 21) {
      const r = rnd()
      civilStatus = r < 0.3 ? 'Single' : r < 0.85 ? 'Married' : r < 0.93 ? 'Widowed' : 'Separated'
    }

    let occupation = pick(WORK)
    if (age < 6) occupation = '—'
    else if (age < 18) occupation = 'Student'
    else if (age < 23 && rnd() < 0.5) occupation = 'Student'
    else if (age >= 60 && rnd() < 0.5) occupation = 'Retired'
    else if (sex === 'Female' && rnd() < 0.3) occupation = 'Housewife'

    const statusRoll = rnd()
    const status: ResidentStatus =
      statusRoll < 0.9
        ? 'Active'
        : statusRoll < 0.95
          ? 'Transferred'
          : age >= 18
            ? 'Deceased'
            : 'Active'

    const digits = Array.from({ length: 9 }, () => Math.floor(rnd() * 10)).join('')
    const contact =
      age >= 15 ? `09${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}` : '—'

    return {
      id: `RBN-${pad(i + 1, 5)}`,
      lastName: home.surname,
      firstName: pick(sex === 'Female' ? FEMALE_NAMES : MALE_NAMES),
      middleName: pick(SURNAMES),
      suffix: sex === 'Male' && age >= 18 && rnd() < 0.05 ? 'Jr.' : '',
      sex,
      birthdate: `${birthYear}-${pad(month, 2)}-${pad(day, 2)}`,
      civilStatus,
      purok: home.purok,
      householdNo: home.no,
      address: home.address,
      occupation,
      contact,
      isVoter: age >= 18 && rnd() < 0.86,
      isPwd: rnd() < 0.04,
      is4Ps: rnd() < 0.12,
      isSoloParent: age >= 20 && rnd() < 0.05,
      status,
    }
  })
}
