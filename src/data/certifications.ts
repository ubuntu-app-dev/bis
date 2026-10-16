import { reactive } from 'vue'
import type { ResidentRow } from '@/data/residents'

/* -------------------------------------------------------------------------- */
/* Barangay details printed on every certificate. Replace with your own.      */
/* Later this should come from a settings table, not a constant.              */
/* -------------------------------------------------------------------------- */
export const BARANGAY = {
  name: 'Barangay San Isidro',
  municipality: 'Municipality of Sample',
  province: 'Province of Sample',
  captain: 'Hon. Juan D. Dela Cruz',
  secretary: 'Maria S. Santos',
}

export type CertType = 'clearance' | 'residency' | 'indigency' | 'business'
export type RequestStatus = 'Pending' | 'Approved' | 'Released' | 'Rejected'

export interface CertTypeConfig {
  key: CertType
  title: string
  /** Control number prefix, e.g. BC-2026-0001 */
  prefix: string
  /** Default fee in PHP. Check your barangay ordinance. 0 = free. */
  fee: number
  purposes: string[]
}

export const certTypes: Record<CertType, CertTypeConfig> = {
  clearance: {
    key: 'clearance',
    title: 'Barangay Clearance',
    prefix: 'BC',
    fee: 100,
    purposes: [
      'Employment',
      'Business permit',
      'Travel',
      'Bank requirement',
      'ID application',
      'Other',
    ],
  },
  residency: {
    key: 'residency',
    title: 'Certificate of Residency',
    prefix: 'CR',
    fee: 50,
    purposes: [
      'Employment',
      'School enrollment',
      'Voter registration',
      'Bank requirement',
      'ID application',
      'Other',
    ],
  },
  indigency: {
    key: 'indigency',
    title: 'Certificate of Indigency',
    prefix: 'CI',
    fee: 0,
    purposes: [
      'Medical assistance',
      'Burial assistance',
      'Scholarship',
      'Legal assistance',
      'Financial assistance',
      'Other',
    ],
  },
  business: {
    key: 'business',
    title: 'Business Clearance',
    prefix: 'BZ',
    fee: 300,
    purposes: ['New business permit', 'Renewal of business permit', 'Other'],
  },
}

export const certTypeList = Object.values(certTypes)

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A copy of the resident's details at the time of issuing. Certificates are legal
 * records, so editing a resident later must never change a certificate already issued.
 */
export interface ResidentSnapshot {
  id: string
  name: string
  sex: string
  age: number
  civilStatus: string
  address: string
  purok: number
}

export interface CertificateRequest {
  /** Internal reference, always present (CRQ-0001) */
  id: string
  /** Official control number, assigned only when the certificate is issued */
  controlNo?: string
  type: CertType
  resident: ResidentSnapshot
  purpose: string
  residentSince?: string
  businessName?: string
  businessAddress?: string
  fee: number
  orNumber?: string
  source: 'Online' | 'Walk-in'
  status: RequestStatus
  requestedAt: string
  issuedAt?: string
  releasedAt?: string
  rejectReason?: string
}

export type IssueInput = Pick<
  CertificateRequest,
  | 'type'
  | 'resident'
  | 'purpose'
  | 'residentSince'
  | 'businessName'
  | 'businessAddress'
  | 'fee'
  | 'orNumber'
>

export function snapshotOf(row: ResidentRow): ResidentSnapshot {
  return {
    id: row.id,
    name: [row.firstName, row.middleName, row.lastName, row.suffix].filter(Boolean).join(' '),
    sex: row.sex,
    age: row.age,
    civilStatus: row.civilStatus,
    address: `${row.address}, Purok ${row.purok}`,
    purok: row.purok,
  }
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ordinal(n: number) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
}

/* -------------------------------------------------------------------------- */
/* Store (in memory)                                                          */
/* TODO: replace the bodies of these functions with API calls. The component   */
/* code only talks to useCertificates(), so nothing else has to change.       */
/* -------------------------------------------------------------------------- */
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function sampleResident(
  id: string,
  name: string,
  sex: string,
  age: number,
  civilStatus: string,
  purok: number,
): ResidentSnapshot {
  return { id, name, sex, age, civilStatus, address: `Sitio Riverside, Purok ${purok}`, purok }
}

