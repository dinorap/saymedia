<template>
  <div class="pricing-page">
    <SiteHeader />

    <main class="pricing-main">
      <section class="pricing-hero">
        <div class="pricing-hero-inner">
          <div>
            <h1 class="pricing-title">{{ $t("pricing.title") }}</h1>
            <p class="pricing-subtitle">
              {{ $t("pricing.subtitle") }}
            </p>
          </div>
          <p class="pricing-note">
            {{ $t("pricing.note") }}
          </p>
        </div>
      </section>

      <section class="pricing-grid">
        <article class="pricing-card">
          <h2 class="plan-name">{{ $t("pricing.starter.name") }}</h2>
          <p class="plan-tagline">{{ $t("pricing.starter.tagline") }}</p>
          <p class="plan-price">
            <span class="plan-amount">50.000</span>
            <span class="plan-unit">VND / tháng</span>
          </p>
          <ul class="plan-features">
            <li>{{ $t("pricing.starter.f1") }}</li>
            <li>{{ $t("pricing.starter.f2") }}</li>
            <li>{{ $t("pricing.starter.f3") }}</li>
          </ul>
        </article>

        <article class="pricing-card pricing-card--highlight">
          <div class="plan-badge">{{ $t("pricing.popular") }}</div>
          <h2 class="plan-name">{{ $t("pricing.pro.name") }}</h2>
          <p class="plan-tagline">{{ $t("pricing.pro.tagline") }}</p>
          <p class="plan-price">
            <span class="plan-amount">150.000</span>
            <span class="plan-unit">VND / tháng</span>
          </p>
          <ul class="plan-features">
            <li>{{ $t("pricing.pro.f1") }}</li>
            <li>{{ $t("pricing.pro.f2") }}</li>
            <li>{{ $t("pricing.pro.f3") }}</li>
            <li>{{ $t("pricing.pro.f4") }}</li>
          </ul>
        </article>

        <article class="pricing-card">
          <h2 class="plan-name">{{ $t("pricing.agency.name") }}</h2>
          <p class="plan-tagline">{{ $t("pricing.agency.tagline") }}</p>
          <p class="plan-price">
            <span class="plan-amount">Liên hệ</span>
          </p>
          <ul class="plan-features">
            <li>{{ $t("pricing.agency.f1") }}</li>
            <li>{{ $t("pricing.agency.f2") }}</li>
            <li>{{ $t("pricing.agency.f3") }}</li>
          </ul>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";
</script>

<style scoped>
.pricing-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.pricing-main {
  flex: 1;
  padding: 96px 150px 80px;
}

.pricing-hero-inner {
  border-radius: 20px;
  padding: 20px 22px 18px;
  background:
    radial-gradient(circle at 0 0, rgba(1, 123, 251, 0.28), transparent 55%),
    rgba(5, 15, 35, 0.96);
  border: 1px solid rgba(1, 123, 251, 0.55);
  box-shadow:
    0 0 36px rgba(1, 123, 251, 0.35),
    0 20px 60px rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.pricing-title {
  margin: 0 0 6px;
  font-size: 1.8rem;
  font-weight: 700;
}

.pricing-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.pricing-note {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  max-width: 280px;
  text-align: right;
}

.pricing-grid {
  margin-top: 26px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.pricing-card {
  border-radius: 18px;
  padding: 18px 18px 20px;
  color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 0 28px rgba(15, 23, 42, 0.9);
}

.pricing-card--highlight {
  border-color: rgba(1, 123, 251, 0.9);
  box-shadow:
    0 0 40px rgba(1, 123, 251, 0.55),
    0 18px 50px rgba(15, 23, 42, 0.95);
  position: relative;
}

.plan-badge {
  position: absolute;
  top: 12px;
  right: 14px;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--text-primary);
  border: 1px solid rgba(34, 197, 94, 0.5);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #bbf7d0;
}

.plan-name {
  margin: 0 0 4px;
  font-size: 1.15rem;
  font-weight: 650;
}

.plan-tagline {
  margin: 0 0 10px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.plan-price {
  margin: 0 0 12px;
  font-size: 1.4rem;
  font-weight: 800;
}

.plan-unit {
  margin-left: 6px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 500;
}

.plan-features {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (max-width: 1024px) {
  .pricing-main {
    padding: 80px 20px 60px;
  }
  .pricing-hero-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .pricing-note {
    text-align: left;
    max-width: 100%;
  }
  .pricing-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

