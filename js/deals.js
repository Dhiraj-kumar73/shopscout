/**
 * SHOPSCOUT — DEALS & FLASH OFFERS CONTROLLER
 */

const DealsController = {
  allDeals: [],
  currentTier: 'all',

  async init() {
    this.allDeals = await ProductService.getDeals();
    this.initCountdownTimer();
    this.bindTierTabs();
    this.renderDeals();
  },

  initCountdownTimer() {
    const timerEls = document.querySelectorAll('.deal-timer-value');
    if (timerEls.length === 0) return;

    let totalSeconds = 5 * 3600 + 42 * 60 + 19; // 5h 42m 19s

    setInterval(() => {
      if (totalSeconds <= 0) totalSeconds = 24 * 3600;
      totalSeconds--;

      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');

      timerEls.forEach(el => {
        el.textContent = `${h}h : ${m}m : ${s}s`;
      });
    }, 1000);
  },

  bindTierTabs() {
    document.querySelectorAll('.deal-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.deal-tier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTier = btn.getAttribute('data-tier');
        this.renderDeals();
      });
    });
  },

  renderDeals() {
    const grid = document.getElementById('deals-grid');
    if (!grid) return;

    let filtered = [...this.allDeals];

    if (this.currentTier === 'flash') {
      filtered = filtered.filter(p => p.dealEndsInHours && p.dealEndsInHours <= 24);
    } else if (this.currentTier === 'under-999') {
      filtered = filtered.filter(p => p.price <= 999);
    } else if (this.currentTier === 'under-4999') {
      filtered = filtered.filter(p => p.price <= 4999);
    } else if (this.currentTier === 'fifty-off') {
      filtered = filtered.filter(p => (p.discount || 0) >= 30);
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="fa-solid fa-tag"></i></div>
            <h3 class="empty-state-title">No deals found for this tier right now</h3>
            <p class="empty-state-desc">Check back soon as prices and lightning deals from Amazon refresh frequently.</p>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => renderProductCard(p)).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('deals.html')) {
    DealsController.init();

    // Auto-refresh deals when returning to this tab or when new products are saved
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        ProductService._cache = null;
        DealsController.allDeals = await ProductService.getDeals();
        DealsController.renderDeals();
      }
    });

    window.addEventListener('storage', async (e) => {
      if (!e.key || e.key.includes('shopscout')) {
        ProductService._cache = null;
        DealsController.allDeals = await ProductService.getDeals();
        DealsController.renderDeals();
      }
    });
  }
});
