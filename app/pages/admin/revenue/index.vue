<template>
  <div class="page-placeholder">
    <h1>{{ $t('admin.revenue') }}</h1>
    <p>{{ $t('admin.revenueDesc') }}</p>
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
