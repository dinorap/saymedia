<template>
  <div class="default-layout">
    <main class="page-main">
      <NuxtPage />
    </main>
    <SiteFooter />
    <ContactBubble />
  </div>
</template>

<script setup>
import SiteFooter from "~/components/SiteFooter.vue";
import ContactBubble from "~/components/ContactBubble.vue";
</script>

<style scoped>
.default-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

.page-main :deep(> *) {
  flex: 1 0 auto;
}
</style>
