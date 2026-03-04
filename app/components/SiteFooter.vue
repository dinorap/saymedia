<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-left">
        <span class="footer-logo">SayMedia AI</span>
        <p class="footer-text">
          {{ locale === "vi"
            ? "Nền tảng SayMedia AI - trợ lý AI cho mua bán dịch vụ, tài khoản, nạp thẻ."
            : "SayMedia AI platform for smart game services, accounts and top-ups." }}
        </p>
      </div>
      <div class="footer-right">
        <p class="footer-meta">
          © {{ new Date().getFullYear() }} SayMedia AI.
          {{ locale === "vi" ? "Mọi quyền được bảo lưu." : "All rights reserved." }}
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const { locale } = useI18n();
</script>

<style scoped>
.site-footer {
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  padding: 14px 150px 18px;
  background: radial-gradient(circle at top, rgba(15, 23, 42, 0.9), #020617);
  color: var(--text-secondary);
  font-size: 0.85rem;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.footer-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.footer-logo {
  font-weight: 700;
  color: var(--text-primary);
}
.footer-text {
  margin: 0;
}
.footer-meta {
  margin: 0;
  text-align: right;
}

@media (max-width: 1024px) {
  .site-footer {
    padding: 12px 20px 16px;
  }
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .footer-meta {
    text-align: left;
  }
}
</style>

