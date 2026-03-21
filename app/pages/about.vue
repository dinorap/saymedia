<template>
  <div class="about-page">
    <SiteHeader />
    <main class="about-main">
      <section class="about-frame-wrap">
        <div class="about-embed-box">
          <iframe
            loading="lazy"
            class="about-frame"
            title="SayMedia Intro Canva"
            src="https://www.canva.com/design/DAHEi85aDZk/PJS4P9VFKhLubqQ8LL64Rg/view?embed"
            allowfullscreen="allowfullscreen"
            allow="fullscreen"
          />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";

const { locale } = useI18n();
</script>

<style scoped>
.about-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.about-main {
  flex: 1;
  padding: 96px 20px 24px;
}

.about-hero {
  margin: 0 auto 12px;
  max-width: 980px;
}

.about-title {
  margin: 0 0 6px;
  font-size: 1.7rem;
  font-weight: 750;
}

.about-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.about-frame-wrap {
  margin: 0 auto;
  width: min(1500px, 100%);
}

.about-embed-box {
  position: relative;
  width: 100%;
  height: 0;
  padding-top: 56.25%;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgb(var(--accent-rgb) / 0.35);
  background: rgba(5, 15, 35, 0.9);
  box-shadow: var(--neon-shadow);
}

.about-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  padding: 0;
  margin: 0;
}

.about-source-link {
  display: inline-block;
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.85rem;
  text-decoration: none;
}

.about-source-link:hover {
  color: var(--blue-bright);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .about-main {
    padding: 92px 12px 12px;
  }
  .about-title {
    font-size: 1.35rem;
  }
  .about-subtitle {
    font-size: 0.86rem;
  }
  .about-source-link {
    font-size: 0.78rem;
  }
}
</style>
