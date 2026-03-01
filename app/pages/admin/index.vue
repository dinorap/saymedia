<template>
  <div class="dashboard">
    <!-- KPI row -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">{{ $t('admin.totalCenters') }}</div>
        <div class="kpi-value">12</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ $t('admin.totalUsers') }}</div>
        <div class="kpi-value">8,450</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">{{ $t('admin.monthlyRevenue') }}</div>
        <div class="kpi-value">$350,200</div>
      </div>
      <div class="kpi-card kpi-card--chart">
        <div class="kpi-label">{{ $t('admin.orders') }}</div>
        <div class="kpi-value">12.5K</div>
        <div class="kpi-orb" aria-hidden="true" />
      </div>
    </div>

    <!-- Middle row -->
    <div class="grid-row">
      <div class="card card--wide">
        <div class="card-head">
          <h2 class="card-title">{{ $t('admin.earningsOverview') }}</h2>
          <div class="card-filter">
            <span>{{ $t('admin.thisMonth') }}</span>
            <span class="filter-arrow">▼</span>
          </div>
        </div>
        <div class="chart-wrap">
          <svg
            class="line-chart"
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(0,212,255,0.4)" />
                <stop offset="100%" stop-color="rgba(0,212,255,0)" />
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="rgba(0,212,255,0.25)" />
                <stop offset="100%" stop-color="rgba(0,212,255,0)" />
              </linearGradient>
            </defs>
            <!-- Grid -->
            <line
              x1="40"
              y1="20"
              x2="380"
              y2="20"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="40"
              y1="60"
              x2="380"
              y2="60"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="40"
              y1="100"
              x2="380"
              y2="100"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="40"
              y1="140"
              x2="380"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="40"
              y1="20"
              x2="40"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="120"
              y1="20"
              x2="120"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="200"
              y1="20"
              x2="200"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="280"
              y1="20"
              x2="280"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <line
              x1="360"
              y1="20"
              x2="360"
              y2="140"
              stroke="rgba(255,255,255,0.06)"
              stroke-width="1"
            />
            <!-- Area + line 1 -->
            <path
              fill="url(#lineGrad1)"
              d="M 50 100 L 110 75 L 170 90 L 230 55 L 290 45 L 350 25 L 350 140 L 50 140 Z"
            />
            <path
              fill="none"
              stroke="var(--blue-bright)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M 50 100 L 110 75 L 170 90 L 230 55 L 290 45 L 350 25"
            />
            <circle
              cx="50"
              cy="100"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <circle
              cx="110"
              cy="75"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <circle
              cx="170"
              cy="90"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <circle
              cx="230"
              cy="55"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <circle
              cx="290"
              cy="45"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <circle
              cx="350"
              cy="25"
              r="4"
              fill="var(--blue-bright)"
              class="glow-dot"
            />
            <!-- Line 2 -->
            <path
              fill="url(#lineGrad2)"
              d="M 50 115 L 110 95 L 170 105 L 230 80 L 290 70 L 350 50 L 350 140 L 50 140 Z"
            />
            <path
              fill="none"
              stroke="rgba(0,212,255,0.7)"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M 50 115 L 110 95 L 170 105 L 230 80 L 290 70 L 350 50"
            />
          </svg>
          <div class="chart-labels">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>April</span
            ><span>May</span><span>Jun</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">{{ $t('admin.topPerforming') }}</h2>
        <ul class="center-list">
          <li class="center-item">
            <span class="center-icon">!</span>
            <div class="center-info">
              <span class="center-name">Alpha Center</span>
              <span class="center-value">$85,400</span>
            </div>
          </li>
          <li class="center-item">
            <span class="center-icon">▦</span>
            <div class="center-info">
              <span class="center-name">Beta Hub</span>
              <span class="center-value">$72,300</span>
            </div>
          </li>
          <li class="center-item">
            <span class="center-icon">▶</span>
            <div class="center-info">
              <span class="center-name">Gamma Studio</span>
              <span class="center-value">$65,100</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid-row">
      <div class="card card--wide">
        <h2 class="card-title">{{ $t('admin.topServices') }}</h2>
        <div class="bar-chart">
          <div class="bar-row">
            <span class="bar-icon">🎮</span>
            <span class="bar-label">{{ $t('admin.gameTopup') }}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width: 75%" />
            </div>
          </div>
          <div class="bar-row">
            <span class="bar-icon">📦</span>
            <span class="bar-label">{{ $t('admin.accounts') }}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width: 55%" />
            </div>
          </div>
          <div class="bar-row">
            <span class="bar-icon">⚡</span>
            <span class="bar-label">{{ $t('admin.otherServices') }}</span>
            <div class="bar-track">
              <div class="bar-fill" style="width: 90%" />
            </div>
          </div>
        </div>
      </div>
      <div class="card">
        <h2 class="card-title">{{ $t('admin.recentTransactions') }}</h2>
        <ul class="tx-list">
          <li class="tx-item">
            <span class="tx-icon">👤</span>
            <div class="tx-info">
              <span class="tx-user">User123</span>
              <span class="tx-desc">{{ $t('admin.paymentReceived') }}</span>
            </div>
            <div class="tx-meta">
              <span class="tx-amount">$150.00</span>
              <span class="tx-date">{{ $t('admin.today') }}</span>
            </div>
          </li>
          <li class="tx-item">
            <span class="tx-icon">👥</span>
            <div class="tx-info">
              <span class="tx-user">AgencyXYZ</span>
              <span class="tx-desc">{{ $t('admin.subscriptionRenewal') }}</span>
            </div>
            <div class="tx-meta">
              <span class="tx-amount">$500.00</span>
              <span class="tx-date">{{ $t('admin.yesterday') }}</span>
            </div>
          </li>
          <li class="tx-item">
            <span class="tx-icon">👤</span>
            <div class="tx-info">
              <span class="tx-user">Client456</span>
              <span class="tx-desc">{{ $t('admin.servicePackage') }}</span>
            </div>
            <div class="tx-meta">
              <span class="tx-amount">$1,200.00</span>
              <span class="tx-date">{{ $t('admin.oneDayAgo') }}</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
});
</script>
