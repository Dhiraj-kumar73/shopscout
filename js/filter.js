/**
 * SHOPSCOUT — ADVANCED FILTER & SORT CONTROLLER
 */

const FilterController = {
  allProducts: [],
  filteredProducts: [],
  activeFilters: {
    category: [],
    priceMax: 200000,
    rating: 0,
    discount: 0,
    marketplace: []
  },
  currentSort: 'relevance',

  init(products) {
    this.allProducts = [...products];
    this.filteredProducts = [...products];

    // Read any URL params (e.g. ?category=Audio or ?sort=price-low)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
      this.activeFilters.category = [urlParams.get('category')];
    }
    if (urlParams.get('marketplace')) {
      this.activeFilters.marketplace = [urlParams.get('marketplace')];
    }

    this.bindDOMEvents();
    this.applyFilters();
  },

  bindDOMEvents() {
    // Category Checkboxes
    document.querySelectorAll('input[name="filter-category"]').forEach(cb => {
      if (this.activeFilters.category.includes(cb.value)) {
        cb.checked = true;
      }
      cb.addEventListener('change', () => {
        this.activeFilters.category = Array.from(document.querySelectorAll('input[name="filter-category"]:checked')).map(el => el.value);
        this.applyFilters();
      });
    });

    // Marketplace Checkboxes
    document.querySelectorAll('input[name="filter-marketplace"]').forEach(cb => {
      if (this.activeFilters.marketplace.includes(cb.value)) {
        cb.checked = true;
      }
      cb.addEventListener('change', () => {
        this.activeFilters.marketplace = Array.from(document.querySelectorAll('input[name="filter-marketplace"]:checked')).map(el => el.value);
        this.applyFilters();
      });
    });

    // Price Range Slider
    const priceSlider = document.getElementById('filter-price-slider');
    const priceLabel = document.getElementById('filter-price-label');
    if (priceSlider && priceLabel) {
      priceSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.activeFilters.priceMax = val;
        priceLabel.textContent = `Up to ${ShopScout.formatPrice(val)}`;
        this.applyFilters();
      });
    }

    // Rating Filter Radios
    document.querySelectorAll('input[name="filter-rating"]').forEach(rb => {
      rb.addEventListener('change', () => {
        this.activeFilters.rating = Number(rb.value);
        this.applyFilters();
      });
    });

    // Discount Filter Radios
    document.querySelectorAll('input[name="filter-discount"]').forEach(rb => {
      rb.addEventListener('change', () => {
        this.activeFilters.discount = Number(rb.value);
        this.applyFilters();
      });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applySort();
        this.renderResults();
      });
    }

    // Clear All Filters Button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  },

  applyFilters() {
    this.filteredProducts = this.allProducts.filter(p => {
      // Category filter
      if (this.activeFilters.category.length > 0 && !this.activeFilters.category.includes(p.category)) {
        return false;
      }
      // Marketplace filter
      if (this.activeFilters.marketplace.length > 0 && !this.activeFilters.marketplace.includes(p.marketplace)) {
        return false;
      }
      // Price Max
      if (p.price > this.activeFilters.priceMax) {
        return false;
      }
      // Rating
      if (this.activeFilters.rating > 0 && (p.rating || 0) < this.activeFilters.rating) {
        return false;
      }
      // Discount
      if (this.activeFilters.discount > 0 && (p.discount || 0) < this.activeFilters.discount) {
        return false;
      }
      return true;
    });

    this.applySort();
    this.renderResults();
  },

  applySort() {
    switch (this.currentSort) {
      case 'price-low':
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'discount':
        this.filteredProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case 'popular':
        this.filteredProducts.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
        break;
      default: // relevance
        // default list order
        break;
    }
  },

  renderResults() {
    const grid = document.getElementById('catalog-grid');
    const countEl = document.getElementById('results-count');

    if (countEl) {
      countEl.textContent = `Showing ${this.filteredProducts.length} of ${this.allProducts.length} products`;
    }

    if (!grid) return;

    if (this.filteredProducts.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fa-solid fa-filter-circle-xmark"></i>
            </div>
            <h3 class="empty-state-title">No products match your filters</h3>
            <p class="empty-state-desc">Try resetting some filters or adjusting the price range to see more results.</p>
            <button class="btn btn-primary btn-sm" onclick="FilterController.resetFilters()">Reset All Filters</button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredProducts.map(p => renderProductCard(p)).join('');
  },

  resetFilters() {
    this.activeFilters = {
      category: [],
      priceMax: 200000,
      rating: 0,
      discount: 0,
      marketplace: []
    };

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="radio"]').forEach(rb => rb.checked = false);

    const priceSlider = document.getElementById('filter-price-slider');
    const priceLabel = document.getElementById('filter-price-label');
    if (priceSlider && priceLabel) {
      priceSlider.value = 200000;
      priceLabel.textContent = `Up to ₹2,00,000`;
    }

    this.applyFilters();
  }
};
