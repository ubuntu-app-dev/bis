<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import ReportSheet from '@/components/layout/secretary/report/report-sheet.vue'
import { formatDate, isoDate } from '@/data/animals'
import { logAudit } from '@/data/audit'
import { generateReport, presetRange, presets, reportToCsvRows, reportTypes, type Range, type Report } from '@/data/reports'
import { downloadCsv } from '@/utils/csv'

/* EDIT THIS: printed at the top of every report. */
const ORG = {
  lines: ['Republic of the Philippines', 'Province of Sample', 'Municipality of Sample Town'],
  barangay: 'Barangay Sample',
}

/* -------------------------------- Settings -------------------------------- */
const typeKey = ref(reportTypes[0].key)
const preset = ref('month')
const custom = reactive<Range>(presetRange('month'))

const type = computed(() => reportTypes.find((t) => t.key === typeKey.value) ?? reportTypes[0])
const range = computed<Range>(() => (preset.value === 'custom' ? { from: custom.from, to: custom.to } : presetRange(preset.value)))

// Switching to "Custom dates" starts from the dates that were showing.
watch(preset, (now, before) => {
  if (now === 'custom' && before !== 'custom') {
    const r = presetRange(before)
    custom.from = r.from
    custom.to = r.to
  }
})

const rangeError = computed(() => {
  if (!type.value.usesPeriod) return ''
  if (!range.value.from || !range.value.to) return 'Choose both dates.'
  if (range.value.from > range.value.to) return 'The start date must be on or before the end date.'
  return ''
})

// What goes into the audit log's "detail" and the CSV file name.
const periodLabel = computed(() => {
  if (!type.value.usesPeriod) return 'As of today'
  if (preset.value !== 'custom') return presets.find((p) => p.key === preset.value)?.label ?? ''
  return `${formatDate(range.value.from, 'long')} to ${formatDate(range.value.to, 'long')}`
})

const signature = computed(() => [typeKey.value, type.value.usesPeriod ? `${range.value.from}..${range.value.to}` : ''].join('|'))

/* -------------------------------- Generating ------------------------------- */
interface Shown {
  report: Report
  range: Range
  usesPeriod: boolean
  periodLabel: string
  signature: string
  confidential: boolean
}

const shown = ref<Shown | null>(null)
const error = ref('')
const stale = computed(() => !!shown.value && shown.value.signature !== signature.value)

function generate() {
  if (rangeError.value) return
  error.value = ''
  try {
    const report = generateReport(typeKey.value, range.value)
    const next: Shown = {
      report,
      range: { ...range.value },
      usesPeriod: type.value.usesPeriod,
      periodLabel: periodLabel.value,
      signature: signature.value,
      // The VAWC summary is counts only, but it still reads confidential records.
      confidential: type.value.key === 'vawc',
    }
    shown.value = next
    logAudit({ module: 'Reports', action: 'Generated report', target: report.title, detail: next.periodLabel, sensitive: next.confidential })
  } catch (e) {
    console.error(e)
    error.value = 'The report could not be generated. Please try again.'
  }
}

/* --------------------------------- Exporting -------------------------------- */
function exportCsv() {
  const s = shown.value
  if (!s) return
  const name = s.usesPeriod ? `${s.report.key}-report-${s.range.from}-to-${s.range.to}.csv` : `${s.report.key}-report-${isoDate()}.csv`
  downloadCsv(name, reportToCsvRows(s.report))
  logAudit({ module: 'Reports', action: 'Exported report', target: s.report.title, detail: s.periodLabel, sensitive: s.confidential })
}

// Printing: a full copy of the report is rendered at the end of <body>. While
// `printing-report` is on <body>, the print stylesheet below hides everything else.
function endPrint() {
  document.body.classList.remove('printing-report')
}

async function print() {
  const s = shown.value
  if (!s) return
  // Logged when the print dialog opens; the browser does not tell us whether it was cancelled.
  logAudit({ module: 'Reports', action: 'Printed report', target: s.report.title, detail: s.periodLabel, sensitive: s.confidential })
  document.body.classList.add('printing-report')
  window.addEventListener('afterprint', endPrint, { once: true })
  await nextTick()
  window.print()
}

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', endPrint)
  endPrint()
})

const fieldClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-800 transition-colors hover:border-slate-400 focus:border-bis-600 focus:outline-none focus:ring-2 focus:ring-bis-600/20'
const secondaryBtn =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600'
</script>

<template>
  <div class="space-y-6">
    <!-- Title + actions -->
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-medium leading-7 tracking-[-0.01em] text-bis-900">Reports</h1>
        <p class="mt-0.5 text-[13px] text-slate-500">Generate summary reports from barangay records</p>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" :class="secondaryBtn" :disabled="!shown" @click="exportCsv">Export CSV</button>
        <button type="button" :class="secondaryBtn" :disabled="!shown" @click="print">Print</button>
      </div>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <!-- Settings -->
      <form class="overflow-hidden rounded-xl border border-slate-200 bg-white" @submit.prevent="generate">
        <fieldset class="px-5 py-4">
          <legend class="text-[13px] font-medium text-slate-900">Report</legend>
          <div class="mt-3 space-y-2">
            <label
              v-for="t in reportTypes"
              :key="t.key"
              :class="[
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                typeKey === t.key ? 'border-bis-600 bg-bis-50/60' : 'border-slate-200 hover:bg-slate-50',
              ]"
            >
              <input v-model="typeKey" type="radio" name="report-type" :value="t.key" class="mt-0.5 size-4 cursor-pointer accent-bis-600" />
              <span>
                <span class="block text-[13px] font-medium text-slate-900">{{ t.label }}</span>
                <span class="block text-[12px] leading-5 text-slate-500">{{ t.description }}</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div class="border-t border-slate-200 px-5 py-4">
          <template v-if="type.usesPeriod">
            <label for="report-period" class="mb-1.5 block text-[13px] font-medium text-slate-700">Period</label>
            <select id="report-period" v-model="preset" :class="fieldClass">
              <option v-for="p in presets" :key="p.key" :value="p.key">{{ p.label }}</option>
            </select>

            <div v-if="preset === 'custom'" class="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label for="report-from" class="mb-1.5 block text-[12px] text-slate-600">From</label>
                <input id="report-from" v-model="custom.from" type="date" :class="fieldClass" />
              </div>
              <div>
                <label for="report-to" class="mb-1.5 block text-[12px] text-slate-600">To</label>
                <input id="report-to" v-model="custom.to" type="date" :class="fieldClass" />
              </div>
            </div>

            <p v-if="rangeError" role="alert" class="mt-2 text-[12px] text-red-600">{{ rangeError }}</p>
            <p v-else class="mt-2 text-[12px] text-slate-500">{{ formatDate(range.from, 'long') }} to {{ formatDate(range.to, 'long') }}</p>
          </template>
          <p v-else class="text-[13px] leading-5 text-slate-500">This report shows the situation as of today, so there is no period to choose.</p>
        </div>

        <div class="border-t border-slate-200 px-5 py-4">
          <button
            type="submit"
            :disabled="!!rangeError"
            class="inline-flex h-10 w-full items-center justify-center rounded-lg bg-bis-600 px-4 text-[13px] font-medium text-white transition-colors hover:bg-bis-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
          >
            Generate report
          </button>
        </div>
      </form>

      <!-- Preview -->
      <section class="min-w-0">
        <div v-if="error" role="alert" class="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{{ error }}</div>

        <div v-if="!shown" class="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
          <p class="text-[14px] font-medium text-bis-900">No report yet</p>
          <p class="mt-0.5 text-[13px] text-slate-500">Choose a report and a period, then press Generate report.</p>
        </div>

        <template v-else>
          <div
            v-if="stale"
            role="status"
            class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800"
          >
            <span>The settings have changed since this report was generated.</span>
            <button
              type="button"
              class="font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!!rangeError"
              @click="generate"
            >
              Generate again
            </button>
          </div>
          <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ReportSheet :report="shown.report" :org="ORG" compact />
          </div>
        </template>
      </section>
    </div>

    <!-- Print copy: hidden on screen, the only thing that prints -->
    <Teleport to="body">
      <div v-if="shown" class="report-print-root">
        <ReportSheet :report="shown.report" :org="ORG" />
      </div>
    </Teleport>
  </div>
</template>

<style>
.report-print-root {
  display: none;
}
@media print {
  body.printing-report > *:not(.report-print-root) {
    display: none !important;
  }
  body.printing-report .report-print-root {
    display: block;
  }
}
</style>