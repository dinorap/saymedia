<template>
  <div class="contact-page">
    <SiteHeader />

    <main class="contact-main">
      <section class="contact-hero">
        <div class="contact-hero-inner">
          <div class="contact-copy">
            <h1 class="contact-title">{{ $t("contact.title") }}</h1>
            <p class="contact-subtitle">
              {{ $t("contact.subtitle") }}
            </p>
            <ul class="contact-points">
              <li>{{ $t("contact.p1") }}</li>
              <li>{{ $t("contact.p2") }}</li>
              <li>{{ $t("contact.p3") }}</li>
            </ul>
          </div>
          <div class="contact-info">
            <h2 class="contact-info-title">{{ $t("contact.infoTitle") }}</h2>
            <p class="contact-line">
              <span class="label">Email:</span>
              <a href="mailto:support@saymedia.ai">support@saymedia.ai</a>
            </p>
            <p class="contact-line">
              <span class="label">Zalo / Hotline:</span>
              0387 xxx xxx
            </p>
            <p class="contact-line">
              <span class="label">{{ $t("contact.timeLabel") }}</span>
              {{ $t("contact.timeValue") }}
            </p>
          </div>
        </div>
      </section>

      <section class="contact-form-section">
        <div class="contact-form-card">
          <h2 class="form-title">{{ $t("contact.formTitle") }}</h2>
          <p class="form-subtitle">
            {{ $t("contact.formSubtitle") }}
          </p>
          <form class="contact-form" @submit.prevent>
            <div class="form-row">
              <label for="name">{{ $t("contact.name") }}</label>
              <input id="name" type="text" class="input" />
            </div>
            <div class="form-row">
              <label for="email">{{ $t("contact.email") }}</label>
              <input id="email" type="email" class="input" />
            </div>
            <div class="form-row">
              <label for="message">{{ $t("contact.message") }}</label>
              <textarea id="message" rows="4" class="input textarea" />
            </div>
            <button type="submit" class="btn-primary form-btn" disabled>
              {{ $t("contact.formButton") }}
            </button>
            <p class="form-note">
              {{ $t("contact.formNote") }}
            </p>
          </form>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import SiteHeader from "~/components/SiteHeader.vue";
</script>

<style scoped>
.contact-page {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
}

.contact-main {
  flex: 1;
  padding: 96px 150px 80px;
}

.contact-hero-inner {
  border-radius: 20px;
  padding: 22px 22px 20px;
  background:
    radial-gradient(circle at 0 0, rgba(1, 123, 251, 0.22), transparent 55%),
    rgba(5, 15, 35, 0.96);
  border: 1px solid rgba(1, 123, 251, 0.55);
  box-shadow:
    0 0 30px rgba(1, 123, 251, 0.35),
    0 20px 60px rgba(15, 23, 42, 0.95);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 26px;
}

.contact-title {
  margin: 0 0 6px;
  font-size: 1.8rem;
  font-weight: 700;
}

.contact-subtitle {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.contact-points {
  margin: 0;
  padding-left: 1.15rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-info {
  min-width: 260px;
}

.contact-info-title {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
}

.contact-line {
  margin: 0 0 4px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.contact-line .label {
  display: inline-block;
  min-width: 120px;
  color: var(--text-muted);
}

.contact-line a {
  color: var(--blue-bright);
  text-decoration: none;
}

.contact-line a:hover {
  text-decoration: underline;
}

.contact-form-section {
  margin-top: 26px;
}

.contact-form-card {
  max-width: 640px;
  border-radius: 18px;
  padding: 20px 22px 22px;
  background: rgba(5, 15, 35, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 0 28px rgba(15, 23, 42, 0.9);
}

.form-title {
  margin: 0 0 6px;
  font-size: 1.2rem;
  font-weight: 650;
}

.form-subtitle {
  margin: 0 0 14px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.contact-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.input {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(15, 23, 42, 0.95);
  color: var(--text-primary);
  padding: 8px 10px;
  font-size: 0.9rem;
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.form-btn {
  margin-top: 4px;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-note {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

@media (max-width: 1024px) {
  .contact-main {
    padding: 80px 20px 60px;
  }
  .contact-hero-inner {
    flex-direction: column;
  }
}
</style>

