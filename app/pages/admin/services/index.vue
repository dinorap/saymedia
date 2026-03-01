<template>
  <div class="page-placeholder">
    <h1>{{ $t('admin.services') }}</h1>
    <p>{{ $t('admin.servicesDesc') }}</p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin', middleware: ['admin'] })
</script>

<style scoped>
.page-placeholder { padding: 1rem; }
.page-placeholder h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
.page-placeholder p { color: var(--text-muted); }
</style>
