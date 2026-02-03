<script setup lang="ts">
defineProps<{
  id?: string
}>()
</script>

<template>
  <h1
    :id="id"
    class="text-green-500 border-b-2 border-green-500 pb-2"
  >
    ✨ <slot />
  </h1>
</template>
