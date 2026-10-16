<script setup lang="ts">
import { bisIcons, type BisIconName } from './bisIcons'

withDefaults(
  defineProps<{
    name: BisIconName
    size?: number
    strokeWidth?: number
  }>(),
  { size: 20, strokeWidth: 1.75 },
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="shrink-0"
    v-html="bisIcons[name]"
  />
</template>
