<template>
  <div class="landing-page">
    <SiteHeader />

    <main class="hero">
      <div class="hero-content">
        <h1>
          {{ $t("hero.title") }} <br /><span class="highlight">{{
            $t("hero.titleHighlight")
          }}</span>
        </h1>
        <p>{{ $t("hero.subtitle") }}</p>
        <div class="cta-buttons">
          <NuxtLink
            :to="isLoggedIn ? '/products' : '/register'"
            class="btn-primary"
          >
            {{ $t("auth.getStarted") }}
          </NuxtLink>
          <NuxtLink to="/products" class="btn-secondary">
            {{ $t("auth.learnMore") }}
          </NuxtLink>
        </div>
      </div>
      <div class="hero-image"></div>
    </main>

    <section id="services" class="stats-container">
      <div class="stat-card">
        <div class="stat-card-inner">
          <div class="stat-card-face stat-card-face--front">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
              <h3>50+</h3>
              <p>{{ $t("stats.services") }}</p>
            </div>
          </div>
          <div class="stat-card-face stat-card-face--back">
            <div class="stat-icon">🔄</div>
            <div class="stat-info">
              <h3>24/7</h3>
              <p>Hỗ trợ & cập nhật liên tục</p>
            </div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-inner">
          <div class="stat-card-face stat-card-face--front">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <h3>5,000+</h3>
              <p>{{ $t("stats.customers") }}</p>
            </div>
          </div>
          <div class="stat-card-face stat-card-face--back">
            <div class="stat-icon">🛡️</div>
            <div class="stat-info">
              <h3>100%</h3>
              <p>Giao dịch an toàn, bảo mật</p>
            </div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-inner">
          <div class="stat-card-face stat-card-face--front">
            <div class="stat-icon">✅</div>
            <div class="stat-info">
              <h3>10K+</h3>
              <p>{{ $t("stats.orders") }}</p>
            </div>
          </div>
          <div class="stat-card-face stat-card-face--back">
            <div class="stat-icon">⚡</div>
            <div class="stat-info">
              <h3>Nhanh</h3>
              <p>Xử lý trong vài phút</p>
            </div>
          </div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-inner">
          <div class="stat-card-face stat-card-face--front">
            <div class="stat-icon">⭐</div>
            <div class="stat-info">
              <h3>4.9</h3>
              <p>{{ $t("stats.rating") }}</p>
            </div>
          </div>
          <div class="stat-card-face stat-card-face--back">
            <div class="stat-icon">🎁</div>
            <div class="stat-info">
              <h3>Ưu đãi</h3>
              <p>Khuyến mãi cho thành viên mới</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="landing-section landing-section--features">
      <div class="landing-feature-grid">
        <article class="feature-card">
          <h3 class="feature-title">{{ $t("home.featureFastTitle") }}</h3>
          <p class="feature-text">
            {{ $t("home.featureFastBody") }}
          </p>
        </article>
        <article class="feature-card">
          <h3 class="feature-title">{{ $t("home.featureSafeTitle") }}</h3>
          <p class="feature-text">
            {{ $t("home.featureSafeBody") }}
          </p>
        </article>
        <article class="feature-card">
          <h3 class="feature-title">{{ $t("home.featureSupportTitle") }}</h3>
          <p class="feature-text">
            {{ $t("home.featureSupportBody") }}
          </p>
        </article>
      </div>
    </section>

    <div class="landing-two-col">
      <section class="landing-section landing-section--social-proof">
        <div class="landing-social-head-row">
          <div class="landing-section-head landing-section-head--left">
            <h2 class="landing-section-title">
              {{ $t("socialProof.title") || "Đơn hàng gần đây" }}
            </h2>
          </div>
          <div
            class="landing-section-head landing-section-head--left landing-section-head--chat"
          >
            <h2 class="landing-section-title">{{ $t("communityChat.title") }}</h2>
            <p class="landing-section-subtitle landing-section-subtitle--chat">
              {{ $t("communityChat.subtitle") }}
            </p>
          </div>
        </div>
        <div class="landing-social-row">
          <div class="landing-social-col">
            <div class="landing-social-proof-wrap">
              <SocialProof />
            </div>
          </div>
          <div class="landing-social-col landing-social-col--chat">
            <CommunityChat />
          </div>
        </div>
      </section>
    </div>

    <section class="landing-section landing-section--how">
      <div class="landing-section-head landing-section-head--left">
        <h2 class="landing-section-title">
          {{ $t("home.howTitle") }}
        </h2>
        <p class="landing-section-subtitle">
          {{ $t("home.howSubtitle") }}
        </p>
      </div>
      <ol class="how-steps">
        <li class="how-step">
          <span class="how-step-index">1</span>
          <div class="how-step-body">
            <div class="how-step-title">{{ $t("home.howStep1Title") }}</div>
            <div class="how-step-text">{{ $t("home.howStep1Body") }}</div>
          </div>
        </li>
        <li class="how-step">
          <span class="how-step-index">2</span>
          <div class="how-step-body">
            <div class="how-step-title">{{ $t("home.howStep2Title") }}</div>
            <div class="how-step-text">{{ $t("home.howStep2Body") }}</div>
          </div>
        </li>
        <li class="how-step">
          <span class="how-step-index">3</span>
          <div class="how-step-body">
            <div class="how-step-title">{{ $t("home.howStep3Title") }}</div>
            <div class="how-step-text">{{ $t("home.howStep3Body") }}</div>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup>
