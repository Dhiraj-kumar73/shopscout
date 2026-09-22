/**
 * SHOPSCOUT — PRODUCT SERVICE & UNIFIED CARD RENDERER
 */

const ProductService = {
  _cache: null,

  async getAllProducts() {
    const deletedIds = JSON.parse(localStorage.getItem(ShopScout?.KEYS?.DELETED_PRODUCTS || 'shopscout_deleted_products')) || [];

    const customKey = (typeof ShopScout !== 'undefined' && ShopScout?.KEYS?.CUSTOM_PRODUCTS) ? ShopScout.KEYS.CUSTOM_PRODUCTS : 'shopscout_custom_products';

    if (this._cache) {
      const custom = JSON.parse(localStorage.getItem(customKey)) || [];
      if (custom.length > 0) {
        const customMap = new Map(custom.map(p => [p.id, p]));
        this._cache = this._cache.map(p => customMap.has(p.id) ? customMap.get(p.id) : p);
        custom.forEach(cp => {
          if (!this._cache.some(bp => bp.id === cp.id)) {
            this._cache.unshift(cp);
          }
        });
      }
      return this._cache.filter(p => !deletedIds.includes(p.id));
    }

    // 1. Try Firebase Cloud Firestore first for instant global sync
    if (typeof ShopScoutFirebase !== 'undefined' && ShopScoutFirebase.isReady()) {
      try {
        const cloudProducts = await ShopScoutFirebase.getAllProducts();
        if (Array.isArray(cloudProducts) && cloudProducts.length > 0) {
          const sanitized = cloudProducts.filter(p => !deletedIds.includes(p.id)).map(p => this._sanitize(p));
          this._cache = sanitized;
          return sanitized;
        }
      } catch (err) {
        console.warn('[ProductService] Cloud Firestore read fallback:', err.message);
      }
    }

    // Determine correct relative path to data/products.json
    let dataUrl = '/data/products.json';
    if (window.location.protocol === 'file:') {
      const isPagesSubdir = window.location.pathname.includes('/pages/');
      const isAdminSubdir = window.location.pathname.includes('/admin/');
      dataUrl = (isPagesSubdir || isAdminSubdir) ? '../data/products.json' : 'data/products.json';
    }

    try {
      const res = await fetch(`${dataUrl}?t=${Date.now()}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load products');
      let baseProducts = await res.json();

      // Seed Cloud Firestore with baseline products if empty
      if (typeof ShopScoutFirebase !== 'undefined' && ShopScoutFirebase.isReady()) {
        ShopScoutFirebase.seedInitialProducts(baseProducts);
      }

      // Check for any admin added / updated products in localStorage
      const customKey = (typeof ShopScout !== 'undefined' && ShopScout?.KEYS?.CUSTOM_PRODUCTS) ? ShopScout.KEYS.CUSTOM_PRODUCTS : 'shopscout_custom_products';
      const custom = JSON.parse(localStorage.getItem(customKey)) || [];
      if (custom.length > 0) {
        // Merge or replace
        const customMap = new Map(custom.map(p => [p.id, p]));
        baseProducts = baseProducts.map(p => customMap.has(p.id) ? customMap.get(p.id) : p);
        // Append brand new ones
        custom.forEach(cp => {
          if (!baseProducts.some(bp => bp.id === cp.id)) {
            baseProducts.unshift(cp);
          }
        });
      }

      baseProducts = baseProducts.filter(p => !deletedIds.includes(p.id)).map(p => this._sanitize(p));
      this._cache = baseProducts;
      return baseProducts;
    } catch (e) {
      console.error('Error fetching product data:', e);
      return [];
    }
  },

  _sanitize(p) {
    if (!p) return p;
    // Enforce pure Amazon marketplace and affiliate URLs
    if (!p.marketplace || !p.marketplace.toLowerCase().includes('amazon')) {
      p.marketplace = 'Amazon';
    }
    const affTag = (typeof ShopScout !== 'undefined' && ShopScout.getAffiliateConfig) 
      ? (ShopScout.getAffiliateConfig().amazonTag || 'dhirajkuma05e-21') 
      : 'dhirajkuma05e-21';

    const isAmzLink = (url) => url && (url.includes('amazon') || url.includes('amzn'));

    if (!isAmzLink(p.amazonUrl)) {
      p.amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(p.name || 'product')}&tag=${affTag}`;
    }
    if (!isAmzLink(p.affiliateUrl)) {
      p.affiliateUrl = p.amazonUrl;
    }
    if (Array.isArray(p.marketplacePrices)) {
      p.marketplacePrices.forEach(m => {
        if (!m.store || !m.store.toLowerCase().includes('amazon')) {
          m.store = 'Amazon Prime';
        }
        if (!isAmzLink(m.url)) {
          m.url = p.amazonUrl;
        }
      });
    }
    return p;
  },

  async getProductById(id) {
    const products = await this.getAllProducts();
    const prod = products.find(p => String(p.id) === String(id));
    return this._sanitize(prod);
  },

  async getTrendingProducts(limit = 8) {
    const products = await this.getAllProducts();
    return products.filter(p => p.isTrending).slice(0, limit);
  },

  async getDeals(limit) {
    const products = await this.getAllProducts();
    const deals = products.filter(p => p.isDeal || p.discount >= 15);
    return limit ? deals.slice(0, limit) : deals;
  },

  async getByCategory(category) {
    const products = await this.getAllProducts();
    return products.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
};

/**
 * REUSABLE PRODUCT CARD GENERATOR
 * Used across Home, Products, Deals, Search, Categories, Wishlist
 */
function renderProductCard(product) {
  const isWishlisted = ShopScout.isInWishlist(product.id);
  const isInCompare = ShopScout.isInCompare(product.id);

  const isPagesSubdir = window.location.pathname.includes('/pages/');
  const detailsUrl = isPagesSubdir ? `product-details.html?id=${product.id}` : `pages/product-details.html?id=${product.id}`;

  const storeLower = 'amazon';
  const storeIcon = 'fa-brands fa-amazon';

  const discountVal = product.discount || (product.originalPrice && product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0);
  const discountBadge = discountVal > 0 ? `<span class="card-badge-discount"><i class="fa-solid fa-bolt"></i> ${discountVal}% OFF</span>` : '';
  const hotBadge = product.badge ? `<span class="card-badge-hot">${product.badge}</span>` : '';
  const savingsNum = product.originalPrice && product.originalPrice > product.price ? (product.originalPrice - product.price) : 0;
  const savingsBadge = savingsNum > 0 ? `<span class="product-savings-pill">Save ${ShopScout.formatPrice(savingsNum)}</span>` : (discountVal > 0 ? `<span class="product-savings-pill">${discountVal}% Off</span>` : '');

  // Generate 5 stars
  const ratingNum = Number(product.rating || 4.5);
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(ratingNum)) {
      starsHtml += '<i class="fa-solid fa-star"></i>';
    } else if (i === Math.ceil(ratingNum) && ratingNum % 1 !== 0) {
      starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    } else {
      starsHtml += '<i class="fa-regular fa-star"></i>';
    }
  }

  // Clean and validate card image
  let cardImg = product.image;
  if (!cardImg || cardImg.includes('images-na.ssl-images-amazon.com') || cardImg.startsWith('data:')) {
    if (product.gallery && product.gallery.length > 0) {
      const gMatch = product.gallery.find(g => {
        const u = typeof g === 'string' ? g : g.url;
        return u && !u.includes('images-na.ssl-images-amazon.com') && !u.startsWith('data:');
      });
      if (gMatch) cardImg = typeof gMatch === 'string' ? gMatch : gMatch.url;
    }
  }
  if (!cardImg || cardImg.includes('images-na.ssl-images-amazon.com') || cardImg.startsWith('data:')) {
    cardImg = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
  }

  return `
    <article class="product-card" data-id="${product.id}" data-affiliate-url="${product.affiliateUrl || ''}">
      
      <!-- LAYER 1: Compact Visual Image & Floating Badges -->
      <div class="product-card-img-wrap">
        <a href="${detailsUrl}">
          <img src="${cardImg}" alt="${product.name}" class="product-card-img" loading="lazy"
               onload="if(this.naturalWidth<=1){this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';}"
               onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'">
        </a>
        <div class="product-card-badges">
          ${discountBadge}
          ${hotBadge}
        </div>
        <div class="product-card-actions">
          <button class="card-action-btn ${isWishlisted ? 'active' : ''}" data-wishlist-id="${product.id}" onclick="ShopScout.toggleWishlist('${product.id}')" title="Save to Wishlist" aria-label="Save to Wishlist">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <button class="card-action-btn compare-btn ${isInCompare ? 'active' : ''}" data-compare-id="${product.id}" onclick="ShopScout.toggleCompare('${product.id}')" title="Compare Product" aria-label="Compare Product">
            <i class="fa-solid fa-scale-balanced"></i>
          </button>
        </div>
      </div>

      <!-- LAYER 2-5: Structured Compact Body -->
      <div class="product-card-body">
        
        <!-- Layer 2: Meta (Brand & Store Pill) -->
        <div class="product-meta-row">
          <span class="product-brand-tag"><i class="fa-solid fa-tag" style="font-size: 0.65rem; opacity: 0.7;"></i> ${product.brand || 'ShopScout'}</span>
          <span class="store-pill ${storeLower}">
            <i class="${storeIcon}"></i> ${product.marketplace || 'Amazon'}
          </span>
        </div>

        <!-- Layer 3: Title -->
        <h3 class="product-title">
          <a href="${detailsUrl}" title="${product.name}">${product.name}</a>
        </h3>

        <!-- Layer 4: Rating Strip -->
        <div class="product-rating-row">
          <span class="rating-badge-pill"><i class="fa-solid fa-star"></i> ${ratingNum}</span>
          <div class="star-rating-stars">${starsHtml}</div>
          <span class="star-rating-count">(${Number(product.reviewsCount || 100).toLocaleString('en-IN')})</span>
        </div>

        <!-- Layer 5: Price, Savings & Prime Delivery -->
        <div class="product-price-row">
          <span class="product-current-price">${ShopScout.formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="product-original-price">${ShopScout.formatPrice(product.originalPrice)}</span>` : ''}
          ${savingsBadge}
          <span class="prime-mini-badge" title="Amazon Prime Delivery"><i class="fa-solid fa-bolt"></i> Prime</span>
        </div>

      </div>

      <!-- LAYER 6: Compact High-Converting Action Footer -->
      <div class="product-card-footer">
        <a href="${detailsUrl}" class="btn-card-details" title="View details">
          <i class="fa-solid fa-eye"></i> Details
        </a>
        <button class="btn-card-buy ${storeLower}" data-affiliate-url="${product.affiliateUrl || ''}" onclick="ShopScout.openBuyModal('${product.id}')">
          <i class="${storeIcon}"></i> Buy on ${product.marketplace || 'Amazon'} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
        </button>
      </div>

    </article>
  `;
}

// Auto-clear memory cache when switching tabs or when products are modified elsewhere
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => { ProductService._cache = null; });
  window.addEventListener('focus', () => { ProductService._cache = null; });
}
