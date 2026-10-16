<script setup lang="ts">
import { computed } from 'vue'

interface Segment {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: Segment[]
    /** Screen-reader description, e.g. "Male 41.9%, Female 58.1%" */
    label: string
    /** Draw a half-circle gauge instead of a full ring */
    semi?: boolean
    /** Ring thickness in viewBox units (the chart is 100 units wide) */
    thickness?: number
  }>(),
  { semi: false, thickness: 9 },
)

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 1.2 // visible gap between segments, in circumference units

// A gauge only uses the top half of the circle.
const span = computed(() => (props.semi ? CIRCUMFERENCE / 2 : CIRCUMFERENCE))
const viewBox = computed(() => (props.semi ? '0 0 100 54' : '0 0 100 100'))
// Full ring starts at 12 o'clock; gauge starts at 9 o'clock and sweeps over the top.
const rotation = computed(() => (props.semi ? 180 : -90))

const arcs = computed(() => {
  const total = props.segments.reduce((sum, s) => sum + s.value, 0)
  let used = 0
  return props.segments.map((s) => {
    const full = total > 0 ? (s.value / total) * span.value : 0
    const gap = props.segments.length > 1 ? Math.min(GAP, full) : 0
    const length = Math.max(full - gap, 0)
    const arc = {
      ...s,
      dasharray: `${length} ${CIRCUMFERENCE - length}`,
      dashoffset: -(used + gap / 2),
    }
    used += full
    return arc
  })
})
</script>

<template>
  <!-- Size it from outside, e.g. class="mx-auto w-44" -->
  <div class="relative">
    <svg :viewBox="viewBox" class="block w-full" role="img" :aria-label="label">
      <circle
        v-for="arc in arcs"
        :key="arc.label"
        cx="50"
        cy="50"
        :r="RADIUS"
        fill="none"
        :stroke="arc.color"
        :stroke-width="thickness"
        :stroke-dasharray="arc.dasharray"
        :stroke-dashoffset="arc.dashoffset"
        :transform="`rotate(${rotation} 50 50)`"
      >
        <title>{{ arc.label }}: {{ arc.value.toLocaleString('en-PH') }}</title>
      </circle>
    </svg>

    <!-- Center content (ring) or bottom-center content (gauge) -->
    <div :class="semi ? 'absolute inset-x-0 bottom-0 text-center' : 'absolute inset-0 grid place-content-center text-center'">
      <slot />
    </div>
  </div>
</template>