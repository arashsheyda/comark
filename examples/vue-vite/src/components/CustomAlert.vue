<script setup lang="ts">
defineProps<{
  type?: 'info' | 'warning' | 'error' | 'success'
}>()

const typeStyles = {
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100',
  warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100',
  error: 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100',
  success: 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100',
}
</script>

<template>
  <div :class="['border-l-4 p-4 my-4 rounded-r', typeStyles[type || 'info']]">
    <slot />
  </div>
</template>
