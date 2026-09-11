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
      const qLower = query.toLowerCase();
      matches = allProducts.filter(p => 
        p.name.toLowerCase().includes(qLower) ||
        p.brand.toLowerCase().includes(qLower) ||
        p.category.toLowerCase().includes(qLower) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.features && p.features.some(f => f.toLowerCase().includes(qLower)))
      );
    }

    if (resultsCount) {
      resultsCount.textContent = `${matches.length} products found`;
    }

    if (!resultsGrid) return;

    if (matches.length === 0) {
      resultsGrid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fa-solid fa-magnifying-glass"></i>
            </div>
            <h3 class="empty-state-title">We couldn't find anything matching "${query}"</h3>
            <p class="empty-state-desc">Try checking your spelling or search using more generic keywords like 'Audio', 'Laptops', or 'Apple'.</p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <a href="products.html" class="btn btn-primary btn-sm">Browse All Products</a>
              <a href="deals.html" class="btn btn-outline btn-sm">Check Today's Deals</a>
            </div>
          </div>
        </div>
      `;
      return;
    }

    resultsGrid.innerHTML = matches.map(p => renderProductCard(p)).join('');

    // Re-bind form submission on search page input
    const form = document.getElementById('search-page-form');
    if (form && searchInput) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = searchInput.value.trim();
        if (val) {
          window.location.search = `?q=${encodeURIComponent(val)}`;
        }
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('search.html')) {
    SearchPageController.init();
  }
});
