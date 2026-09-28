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
        const trending = allProducts.slice(0, 4);
        resultsGrid.innerHTML = `
          <div style="grid-column: 1 / -1;">
            <div class="empty-state" style="padding: 2.5rem 1rem;">
              <div class="empty-state-icon" style="color: var(--deal-orange);">
                <i class="fa-solid fa-magnifying-glass"></i>
              </div>
              <h3 class="empty-state-title">No exact products found for "${q}"</h3>
              <p class="empty-state-desc">Try checking the brand name or search for generic terms like <strong>Mobile, Samsung, iPhone, Audio, Speaker, or Laptops</strong>.</p>
              <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem;">
                <a href="products.html" class="btn btn-primary btn-sm">Browse All Products</a>
                <a href="deals.html" class="btn btn-outline btn-sm">Today's Deals</a>
              </div>
            </div>
          </div>
          ${trending.length > 0 ? `
            <div style="grid-column: 1 / -1; margin-top: 2rem; margin-bottom: 0.5rem;">
              <h4 style="font-weight: 800; font-size: 1.1rem; color: var(--text);">Popular Products You Might Like:</h4>
            </div>
            ${trending.map(p => renderProductCard(p)).join('')}
          ` : ''}
        `;
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