import SocialProof from "~/components/SocialProof.vue";
import SiteHeader from "~/components/SiteHeader.vue";
import CommunityChat from "~/components/CommunityChat.vue";

const roleCookie = useCookie("user_role", { path: "/" });
const isLoggedIn = computed(() => roleCookie.value === "user");
</script>

<style scoped>
.cta-buttons a {
  border-radius: 999px;
  text-decoration: none;
}

.landing-section {
  padding: 0 150px 80px;
}

.landing-section--features {
  margin-top: -8px;
}

.landing-two-col {
  display: flex;
  gap: 2rem;
  padding: 0 150px 40px;
  align-items: flex-start;
}

.landing-two-col .landing-section {
  flex: 1;
  min-width: 0;
  padding: 0;
}

.landing-section--social-proof {
  padding-top: 30px;
}

.landing-section--how {
  padding-top: 10px;
}

.landing-social-proof-wrap {
  display: flex;
}

.landing-social-head-row {
  display: flex;

  align-items: flex-end;
  gap: 24px;
  margin-bottom: 12px;
}

.landing-section-head--chat {
  text-align: right;
}

.landing-section-subtitle--chat {
  font-size: 0.85rem;
}

.landing-social-row {
  display: flex;
  gap: 28px;
  align-items: stretch;
}

.landing-social-col {
  flex: 1;
  min-width: 0;
  display: flex;
}

.landing-social-col:first-child {
  flex: 0.5;
}

.landing-social-col--chat {
  display: flex;
  flex: 0.5;
}

.landing-social-col > * {
  flex: 1;
  width: 100%;
}

/* Kéo panel đơn hàng gần đây cao đều với khung chat */
.landing-social-col .social-proof-panel {
  height: 100%;
}

/* Ẩn header bên trong component chat để tránh trùng title */
.landing-social-col--chat .community-chat .chat-header {
  display: none;
}

.landing-section-head {
  max-width: 720px;

  text-align: center;
}

.landing-section-head--left {
  max-width: none;
  flex: 0.5;
}

.landing-section-title {
  margin: 0 0 10px;
  font-size: 1.9rem;
  font-weight: 700;
}

.landing-section-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.landing-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.feature-card {
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(5, 15, 35, 0.85);
  border: 1px solid rgb(var(--accent-rgb) / 0.28);
  box-shadow: 0 0 26px rgb(var(--accent-rgb) / 0.18);
}

.feature-title {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 600;
}

.feature-text {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.how-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.how-step {
  display: flex;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(5, 15, 35, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.45);
}

.how-step-index {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--blue-soft);
  border: 1px solid var(--blue-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
}

.how-step-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.how-step-title {
  font-weight: 600;
}

.how-step-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.landing-section--cta {
  padding-top: 24px;
  padding-bottom: 90px;
}

.landing-cta-content {
  border-radius: 18px;
  border: 1px solid rgb(var(--accent-rgb) / 0.45);
  background:
    radial-gradient(circle at 0 0, rgb(var(--accent-rgb) / 0.25), transparent 55%),
    rgba(5, 15, 35, 0.96);
  box-shadow:
    0 0 30px rgb(var(--accent-rgb) / 0.35),
    0 20px 60px rgba(15, 23, 42, 0.9);
  padding: 22px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.landing-cta-title {
  margin: 0 0 6px;
  font-size: 1.4rem;
  font-weight: 650;
}

.landing-cta-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.landing-cta-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.landing-cta-btn {
  border-radius: 999px;
  text-decoration: none;
  padding-inline: 22px;
}

@media (max-width: 1024px) {
  .landing-section {
    padding: 0 20px 60px;
  }
  .landing-two-col {
    flex-direction: column;
    padding: 0 20px 60px;
  }
  .landing-feature-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .landing-cta-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
