/**
 * SHOPSCOUT — SEARCH PAGE CONTROLLER
 */

const SearchPageController = {
  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';

    const searchInput = document.getElementById('search-page-input');
    const queryDisplay = document.getElementById('search-query-display');
    const resultsCount = document.getElementById('search-results-count');
    const resultsGrid = document.getElementById('search-results-grid');

    if (searchInput) searchInput.value = query;
    if (queryDisplay) queryDisplay.textContent = query ? `"${query}"` : 'All Products';

    const allProducts = await ProductService.getAllProducts();
    let matches = allProducts;

    const renderResults = (val) => {
      const q = (val || '').trim();
      const matches = q ? ShopScout.fuzzySearch(allProducts, q) : allProducts;
      if (queryDisplay) queryDisplay.textContent = q ? `"${q}"` : 'All Products';
      if (resultsCount) {
        resultsCount.innerHTML = q 
          ? `<span><strong>${matches.length}</strong> products found for "<em>${q}</em>"</span> <span class="badge" style="background: rgba(37,99,235,0.1); color: var(--primary); font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); margin-left: 0.5rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Instant Results</span>`
          : `<span><strong>${matches.length}</strong> products in catalog</span>`;
      }

      if (!resultsGrid) return;

      if (matches.length === 0) {
        const trending = allProducts.slice(0, 8);
        const safeQ = (q || '').replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
        resultsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 2.75rem 1.25rem 2rem; background: var(--surface); border: 1.5px dashed var(--border); border-radius: var(--radius-lg); margin-bottom: 2.5rem; box-shadow: var(--shadow-sm);">
            <div style="width: 64px; height: 64px; margin: 0 auto 1.25rem; border-radius: 50%; background: rgba(234, 88, 12, 0.12); color: var(--deal-orange); display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
              <i class="fa-solid fa-magnifying-glass-arrow-right"></i>
            </div>
            <h3 style="font-weight: 800; font-size: 1.35rem; color: var(--text); margin-bottom: 0.6rem;">
              "${safeQ}" ke liye koi product nahi mila
            </h3>
            <p style="color: var(--muted); font-size: 0.92rem; max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.6;">
              Aapka search kiya gaya item catalog me uplabdh nahi hai. Kripya spelling check karein ya in popular categories me se chuney:
            </p>
            <div style="display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.5rem;">
              <button type="button" class="btn btn-outline btn-sm search-chip-btn" data-query="Mobile" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">📱 Mobiles</button>
              <button type="button" class="btn btn-outline btn-sm search-chip-btn" data-query="Laptop" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">💻 Laptops</button>
              <button type="button" class="btn btn-outline btn-sm search-chip-btn" data-query="Audio" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">🎧 Audio &amp; boAt</button>
              <button type="button" class="btn btn-outline btn-sm search-chip-btn" data-query="Watch" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">⌚ Smartwatches</button>
              <a href="deals.html" class="btn btn-outline btn-sm" style="border-radius: var(--radius-full); font-weight: 700; color: var(--deal-orange); border-color: rgba(234,88,12,0.4); padding: 0.4rem 0.9rem;"><i class="fa-solid fa-fire"></i> Today's Deals</a>
              <a href="products.html" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); font-weight: 700; padding: 0.4rem 1rem;">Browse Full Catalog &rarr;</a>
            </div>
          </div>
          ${trending.length > 0 ? `
            <div style="grid-column: 1 / -1; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h4 style="font-weight: 800; font-size: 1.2rem; color: var(--text); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                  <i class="fa-solid fa-fire" style="color: var(--deal-orange);"></i> Popular Products You Might Like:
                </h4>
                <p style="font-size: 0.8rem; color: var(--muted); margin: 0.2rem 0 0;">Top verified trending products available right now</p>
              </div>
              <a href="products.html" class="btn btn-outline btn-xs" style="font-weight: 700;">View All &rarr;</a>
            </div>
            ${trending.map(p => renderProductCard(p)).join('')}
          ` : ''}
        `;

        resultsGrid.querySelectorAll('.search-chip-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const tQ = btn.getAttribute('data-query');
            if (typeof window.executeSearchPageSearch === 'function') {
              window.executeSearchPageSearch(tQ);
            }
          });
        });
        return;
      } else {
        resultsGrid.innerHTML = matches.map(p => renderProductCard(p)).join('');
      }
    };

    window.executeSearchPageSearch = function(q) {
      renderResults(q);
      const headerInputs = document.querySelectorAll('.header-search-input');
      headerInputs.forEach(i => { i.value = q; });
      try {
        const newUrl = new URL(window.location.href);
        if (q) newUrl.searchParams.set('q', q);
        else newUrl.searchParams.delete('q');
        window.history.pushState({}, '', newUrl.toString());
      } catch (e) {}
    };

    // Initial render
    renderResults(query);
    const headerInputs = document.querySelectorAll('.header-search-input');
    headerInputs.forEach(i => { if (query) i.value = query; });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('search.html')) {
    SearchPageController.init();
  }
});
