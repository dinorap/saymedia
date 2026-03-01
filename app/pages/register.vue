<template>
  <div class="page auth-page">
    <div class="particles" aria-hidden="true" />
    <main class="main">
      <AuthRegisterModal standalone />
    </main>
  </div>
</template>

<script setup>
const route = useRoute()

function claimRef() {
  const ref = route.query.ref
  if (ref && typeof ref === 'string' && ref.trim()) {
    return $fetch('/api/auth/register/claim-ref', { query: { ref: ref.trim() } })
  }
  return $fetch('/api/auth/register/claim-ref').catch(() => {})
}

onMounted(claimRef)
watch(() => route.query.ref, claimRef)
</script>
