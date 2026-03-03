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
          <NuxtLink to="/register" class="btn-primary">{{
            $t("auth.getStarted")
          }}</NuxtLink>
          <a href="#services" class="btn-secondary">{{
            $t("auth.learnMore")
          }}</a>
        </div>
      </div>
      <div class="hero-image">
        <div class="hero-decor">
          <span class="glow-orb"></span>
        </div>
      </div>
    </main>

    <section id="services" class="stats-container">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <h3>50+</h3>
          <p>{{ $t("stats.services") }}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-info">
          <h3>5,000+</h3>
          <p>{{ $t("stats.customers") }}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <h3>10K+</h3>
          <p>{{ $t("stats.orders") }}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-info">
          <h3>4.9</h3>
          <p>{{ $t("stats.rating") }}</p>
        </div>
      </div>
    </section>

    <SocialProof />
  </div>
</template>

<script setup>
import SocialProof from "~/components/SocialProof.vue";
import SiteHeader from "~/components/SiteHeader.vue";
</script>
