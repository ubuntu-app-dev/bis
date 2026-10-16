/**
 * Municipal dashboard data.
 * DEVELOPMENT ONLY: sample figures. Replace the body of getMunicipalDashboard()
 * with your API call; the dashboard page only depends on the types below.
 */

export interface BarangaySummary {
  id: string
  name: string
  population: number
  households: number
  childrenPct: number // under 18
  seniorsPct: number // 60 and over
  malePct: number
  certificatesThisMonth: number
  openCases: number // blotter + VAWC, counts only
  recordsUpdatedDaysAgo: number
}

export interface ActivityItem {
  id: number
  barangay: string
  text: string
  minutesAgo: number
}

export interface MunicipalDashboardData {
  barangays: BarangaySummary[]
  activity: ActivityItem[]
}

const barangays: BarangaySummary[] = [
  {
    id: 'poblacion',
    name: 'Poblacion',
    population: 6120,
    households: 1480,
    childrenPct: 27,
    seniorsPct: 9,
    malePct: 49,
    certificatesThisMonth: 142,
    openCases: 6,
    recordsUpdatedDaysAgo: 2,
  },
  {
    id: 'san-isidro',
    name: 'San Isidro',
    population: 4380,
    households: 1010,
    childrenPct: 31,
    seniorsPct: 8,
    malePct: 51,
    certificatesThisMonth: 88,
    openCases: 3,
    recordsUpdatedDaysAgo: 5,
  },
  {
    id: 'santa-maria',
    name: 'Santa Maria',
    population: 3890,
    households: 905,
    childrenPct: 29,
    seniorsPct: 10,
    malePct: 50,
    certificatesThisMonth: 71,
    openCases: 2,
    recordsUpdatedDaysAgo: 1,
  },
  {
    id: 'san-jose',
    name: 'San Jose',
    population: 5210,
    households: 1215,
    childrenPct: 28,
    seniorsPct: 9,
    malePct: 49,
    certificatesThisMonth: 119,
    openCases: 5,
    recordsUpdatedDaysAgo: 12,
  },
  {
    id: 'bagong-silang',
    name: 'Bagong Silang',
    population: 7340,
    households: 1690,
    childrenPct: 34,
    seniorsPct: 6,
    malePct: 50,
    certificatesThisMonth: 164,
    openCases: 9,
    recordsUpdatedDaysAgo: 3,
  },
  {
    id: 'mabini',
    name: 'Mabini',
    population: 2960,
    households: 690,
    childrenPct: 30,
    seniorsPct: 8,
    malePct: 51,
    certificatesThisMonth: 54,
    openCases: 1,
    recordsUpdatedDaysAgo: 0,
  },
  {
    id: 'rizal',
    name: 'Rizal',
    population: 3410,
    households: 800,
    childrenPct: 26,
    seniorsPct: 12,
    malePct: 48,
    certificatesThisMonth: 63,
    openCases: 4,
    recordsUpdatedDaysAgo: 34,
  },
  {
    id: 'del-pilar',
    name: 'Del Pilar',
    population: 2740,
    households: 640,
    childrenPct: 29,
    seniorsPct: 11,
    malePct: 50,
    certificatesThisMonth: 47,
    openCases: 2,
    recordsUpdatedDaysAgo: 9,
  },
  {
    id: 'burgos',
    name: 'Burgos',
    population: 2180,
    households: 510,
    childrenPct: 27,
    seniorsPct: 13,
    malePct: 49,
    certificatesThisMonth: 38,
    openCases: 0,
    recordsUpdatedDaysAgo: 41,
  },
  {
    id: 'magsaysay',
    name: 'Magsaysay',
    population: 3570,
    households: 830,
    childrenPct: 30,
    seniorsPct: 9,
    malePct: 50,
    certificatesThisMonth: 66,
    openCases: 3,
    recordsUpdatedDaysAgo: 6,
  },
]

const activity: ActivityItem[] = [
  { id: 1, barangay: 'Mabini', text: 'Submitted the monthly report', minutesAgo: 25 },
  { id: 2, barangay: 'Poblacion', text: 'Updated 12 resident records', minutesAgo: 95 },
  { id: 3, barangay: 'Bagong Silang', text: 'Issued 8 certificates', minutesAgo: 210 },
  { id: 4, barangay: 'Santa Maria', text: 'Registered 3 animals for vaccination', minutesAgo: 480 },
  { id: 5, barangay: 'San Isidro', text: 'Added 2 new households', minutesAgo: 1560 },
]

export async function getMunicipalDashboard(): Promise<MunicipalDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 300)) // pretend network delay
  return { barangays, activity }
}
