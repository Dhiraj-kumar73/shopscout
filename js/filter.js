/**
 * SHOPSCOUT — ADVANCED FILTER, CATEGORY & SORT CONTROLLER
 * High-performance mobile-first catalog refinement system
 */

const FilterController = {
  allProducts: [],
  filteredProducts: [],
  categories: [
    { name: 'Mobiles', icon: 'fa-solid fa-mobile-screen', aliases: ['mobile', 'phone', 'smartphone'] },
    { name: 'Laptops', icon: 'fa-solid fa-laptop', aliases: ['laptop', 'pc', 'computer'] },
    { name: 'Audio', icon: 'fa-solid fa-headphones', aliases: ['audio', 'sound', 'ear', 'head'] },
    { name: 'Watches', icon: 'fa-solid fa-stopwatch', aliases: ['watch', 'wearable'] },
    { name: 'Gaming', icon: 'fa-solid fa-gamepad', aliases: ['game', 'gaming'] },
    { name: 'Home & Kitchen', icon: 'fa-solid fa-blender', aliases: ['home', 'kitchen'] },
    { name: 'Gadgets', icon: 'fa-solid fa-microchip', aliases: ['gadget'] },
    { name: 'Fashion', icon: 'fa-solid fa-shirt', aliases: ['fashion', 'shoe', 'shirt', 'pant'] }
  ],
  activeFilters: {
    query: '',
    category: [],
    brand: null,
    priceMin: 0,
    priceMax: 200000,
    rating: 0,
    discount: 0,
    marketplace: ['Amazon']
  },
  currentSort: 'relevance',
  isCategoryDropdownOpen: false,

  init(products) {
    this.allProducts = [...products];
    this.filteredProducts = [...products];

    // Read URL params (e.g. ?category=Mobiles or ?q=phone or ?brand=Apple)
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('q')) {
      this.activeFilters.query = urlParams.get('q').trim();
      const sidebarSearch = document.getElementById('sidebar-search-input');
      const clearBtn = document.getElementById('sidebar-search-clear');
      if (sidebarSearch) sidebarSearch.value = this.activeFilters.query;
      if (clearBtn) clearBtn.style.display = this.activeFilters.query ? 'block' : 'none';
    }
    
    if (urlParams.get('category')) {
      const rawCat = urlParams.get('category').trim();
      const matchedCat = this.categories.find(c => 
        c.name.toLowerCase() === rawCat.toLowerCase() ||
        c.aliases.some(a => rawCat.toLowerCase().includes(a))
      );
      this.activeFilters.category = [matchedCat ? matchedCat.name : rawCat];
    }

    if (urlParams.get('brand')) {
      this.activeFilters.brand = urlParams.get('brand').trim();
    }

    if (urlParams.get('marketplace')) {
      this.activeFilters.marketplace = [urlParams.get('marketplace')];
    }

    if (urlParams.get('minPrice')) {
      this.activeFilters.priceMin = Number(urlParams.get('minPrice'));
    }

    if (urlParams.get('maxPrice')) {
      this.activeFilters.priceMax = Number(urlParams.get('maxPrice'));
    }

    if (urlParams.get('rating')) {
      this.activeFilters.rating = Number(urlParams.get('rating'));
    }

    if (urlParams.get('discount')) {
      this.activeFilters.discount = Number(urlParams.get('discount'));
    }

    if (urlParams.get('sort')) {
      this.currentSort = urlParams.get('sort');
    }

    this.bindDOMEvents();
    this.updateHeaderAndUrl();
    this.renderCategoryFilter();
    this.renderBrandFilter();
    this.applyFilters();
  },

  onSearchInput(val) {
    this.activeFilters.query = (val || '').trim();
    const clearBtn = document.getElementById('sidebar-search-clear');
    if (clearBtn) clearBtn.style.display = this.activeFilters.query ? 'block' : 'none';
    this.applyFilters();
  },

  clearSearch() {
    this.activeFilters.query = '';
    const sidebarSearch = document.getElementById('sidebar-search-input');
    const clearBtn = document.getElementById('sidebar-search-clear');
    if (sidebarSearch) sidebarSearch.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    this.applyFilters();
  },

  matchesCategory(p, catName) {
    if (!catName) return true;
    const c = catName.toLowerCase().trim();
    const pc = (p.category || '').toLowerCase().trim();
    const pn = (p.name || '').toLowerCase();

    if (c === pc) return true;
    if (c.startsWith(pc) || pc.startsWith(c)) return true;

    // Check specific known taxonomy mappings
    if ((c.includes('mobile') || c.includes('phone')) && (pc.includes('mobile') || pc.includes('phone') || pn.includes('phone') || pn.includes('galaxy') || pn.includes('iphone') || pn.includes('redmi') || pn.includes('iqoo') || pn.includes('nord') || pn.includes('oppo'))) return true;
    if ((c.includes('laptop') || c.includes('pc')) && (pc.includes('laptop') || pc.includes('pc') || pc.includes('computer') || pn.includes('laptop') || pn.includes('macbook'))) return true;
    if (c.includes('audio') && (pc.includes('audio') || pc.includes('sound') || pc.includes('ear') || pc.includes('head') || pn.includes('earphone') || pn.includes('headphone') || pn.includes('speaker') || pn.includes('soundbar') || pn.includes('partybox') || pn.includes('buds'))) return true;
    if (c.includes('watch') && (pc.includes('watch') || pn.includes('watch') || pn.includes('smartwatch'))) return true;
    if (c.includes('game') && (pc.includes('game') || pn.includes('game') || pn.includes('console') || pn.includes('playstation') || pn.includes('xbox'))) return true;
    if (c.includes('fashion') && (pc.includes('fashion') || pn.includes('shirt') || pn.includes('pant') || pn.includes('dress') || pn.includes('shoe') || pn.includes('denim'))) return true;
    if (c.includes('home') && (pc.includes('home') || pc.includes('kitchen') || pn.includes('bottle') || pn.includes('light') || pn.includes('pillow') || pn.includes('bed') || pn.includes('refrigerator'))) return true;
    if (c.includes('gadget') && (pc.includes('gadget') || pn.includes('cover') || pn.includes('stand') || pn.includes('case') || pn.includes('charger'))) return true;

    return false;
  },

  getCategoryIcon(catName) {
    const item = this.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
    return item ? item.icon : 'fa-solid fa-shapes';
  },

  getCategoryCount(catName) {
    return this.allProducts.filter(p => this.matchesCategory(p, catName)).length;
  },

  bindDOMEvents() {
    // Marketplace Checkbox
    document.querySelectorAll('input[name="filter-marketplace"]').forEach(cb => {
      cb.checked = this.activeFilters.marketplace.includes(cb.value);
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
        priceLabel.textContent = val >= 200000 ? 'Up to ₹2,00,000' : `Up to ${ShopScout.formatPrice(val)}`;
        this.applyFilters();
      });
    }

    // Quick Price Range Pills
    document.querySelectorAll('.price-pill-btn').forEach(btn => {
      const min = Number(btn.dataset.min);
      const max = Number(btn.dataset.max);
      if (this.activeFilters.priceMin === min && this.activeFilters.priceMax === max) {
        document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
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

    // Rating Radios
    document.querySelectorAll('input[name="filter-rating"]').forEach(rb => {
      if (Number(rb.value) === this.activeFilters.rating) {
        rb.checked = true;
      }
      rb.addEventListener('change', () => {
        this.activeFilters.rating = Number(rb.value);
        this.applyFilters();
      });
    });

    // Discount Radios
    document.querySelectorAll('input[name="filter-discount"]').forEach(rb => {
      if (Number(rb.value) === this.activeFilters.discount) {
        rb.checked = true;
      }
      rb.addEventListener('change', () => {
        this.activeFilters.discount = Number(rb.value);
        this.applyFilters();
      });
    });

    // Sort Selects (desktop, mobile toolbar, and sidebar/drawer)
    const sortDesktop = document.getElementById('sort-select');
    const sortMobile = document.getElementById('mobile-sort-select');
    const sortSidebar = document.getElementById('sidebar-sort-select');
    if (sortDesktop) sortDesktop.value = this.currentSort;
    if (sortMobile) sortMobile.value = this.currentSort;
    if (sortSidebar) sortSidebar.value = this.currentSort;

    // Clear All Filters Button
    const clearBtn = document.getElementById('clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Escape key closes mobile filter drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDrawer();
      }
    });
  },

  renderCategoryFilter() {
    const container = document.getElementById('category-filter-container');
    const isCategorySelected = this.activeFilters.category.length > 0;
    const selectedCat = isCategorySelected ? this.activeFilters.category[0] : null;
    const currentIcon = selectedCat ? this.getCategoryIcon(selectedCat) : 'fa-solid fa-shapes';

    if (container) {
      container.innerHTML = `
        <div class="category-dropdown-container">
          <div class="category-select-box">
            <i class="cat-select-icon ${currentIcon}"></i>
            <select id="catalog-category-select" class="catalog-category-select" onchange="FilterController.setCategory(this.value)" aria-label="Select Category">
              <option value="" ${!selectedCat ? 'selected' : ''}>All Categories</option>
              ${this.categories.map(c => `
                <option value="${c.name}" ${selectedCat && selectedCat.toLowerCase() === c.name.toLowerCase() ? 'selected' : ''}>
                  ${c.name}
                </option>
              `).join('')}
            </select>
            <i class="cat-select-arrow fa-solid fa-chevron-down"></i>
          </div>
          ${selectedCat ? `
            <button type="button" class="btn-reset-cat-link" onclick="FilterController.clearCategory()">
              <i class="fa-solid fa-rotate-left"></i> Reset to All Categories
            </button>
          ` : ''}
        </div>
      `;
    }
  },

  setCategory(catName) {
    if (catName) {
      this.activeFilters.category = [catName];
    } else {
      this.activeFilters.category = [];
    }
    this.activeFilters.brand = null;
    this.updateHeaderAndUrl();
    this.renderCategoryFilter();
    this.renderBrandFilter();
    this.applyFilters();
  },

  clearCategory() {
    this.setCategory(null);
  },

  renderBrandFilter() {
    const container = document.getElementById('sidebar-brands-list');
    const clearBtn = document.getElementById('btn-clear-brand');
    const section = document.getElementById('sidebar-brand-section');
    if (!container) return;

    // Get unique brands for current category
    const cat = this.activeFilters.category.length > 0 ? this.activeFilters.category[0] : null;
    let relevantProducts = this.allProducts;
    if (cat) {
      relevantProducts = this.allProducts.filter(p => this.matchesCategory(p, cat));
    }

    const brandMap = {};
    relevantProducts.forEach(p => {
      const b = (p.brand || '').trim();
      if (b && b.toLowerCase() !== 'shopscout') {
        brandMap[b] = (brandMap[b] || 0) + 1;
      }
    });

    const topBrands = Object.keys(brandMap)
      .sort((a, b) => brandMap[b] - brandMap[a])
      .slice(0, 6);

    if (topBrands.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = 'block';

    const selectedBrand = this.activeFilters.brand;
    if (clearBtn) {
      clearBtn.style.display = selectedBrand ? 'inline' : 'none';
    }

    container.innerHTML = topBrands.map(b => {
      const isAct = selectedBrand && selectedBrand.toLowerCase() === b.toLowerCase();
      return `
        <button type="button" class="brand-chip-btn ${isAct ? 'active' : ''}" onclick="FilterController.setBrand('${b}')">
          <span>${b}</span>
          ${isAct ? '<i class="fa-solid fa-check"></i>' : ''}
        </button>
      `;
    }).join('');
  },

  setBrand(brandName) {
    if (this.activeFilters.brand && this.activeFilters.brand.toLowerCase() === brandName.toLowerCase()) {
      this.activeFilters.brand = null;
    } else {
      this.activeFilters.brand = brandName;
    }
    this.renderBrandFilter();
    this.applyFilters();
  },

  clearBrand() {
    this.activeFilters.brand = null;
    this.renderBrandFilter();
    this.applyFilters();
  },

  updateHeaderAndUrl() {
    const titleEl = document.getElementById('page-catalog-title');
    const subtitleEl = document.getElementById('page-catalog-subtitle');
    const breadcrumbEl = document.getElementById('breadcrumb-category');
    const liveTagEl = document.getElementById('catalog-live-tag');
    const featurePillsEl = document.getElementById('catalog-feature-pills');

    const isCategorySelected = this.activeFilters.category.length > 0;
    const cat = isCategorySelected ? this.activeFilters.category[0] : null;

    if (isCategorySelected) {
      if (titleEl) titleEl.textContent = `${cat} Deals & Offers`;
      if (subtitleEl) subtitleEl.textContent = `Live verified Amazon prices and authentic deals for top ${cat}.`;
      if (breadcrumbEl) breadcrumbEl.textContent = cat;
      if (liveTagEl) liveTagEl.textContent = `Verified ${cat} Deals • Amazon Live Sync`;
      if (featurePillsEl) {
        if (cat.toLowerCase().includes('mobile') || cat.toLowerCase().includes('phone')) {
          featurePillsEl.innerHTML = `
            <span class="feat-pill"><i class="fa-solid fa-bolt"></i> 5G Smartphones</span>
            <span class="feat-pill"><i class="fa-solid fa-camera"></i> Flagship Cameras</span>
            <span class="feat-pill"><i class="fa-solid fa-battery-full"></i> 5000mAh+ Battery</span>
            <span class="feat-pill"><i class="fa-solid fa-shield-check"></i> Official 1-Yr Warranty</span>
          `;
        } else if (cat.toLowerCase().includes('laptop') || cat.toLowerCase().includes('pc')) {
          featurePillsEl.innerHTML = `
            <span class="feat-pill"><i class="fa-solid fa-microchip"></i> Intel Core &amp; M-Series</span>
            <span class="feat-pill"><i class="fa-solid fa-laptop"></i> Ultra-Thin Ultrabooks</span>
            <span class="feat-pill"><i class="fa-solid fa-gamepad"></i> High-FPS Gaming</span>
            <span class="feat-pill"><i class="fa-solid fa-battery-three-quarters"></i> All-Day Battery</span>
          `;
        } else if (cat.toLowerCase().includes('audio')) {
          featurePillsEl.innerHTML = `
            <span class="feat-pill"><i class="fa-solid fa-headphones"></i> Active Noise Cancelling</span>
            <span class="feat-pill"><i class="fa-solid fa-volume-high"></i> Heavy Bass</span>
            <span class="feat-pill"><i class="fa-solid fa-clock"></i> 40h+ Playtime</span>
            <span class="feat-pill"><i class="fa-solid fa-droplet"></i> IPX Water Resistance</span>
          `;
        } else {
          featurePillsEl.innerHTML = `
            <span class="feat-pill"><i class="fa-solid fa-truck-fast"></i> Free Prime Delivery</span>
            <span class="feat-pill"><i class="fa-solid fa-shield-check"></i> 100% Authentic Sellers</span>
            <span class="feat-pill"><i class="fa-solid fa-arrow-trend-down"></i> Lowest Price Tracking</span>
            <span class="feat-pill"><i class="fa-solid fa-star"></i> Top Customer Rated</span>
          `;
        }
      }
    } else if (this.activeFilters.priceMax < 200000 || this.activeFilters.priceMin > 0) {
      if (this.activeFilters.priceMin > 0) {
        if (titleEl) titleEl.textContent = `₹${this.activeFilters.priceMin} – ₹${this.activeFilters.priceMax} Deals`;
        if (subtitleEl) subtitleEl.textContent = `Showing verified products priced between ₹${this.activeFilters.priceMin} and ₹${this.activeFilters.priceMax}.`;
      } else {
        if (titleEl) titleEl.textContent = `Under ₹${this.activeFilters.priceMax} Deals`;
        if (subtitleEl) subtitleEl.textContent = `Showing verified products priced under ₹${this.activeFilters.priceMax}.`;
      }
      if (breadcrumbEl) breadcrumbEl.textContent = 'Products';
    } else {
      if (titleEl) titleEl.textContent = 'Explore All Products';
      if (subtitleEl) subtitleEl.textContent = 'Live verified deals & authentic pricing on Amazon India.';
      if (breadcrumbEl) breadcrumbEl.textContent = 'Products';
      if (liveTagEl) liveTagEl.textContent = 'Live Verified Amazon India Deals';
      if (featurePillsEl) {
        featurePillsEl.innerHTML = `
          <span class="feat-pill"><i class="fa-solid fa-truck-fast"></i> Free Prime Delivery</span>
          <span class="feat-pill"><i class="fa-solid fa-shield-check"></i> 100% Authentic Sellers</span>
          <span class="feat-pill"><i class="fa-solid fa-arrow-trend-down"></i> Lowest Price Tracking</span>
          <span class="feat-pill"><i class="fa-solid fa-star"></i> Top Customer Rated</span>
        `;
      }
    }

    // Sync URL without reloading
    const currentUrl = new URL(window.location.href);
    if (isCategorySelected) {
      currentUrl.searchParams.set('category', cat);
    } else {
      currentUrl.searchParams.delete('category');
    }
    if (this.activeFilters.brand) {
      currentUrl.searchParams.set('brand', this.activeFilters.brand);
    } else {
      currentUrl.searchParams.delete('brand');
    }
    window.history.replaceState({}, '', currentUrl.toString());
  },

  openDrawer() {
    const sidebar = document.getElementById('catalog-filter-sidebar');
    const backdrop = document.getElementById('filter-drawer-backdrop');
    if (sidebar) sidebar.classList.add('drawer-open');
    if (backdrop) backdrop.classList.add('drawer-open');
    document.body.style.overflow = 'hidden';
  },

  closeDrawer() {
    const sidebar = document.getElementById('catalog-filter-sidebar');
    const backdrop = document.getElementById('filter-drawer-backdrop');
    if (sidebar) sidebar.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('drawer-open');
    document.body.style.overflow = '';
  },

  onSortChange(val) {
    this.currentSort = val;
    const sortDesktop = document.getElementById('sort-select');
    const sortMobile = document.getElementById('mobile-sort-select');
    const sortSidebar = document.getElementById('sidebar-sort-select');
    if (sortDesktop && sortDesktop.value !== val) sortDesktop.value = val;
    if (sortMobile && sortMobile.value !== val) sortMobile.value = val;
    if (sortSidebar && sortSidebar.value !== val) sortSidebar.value = val;
    this.applySort();
    this.renderResults();
  },

  applyFilters() {
    this.filteredProducts = this.allProducts.filter(p => {
      // Category filter
      if (this.activeFilters.category.length > 0) {
        const cat = this.activeFilters.category[0];
        if (!this.matchesCategory(p, cat)) return false;
      }

      // Brand filter
      if (this.activeFilters.brand) {
        const pb = (p.brand || '').toLowerCase();
        const pn = (p.name || '').toLowerCase();
        const tb = this.activeFilters.brand.toLowerCase();
        if (!pb.includes(tb) && !pn.includes(tb)) {
          return false;
        }
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

    // Query text search filter
    if (this.activeFilters.query) {
      this.filteredProducts = ShopScout.fuzzySearch(this.filteredProducts, this.activeFilters.query);
    }

    this.applySort();
    this.renderResults();
    this.renderActiveChips();
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
        break;
    }
  },

  renderActiveChips() {
    const bar = document.getElementById('active-filter-chips-bar');
    const list = document.getElementById('active-chips-list');
    const badge = document.getElementById('mobile-filter-badge');

    let activeCount = 0;
    const chipsHtml = [];

    // Category Chip
    if (this.activeFilters.category.length > 0) {
      activeCount++;
      const cat = this.activeFilters.category[0];
      const icon = this.getCategoryIcon(cat);
      chipsHtml.push(`
        <span class="active-filter-chip">
          <i class="${icon}"></i>
          <span>${cat}</span>
          <button type="button" class="chip-remove-btn" onclick="FilterController.clearCategory()" aria-label="Remove category filter">&times;</button>
        </span>
      `);
    }

    // Brand Chip
    if (this.activeFilters.brand) {
      activeCount++;
      chipsHtml.push(`
        <span class="active-filter-chip">
          <i class="fa-solid fa-certificate" style="color: var(--primary);"></i>
          <span>${this.activeFilters.brand}</span>
          <button type="button" class="chip-remove-btn" onclick="FilterController.clearBrand()" aria-label="Remove brand filter">&times;</button>
        </span>
      `);
    }

    // Price Chip
    if (this.activeFilters.priceMax < 200000 || this.activeFilters.priceMin > 0) {
      activeCount++;
      let priceText = `Up to ${ShopScout.formatPrice(this.activeFilters.priceMax)}`;
      if (this.activeFilters.priceMin > 0 && this.activeFilters.priceMax < 200000) {
        priceText = `${ShopScout.formatPrice(this.activeFilters.priceMin)} – ${ShopScout.formatPrice(this.activeFilters.priceMax)}`;
      } else if (this.activeFilters.priceMin > 0) {
        priceText = `From ${ShopScout.formatPrice(this.activeFilters.priceMin)}`;
      }
      chipsHtml.push(`
        <span class="active-filter-chip">
          <i class="fa-solid fa-tag"></i>
          <span>${priceText}</span>
          <button type="button" class="chip-remove-btn" onclick="FilterController.resetPrice()" aria-label="Remove price filter">&times;</button>
        </span>
      `);
    }

    // Rating Chip
    if (this.activeFilters.rating > 0) {
      activeCount++;
      chipsHtml.push(`
        <span class="active-filter-chip">
          <i class="fa-solid fa-star" style="color: #FBBF24;"></i>
          <span>${this.activeFilters.rating}★ &amp; above</span>
          <button type="button" class="chip-remove-btn" onclick="FilterController.resetRating()" aria-label="Remove rating filter">&times;</button>
        </span>
      `);
    }

    // Discount Chip
    if (this.activeFilters.discount > 0) {
      activeCount++;
      chipsHtml.push(`
        <span class="active-filter-chip">
          <i class="fa-solid fa-percent" style="color: var(--deal-orange);"></i>
          <span>${this.activeFilters.discount}%+ Off</span>
          <button type="button" class="chip-remove-btn" onclick="FilterController.resetDiscount()" aria-label="Remove discount filter">&times;</button>
        </span>
      `);
    }

    // Update Mobile Badge
    if (badge) {
      if (activeCount > 0) {
        badge.style.display = 'inline-block';
        badge.textContent = activeCount;
      } else {
        badge.style.display = 'none';
      }
    }

    // Render chips container
    if (bar && list) {
      if (activeCount > 0) {
        bar.style.display = 'flex';
        list.innerHTML = chipsHtml.join('');
      } else {
        bar.style.display = 'none';
        list.innerHTML = '';
      }
    }
  },

  resetPrice() {
    this.activeFilters.priceMin = 0;
    this.activeFilters.priceMax = 200000;
    const priceSlider = document.getElementById('filter-price-slider');
    const priceLabel = document.getElementById('filter-price-label');
    if (priceSlider && priceLabel) {
      priceSlider.value = 200000;
      priceLabel.textContent = 'Up to ₹2,00,000';
    }
    document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
    const allPill = document.querySelector('.price-pill-btn[data-range="all"]');
    if (allPill) allPill.classList.add('active');

    this.applyFilters();
  },

  resetRating() {
    this.activeFilters.rating = 0;
    const allRatingRb = document.querySelector('input[name="filter-rating"][value="0"]');
    if (allRatingRb) allRatingRb.checked = true;
    this.applyFilters();
  },

  resetDiscount() {
    this.activeFilters.discount = 0;
    document.querySelectorAll('input[name="filter-discount"]').forEach(rb => rb.checked = false);
    this.applyFilters();
  },

  renderResults() {
    const grid = document.getElementById('catalog-grid');
    const countEl = document.getElementById('results-count');
    const drawerCountEl = document.getElementById('drawer-results-count');

    const visibleCount = this.filteredProducts.length;
    const isCategorySelected = this.activeFilters.category.length > 0;
    const catName = isCategorySelected ? this.activeFilters.category[0] : '';

    if (countEl) {
      if (isCategorySelected) {
        countEl.textContent = `Showing verified ${catName} products`;
      } else {
        countEl.textContent = `Showing verified authentic products`;
      }
    }

    if (drawerCountEl) {
      drawerCountEl.textContent = '';
    }

    if (!grid) return;

    if (visibleCount === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fa-solid fa-filter-circle-xmark"></i>
            </div>
            <h3 class="empty-state-title">No products match your filters</h3>
            <p class="empty-state-desc">Try clearing category or adjusting the price range to discover more items.</p>
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
      query: '',
      category: [],
      brand: null,
      priceMin: 0,
      priceMax: 200000,
      rating: 0,
      discount: 0,
      marketplace: ['Amazon']
    };

    const sidebarSearch = document.getElementById('sidebar-search-input');
    const clearBtn = document.getElementById('sidebar-search-clear');
    if (sidebarSearch) sidebarSearch.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    document.querySelectorAll('input[name="filter-rating"]').forEach(rb => {
      rb.checked = rb.value === '0';
    });
    document.querySelectorAll('input[name="filter-discount"]').forEach(rb => {
      rb.checked = false;
    });

    document.querySelectorAll('.price-pill-btn').forEach(b => b.classList.remove('active'));
    const allPill = document.querySelector('.price-pill-btn[data-range="all"]');
    if (allPill) allPill.classList.add('active');

    const sortSidebar = document.getElementById('sidebar-sort-select');
    if (sortSidebar) sortSidebar.value = 'relevance';

    this.isCategoryDropdownOpen = false;
    this.updateHeaderAndUrl();
    this.renderCategoryFilter();
    this.renderBrandFilter();
    this.applyFilters();
  }
};
