<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { CsvCell } from '@/utils/csv'
import type { Report, ReportTable } from '@/data/reports'

// The report as a document. The Reports page shows it on screen (compact) and also
// renders a second, full copy for printing.
const props = defineProps<{
  report: Report
  /** On screen, long tables show a preview with a "show all" button. Print shows every row. */
  compact?: boolean
  org: { lines: string[]; barangay: string }
}>()

const PREVIEW_AT = 12 // tables longer than this are cut down on screen...
const PREVIEW_ROWS = 10 // ...to this many rows

const expanded = reactive(new Set<string>())
watch(
  () => props.report,
  () => expanded.clear(),
)

function visibleRows(t: ReportTable) {
  return props.compact && t.rows.length > PREVIEW_AT && !expanded.has(t.title) ? t.rows.slice(0, PREVIEW_ROWS) : t.rows
}

function toggle(title: string) {
  if (expanded.has(title)) expanded.delete(title)
  else expanded.add(title)
}

// Numbers and percentages line up on the right; text stays on the left.
const isNumeric = (c: CsvCell) => typeof c === 'number' || /^[\d,.]+%?$|^—$/.test(c)

const aligns = computed(() =>
  props.report.tables.map((t) =>
    t.columns.map((_, ci) => {
      const row = t.rows.find((r) => r[ci] !== undefined && r[ci] !== '')
      return row ? isNumeric(row[ci]) : false
    }),
  ),
)

const fmt = (c: CsvCell) => (typeof c === 'number' ? c.toLocaleString('en-PH') : c)
</script>

<template>
  <article :class="['report-sheet text-slate-900', compact ? 'p-5 sm:p-8' : '']">
    <header class="text-center">
      <p v-for="line in org.lines" :key="line" class="text-[12px] leading-5 text-slate-600">{{ line }}</p>
      <p class="text-[14px] font-semibold uppercase tracking-wide">{{ org.barangay }}</p>
      <div class="my-4 h-px w-full bg-slate-300" />
      <h2 class="text-[18px] font-semibold leading-6">{{ report.title }}</h2>
      <p class="mt-1 text-[13px] text-slate-700">{{ report.period }}</p>
      <p class="text-[12px] text-slate-500">Generated {{ report.generatedAt }}</p>
    </header>

    <!-- Summary -->
    <section class="sheet-keep mt-6">
      <h3 class="sheet-h">Summary</h3>
      <dl class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <div v-for="s in report.stats" :key="s.label" class="rounded-lg border border-slate-200 px-3 py-2.5">
          <dt class="text-[12px] leading-4 text-slate-500">{{ s.label }}</dt>
          <dd class="mt-1 text-[18px] font-medium leading-6 tabular-nums">{{ fmt(s.value) }}</dd>
        </div>
      </dl>
    </section>

    <!-- Tables -->
    <section v-for="(t, ti) in report.tables" :key="ti" :class="['mt-6', t.rows.length <= 14 ? 'sheet-keep' : '']">
      <h3 class="sheet-h">{{ t.title }}</h3>
      <div class="mt-2 overflow-x-auto">
        <table class="sheet-table w-full text-left text-[13px]">
          <thead>
            <tr>
              <th v-for="(c, ci) in t.columns" :key="c" scope="col" :class="aligns[ti][ci] ? 'text-right' : ''">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in visibleRows(t)" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci" :class="aligns[ti][ci] ? 'text-right tabular-nums' : ''">{{ fmt(cell) }}</td>
            </tr>
            <tr v-if="!t.rows.length">
              <td :colspan="t.columns.length" class="empty">No records.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button
        v-if="compact && t.rows.length > PREVIEW_AT"
        type="button"
        :aria-expanded="expanded.has(t.title)"
        class="mt-2 text-[13px] font-medium text-bis-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bis-600"
        @click="toggle(t.title)"
      >
        {{ expanded.has(t.title) ? 'Show fewer rows' : `Show all ${t.rows.length} rows` }}
      </button>
    </section>

    <!-- Notes -->
    <section v-if="report.notes.length" class="sheet-keep mt-6">
      <h3 class="sheet-h">Notes</h3>
      <ul class="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-5 text-slate-600">
        <li v-for="n in report.notes" :key="n">{{ n }}</li>
      </ul>
    </section>

    <!-- Signatures -->
    <footer class="sheet-keep mt-10 grid grid-cols-2 gap-10 text-[12px] text-slate-600">
      <div>
        <div class="h-10 border-b border-slate-400" />
        <p class="mt-1">Prepared by (Barangay Secretary)</p>
      </div>
      <div>
        <div class="h-10 border-b border-slate-400" />
        <p class="mt-1">Noted by (Punong Barangay)</p>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.sheet-h {
  font-size: 13px;
  font-weight: 600;
}
.sheet-table th {
  border-bottom: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 0.5rem 0.75rem;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}
.sheet-table td {
  border-bottom: 1px solid #f1f5f9;
  padding: 0.4rem 0.75rem;
  color: #334155;
}
.sheet-table tbody tr:last-child td {
  border-bottom: 0;
}
.sheet-table td.empty {
  padding: 0.75rem;
  text-align: center;
  color: #64748b;
}

@media print {
  .sheet-keep {
    break-inside: avoid;
  }
  .sheet-table thead {
    display: table-header-group;
  }
  .sheet-table tr {
    break-inside: avoid;
  }
  .sheet-table th {
    background: none;
    color: #334155;
  }
  .sheet-table td {
    border-bottom-color: #e2e8f0;
  }
}
</style>