const state = reactive<{ items: CertificateRequest[]; seq: number }>({
  seq: 5,
  items: [
    {
      id: 'CRQ-0005',
      type: 'clearance',
      purpose: 'Employment',
      fee: 100,
      source: 'Online',
      status: 'Pending',
      resident: sampleResident('R-0012', 'Ana Marie Reyes', 'Female', 27, 'Single', 3),
      requestedAt: daysAgo(0),
    },
    {
      id: 'CRQ-0004',
      type: 'indigency',
      purpose: 'Medical assistance',
      fee: 0,
      source: 'Online',
      status: 'Pending',
      resident: sampleResident('R-0031', 'Roberto Villanueva', 'Male', 64, 'Married', 5),
      requestedAt: daysAgo(1),
    },
    {
      id: 'CRQ-0003',
      controlNo: 'CR-2026-0001',
      type: 'residency',
      purpose: 'School enrollment',
      fee: 50,
      orNumber: '0048213',
      residentSince: '2008',
      source: 'Walk-in',
      status: 'Approved',
      resident: sampleResident('R-0044', 'Liza Mae Santos', 'Female', 35, 'Married', 2),
      requestedAt: daysAgo(2),
      issuedAt: daysAgo(2),
    },
    {
      id: 'CRQ-0002',
      controlNo: 'BC-2026-0001',
      type: 'clearance',
      purpose: 'Travel',
      fee: 100,
      orNumber: '0048190',
      source: 'Online',
      status: 'Released',
      resident: sampleResident('R-0007', 'Mark Anthony Cruz', 'Male', 41, 'Married', 1),
      requestedAt: daysAgo(6),
      issuedAt: daysAgo(5),
      releasedAt: daysAgo(5),
    },
    {
      id: 'CRQ-0001',
      type: 'clearance',
      purpose: 'Bank requirement',
      fee: 100,
      source: 'Online',
      status: 'Rejected',
      rejectReason: 'Resident has an unsettled blotter record. Please see the Punong Barangay.',
      resident: sampleResident('R-0019', 'Jun Carlo Dizon', 'Male', 30, 'Single', 4),
      requestedAt: daysAgo(9),
    },
  ],
})

function nextControlNo(type: CertType) {
  const year = new Date().getFullYear()
  const prefix = `${certTypes[type].prefix}-${year}-`
  const used = state.items
    .filter((r) => r.controlNo?.startsWith(prefix))
    .map((r) => Number(r.controlNo!.slice(prefix.length)))
  return `${prefix}${String(Math.max(0, ...used) + 1).padStart(4, '0')}`
}

export function useCertificates() {
  const items = state.items

  function getById(id: string) {
    return state.items.find((r) => r.id === id)
  }

  /** Creates the request if it is a walk-in, or completes an existing online request. */
  function issue(input: IssueInput, requestId?: string): CertificateRequest {
    const now = new Date().toISOString()
    let req = requestId ? getById(requestId) : undefined

    if (!req) {
      state.seq += 1
      req = {
        ...input,
        id: `CRQ-${String(state.seq).padStart(4, '0')}`,
        source: 'Walk-in',
        status: 'Approved',
        requestedAt: now,
      }
      state.items.unshift(req)
    } else {
      Object.assign(req, input, { status: 'Approved' as RequestStatus })
    }

    req.controlNo ??= nextControlNo(req.type)
    req.issuedAt ??= now
    return req
  }

  function release(id: string) {
    const req = getById(id)
    if (req && req.status === 'Approved') {
      req.status = 'Released'
      req.releasedAt = new Date().toISOString()
    }
  }

  function reject(id: string, reason: string) {
    const req = getById(id)
    if (req && req.status === 'Pending') {
      req.status = 'Rejected'
      req.rejectReason = reason
    }
  }

  return { items, getById, issue, release, reject }
}
