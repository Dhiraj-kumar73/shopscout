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

  displayedCount: 16,
  pageSize: 16,

  bindTierTabs() {
    document.querySelectorAll('.deal-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.deal-tier-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTier = btn.getAttribute('data-tier');
        this.displayedCount = this.pageSize;
        this.renderDeals();
      });
    });
  },

  loadMore() {
    this.displayedCount += this.pageSize;
    this.renderDeals();
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

    const visibleItems = filtered.slice(0, this.displayedCount);
    const hasMore = filtered.length > this.displayedCount;

    grid.innerHTML = visibleItems.map(p => renderProductCard(p)).join('') + (hasMore ? `
      <div class="load-more-wrap" style="grid-column: 1 / -1; text-align: center; padding: 1.5rem 0 0.5rem;">
        <button type="button" class="btn btn-outline" onclick="DealsController.loadMore()" style="border-radius: var(--radius-full); padding: 0.65rem 2rem; font-weight: 700; gap: 0.5rem; display: inline-flex; align-items: center; border-color: var(--primary); color: var(--primary);">
          <i class="fa-solid fa-arrow-down"></i> Show More Deals (${filtered.length - this.displayedCount} remaining)
        </button>
      </div>
    ` : '');
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
