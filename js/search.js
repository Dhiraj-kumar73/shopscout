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

    if (query) {
      matches = ShopScout.fuzzySearch(allProducts, query);
    }

    if (resultsCount) {
      resultsCount.innerHTML = query 
        ? `<span><strong>${matches.length}</strong> products found for "<em>${query}</em>"</span> <span class="badge" style="background: rgba(37,99,235,0.1); color: var(--primary); font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); margin-left: 0.5rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Smart Search</span>`
        : `<span><strong>${matches.length}</strong> products in catalog</span>`;
    }

    if (!resultsGrid) return;

    if (matches.length === 0) {
      // Fallback: show trending products if available so user doesn't hit a dead end
      const trending = allProducts.slice(0, 4);
      resultsGrid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state" style="padding: 2.5rem 1rem;">
            <div class="empty-state-icon" style="color: var(--deal-orange);">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <h3 class="empty-state-title">No exact products found for "${query}"</h3>
            <p class="empty-state-desc">Try checking the brand name or search for generic terms like <strong>Audio, Speaker, Mouse, or Laptops</strong>.</p>
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
      return;
    }

    resultsGrid.innerHTML = matches.map(p => renderProductCard(p)).join('');

    // Real-time live filtering as user types
    let typeTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => {
          const val = searchInput.value.trim();
          const newMatches = val ? ShopScout.fuzzySearch(allProducts, val) : allProducts;
          if (queryDisplay) queryDisplay.textContent = val ? `"${val}"` : 'All Products';
          if (resultsCount) {
            resultsCount.innerHTML = val 
              ? `<span><strong>${newMatches.length}</strong> products found for "<em>${val}</em>"</span> <span class="badge" style="background: rgba(37,99,235,0.1); color: var(--primary); font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); margin-left: 0.5rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Live Search</span>`
              : `<span><strong>${newMatches.length}</strong> products in catalog</span>`;
          }
          if (newMatches.length === 0) {
            resultsGrid.innerHTML = `
              <div style="grid-column: 1 / -1;">
                <div class="empty-state" style="padding: 2.5rem 1rem;">
                  <div class="empty-state-icon" style="color: var(--deal-orange);">
                    <i class="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <h3 class="empty-state-title">No products found for "${val}"</h3>
                  <p class="empty-state-desc">Try searching for <strong>Mobile, Samsung, iPhone, Speaker, or Laptops</strong>.</p>
                </div>
              </div>
            `;
          } else {
            resultsGrid.innerHTML = newMatches.map(p => renderProductCard(p)).join('');
          }
        }, 180);
      });
    }

    // In-place form submission: instant search like Amazon/Google without page reload
    const form = document.getElementById('search-page-form');
    if (form && searchInput) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = searchInput.value.trim();
        const newMatches = val ? ShopScout.fuzzySearch(allProducts, val) : allProducts;
        if (queryDisplay) queryDisplay.textContent = val ? `"${val}"` : 'All Products';
        if (resultsCount) {
          resultsCount.innerHTML = val 
            ? `<span><strong>${newMatches.length}</strong> products found for "<em>${val}</em>"</span> <span class="badge" style="background: rgba(37,99,235,0.1); color: var(--primary); font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: var(--radius-full); margin-left: 0.5rem;"><i class="fa-solid fa-wand-magic-sparkles"></i> Instant Results</span>`
            : `<span><strong>${newMatches.length}</strong> products in catalog</span>`;
        }
        if (newMatches.length === 0) {
          resultsGrid.innerHTML = `
            <div style="grid-column: 1 / -1;">
              <div class="empty-state" style="padding: 2.5rem 1rem;">
                <div class="empty-state-icon" style="color: var(--deal-orange);">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <h3 class="empty-state-title">No products found for "${val}"</h3>
                <p class="empty-state-desc">Try searching for <strong>Mobile, Samsung, iPhone, Speaker, or Laptops</strong>.</p>
              </div>
            </div>
          `;
        } else {
          resultsGrid.innerHTML = newMatches.map(p => renderProductCard(p)).join('');
        }
        // Update URL cleanly without reloading page
        const newUrl = new URL(window.location.href);
        if (val) newUrl.searchParams.set('q', val);
        else newUrl.searchParams.delete('q');
        window.history.pushState({}, '', newUrl.toString());
        searchInput.blur();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('search.html')) {
    SearchPageController.init();
  }
});
