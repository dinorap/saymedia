<template>
  <div class="default-layout">
    <NuxtPage />
    <SiteFooter />
  </div>
</template>

<script setup>
import SiteFooter from "~/components/SiteFooter.vue";
</script>

<style scoped>
.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.default-layout :deep(main) {
  flex: 1 0 auto;
}
</style>

