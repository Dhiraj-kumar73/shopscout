/**
 * SHOPSCOUT — ADVANCED FILTER & SORT CONTROLLER
 */

const FilterController = {
  allProducts: [],
  filteredProducts: [],
  activeFilters: {
    category: [],
    priceMin: 0,
    priceMax: 200000,
    rating: 0,
    discount: 0,
    marketplace: []
  },
  currentSort: 'relevance',

  init(products) {
    this.allProducts = [...products];
    this.filteredProducts = [...products];

    // Read any URL params (e.g. ?category=Audio or ?sort=price-low or ?minPrice=100&maxPrice=199)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
      const cat = urlParams.get('category');
      this.activeFilters.category = [cat];
      const titleEl = document.getElementById('page-catalog-title');
      const subtitleEl = document.getElementById('page-catalog-subtitle');
      const breadcrumbEl = document.getElementById('breadcrumb-category');
      if (titleEl) titleEl.textContent = `${cat} Deals & Offers`;
      if (subtitleEl) subtitleEl.textContent = `Live verified Amazon prices for top ${cat}.`;
      if (breadcrumbEl) breadcrumbEl.textContent = cat;
    }
    if (urlParams.get('marketplace')) {
      this.activeFilters.marketplace = [urlParams.get('marketplace')];
    }
    if (urlParams.get('minPrice')) {
      this.activeFilters.priceMin = Number(urlParams.get('minPrice'));
    }
    if (urlParams.get('maxPrice')) {
      const maxP = Number(urlParams.get('maxPrice'));
      this.activeFilters.priceMax = maxP;
      const titleEl = document.getElementById('page-catalog-title');
      const subtitleEl = document.getElementById('page-catalog-subtitle');
      if (urlParams.get('minPrice')) {
        const minP = Number(urlParams.get('minPrice'));
        if (titleEl) titleEl.textContent = `₹${minP} – ₹${maxP} Budget Deals`;
        if (subtitleEl) subtitleEl.textContent = `Showing verified products priced between ₹${minP} and ₹${maxP}.`;
      } else {
        if (titleEl) titleEl.textContent = `Under ₹${maxP} Budget Deals`;
        if (subtitleEl) subtitleEl.textContent = `Showing verified products priced under ₹${maxP}.`;
      }
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
      if (this.activeFilters.priceMax < 200000) {
        priceSlider.value = this.activeFilters.priceMax;
        priceLabel.textContent = `Up to ${ShopScout.formatPrice(this.activeFilters.priceMax)}`;
      }
      priceSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        this.activeFilters.priceMax = val;
        priceLabel.textContent = `Up to ${ShopScout.formatPrice(val)}`;
        this.applyFilters();
      });
    }

    // Quick Price Range Pills (if present on catalog page)
    document.querySelectorAll('.price-pill-btn').forEach(btn => {
      const min = Number(btn.dataset.min);
      const max = Number(btn.dataset.max);
      if (this.activeFilters.priceMin === min && this.activeFilters.priceMax === max) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilters.priceMin = min;
        this.activeFilters.priceMax = max;
        if (priceSlider && priceLabel) {
          priceSlider.value = max >= 200000 ? 200000 : max;
          priceLabel.textContent = max >= 200000 ? 'Up to ₹2,00,000' : `Up to ${ShopScout.formatPrice(max)}`;
        }
        this.applyFilters();
      });
    });

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
      // Category filter (flexible matching for Mobiles / Phones, Laptops, Audio, etc.)
      if (this.activeFilters.category.length > 0) {
        const matchesCategory = this.activeFilters.category.some(cat => {
          const c = cat.toLowerCase().trim();
          const pc = (p.category || '').toLowerCase().trim();
          if (c === pc) return true;
          if (c.startsWith(pc) || pc.startsWith(c)) return true;
          if ((c.includes('mobile') || c.includes('phone')) && (pc.includes('mobile') || pc.includes('phone'))) return true;
          if ((c.includes('laptop') || c.includes('pc')) && (pc.includes('laptop') || pc.includes('pc') || pc.includes('computer'))) return true;
          if (c.includes('audio') && (pc.includes('audio') || pc.includes('sound') || pc.includes('ear') || pc.includes('head'))) return true;
          if (c.includes('watch') && pc.includes('watch')) return true;
          if (c.includes('game') && pc.includes('game')) return true;
          if (c.includes('fashion') && pc.includes('fashion')) return true;
          if (c.includes('home') && pc.includes('home')) return true;
          return false;
        });
        if (!matchesCategory) return false;
      }
      // Marketplace filter
      if (this.activeFilters.marketplace.length > 0 && !this.activeFilters.marketplace.includes(p.marketplace)) {
        return false;
      }
      // Price Min & Max Filter
      if (p.price < this.activeFilters.priceMin) {
        return false;
      }
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
      priceMin: 0,
      priceMax: 200000,
      rating: 0,
      discount: 0,
      marketplace: []
    };

    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[type="radio"]').forEach(rb => rb.checked = false);
    document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
    const allPill = document.querySelector('.price-pill-btn[data-range="all"]');
    if (allPill) allPill.classList.add('active');

    const priceSlider = document.getElementById('filter-price-slider');
    const priceLabel = document.getElementById('filter-price-label');
    if (priceSlider && priceLabel) {
      priceSlider.value = 200000;
      priceLabel.textContent = `Up to ₹2,00,000`;
    }

    this.applyFilters();
  }
};
