<template>
  <div class="landing-page">
    <header class="header">
      <NuxtLink to="/" class="logo">
        <img src="/logo.png" alt="SayMedia AI" class="logo-img" />
      </NuxtLink>
      <nav class="nav-links">
        <a href="#">{{ $t("nav.home") }}</a>
        <a href="#">{{ $t("nav.services") }}</a>
        <a href="#">{{ $t("nav.pricing") }}</a>
        <a href="#">{{ $t("nav.contact") }}</a>
      </nav>
      <div class="auth-buttons">
        <div class="lang-switcher">
          <button
            type="button"
            class="lang-btn"
            :class="{ active: locale === 'en' }"
            @click="setLocale('en')"
          >
            EN
          </button>
          <span class="lang-sep">|</span>
          <button
            type="button"
            class="lang-btn"
            :class="{ active: locale === 'vi' }"
            @click="setLocale('vi')"
          >
            VI
          </button>
        </div>
        <template v-if="currentUser">
          <div
            class="user-dropdown"
            @mouseenter="showDropdown = true"
            @mouseleave="showDropdown = false"
          >
            <button type="button" class="btn-user-name">
              {{ currentUser.username }}
            </button>
            <div v-show="showDropdown" class="user-dropdown-menu">
              <button
                type="button"
                class="dropdown-item"
                @click="goProfile"
              >
                {{ $t("auth.profile") }}
              </button>
              <button type="button" class="dropdown-item" @click="doLogout">
                {{ $t("auth.logout") }}
              </button>
            </div>
          </div>
        </template>
        <button v-else class="btn-login" @click="navigateTo('/login')">
          {{ $t("auth.login") }}
        </button>
      </div>
    </header>

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
import { useI18n } from "vue-i18n";
import SocialProof from "~/components/SocialProof.vue";
const { locale, setLocale } = useI18n();
const showDropdown = ref(false);
const currentUser = ref(null);

onMounted(async () => {
  const role = useCookie("user_role", { path: "/" }).value;
  if (role === "user") {
    try {
      const data = await $fetch("/api/auth/me");
      if (data?.user) currentUser.value = data.user;
    } catch {
      currentUser.value = null;
    }
  }
});

async function doLogout() {
  try {
    await $fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  currentUser.value = null;
  showDropdown.value = false;
  return navigateTo("/");
}

function goProfile() {
  showDropdown.value = false;
  navigateTo("/profile");
}
</script>
