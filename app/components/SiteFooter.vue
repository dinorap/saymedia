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
      <div class="footer-cols">
        <div class="footer-col">
          <h4 class="footer-col-title">
            {{ locale === "vi" ? "Tính năng" : "Features" }}
          </h4>
          <ul class="footer-links">
            <li>AI gợi ý sản phẩm</li>
            <li>Thanh toán tự động</li>
            <li>Quản lý đơn hàng</li>
          </ul>
        </div>
        <div class="footer-col">
          <h4 class="footer-col-title">
            {{ locale === "vi" ? "Hỗ trợ" : "Support" }}
          </h4>
          <ul class="footer-links">
            <li>Email: support@saymedia.ai</li>
            <li>Zalo / Hotline: 0387 xxx xxx</li>
          </ul>
        </div>
        <div class="footer-col footer-col--meta">
          <p class="footer-meta">
            © {{ new Date().getFullYear() }} SayMedia AI.
            {{ locale === "vi" ? "Mọi quyền được bảo lưu." : "All rights reserved." }}
          </p>
          <p class="footer-meta footer-meta--small">
            {{ locale === "vi"
              ? "Sản phẩm demo phục vụ mục đích thử nghiệm và quảng bá."
              : "Demo product for testing and marketing purposes." }}
          </p>
        </div>
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
  padding: 16px 150px 20px;
  background:
    radial-gradient(circle at 10% 0, rgb(var(--accent-rgb) / 0.28), transparent 55%),
    radial-gradient(circle at 90% 0, rgba(56, 189, 248, 0.16), transparent 55%),
    radial-gradient(circle at 50% 140%, rgba(15, 23, 42, 0.95), #020617);
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
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.9rem;
}
.footer-text {
  margin: 0;
  max-width: 520px;
}

.footer-cols {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.footer-col {
  min-width: 160px;
}

.footer-col-title {
  margin: 0 0 6px;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-primary);
}

.footer-links {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.82rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-meta {
  margin: 0;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.footer-meta--small {
  margin-top: 4px;
}

@media (max-width: 1024px) {
  .site-footer {
    padding: 14px 20px 18px;
  }
  .footer-inner {
    flex-direction: column;
    align-items: stretch;
  }
  .footer-cols {
    flex-direction: column;
  }
  .footer-meta {
    text-align: left;
  }
}

@media (max-width: 640px) {
  .site-footer {
    padding: 12px 14px 16px;
  }
  .footer-cols {
    gap: 14px;
  }
  .footer-col {
    min-width: 0;
  }
  .footer-text,
  .footer-meta,
  .footer-links {
    font-size: 0.78rem;
  }
}
</style>

