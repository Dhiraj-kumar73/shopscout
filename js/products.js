/**
 * SHOPSCOUT — PRODUCT SERVICE & UNIFIED CARD RENDERER
 */

const ProductService = {
  _cache: null,

  async getAllProducts() {
    if (this._cache) return this._cache;

    // Determine correct relative path to data/products.json
    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const isAdminSubdir = window.location.pathname.includes('/admin/');
    let dataUrl = 'data/products.json';
    if (isPagesSubdir || isAdminSubdir) {
      dataUrl = '../data/products.json';
    }

    try {
      const res = await fetch(dataUrl);
      if (!res.ok) throw new Error('Failed to load products');
      let baseProducts = await res.json();

      // Check for any admin added / updated products in localStorage
      const custom = JSON.parse(localStorage.getItem(ShopScout.KEYS.CUSTOM_PRODUCTS)) || [];
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

      this._cache = baseProducts;
      return baseProducts;
    } catch (e) {
      console.error('Error fetching product data:', e);
      return [];
    }
  },

  async getProductById(id) {
    const products = await this.getAllProducts();
    return products.find(p => String(p.id) === String(id));
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

  const storeLower = product.marketplace ? product.marketplace.toLowerCase() : 'amazon';
  const discountBadge = product.discount ? `<span class="card-badge-discount">-${product.discount}%</span>` : '';
  const hotBadge = product.badge ? `<span class="card-badge-hot">${product.badge}</span>` : '';

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

  // Alternate marketplace preview
  let altStoreSnippet = '';
  if (product.marketplacePrices && product.marketplacePrices.length > 1) {
    const otherStore = product.marketplacePrices.find(p => p.store.toLowerCase() !== storeLower);
    if (otherStore) {
      altStoreSnippet = `<div class="card-stores-preview"><span>Also at ${otherStore.store}:</span> <strong>${ShopScout.formatPrice(otherStore.price)}</strong></div>`;
    }
  } else {
    altStoreSnippet = `<div class="card-stores-preview"><span><i class="fa-solid fa-shield-check text-success"></i> Lowest Price Tracked</span> <strong>Amazon / Flipkart</strong></div>`;
  }

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-card-img-wrap">
        <a href="${detailsUrl}">
          <img src="${product.image}" alt="${product.name}" class="product-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'">
        </a>
        <div class="product-card-badges">
          ${discountBadge}
          ${hotBadge}
        </div>
        <div class="product-card-actions">
          <button class="card-action-btn ${isWishlisted ? 'active' : ''}" data-wishlist-id="${product.id}" onclick="ShopScout.toggleWishlist('${product.id}')" title="Add to Wishlist" aria-label="Save to Wishlist">
            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <button class="card-action-btn compare-btn ${isInCompare ? 'active' : ''}" data-compare-id="${product.id}" onclick="ShopScout.toggleCompare('${product.id}')" title="Compare Product" aria-label="Compare Product">
            <i class="fa-solid fa-scale-balanced"></i>
          </button>
        </div>
      </div>

      <div class="product-card-body">
        <div class="product-meta-row">
          <span class="product-brand-tag">${product.brand || 'ShopScout'}</span>
          <span class="store-pill ${storeLower}">
            <i class="fa-solid fa-store"></i> ${product.marketplace || 'Amazon'}
          </span>
        </div>

        <h3 class="product-title">
          <a href="${detailsUrl}">${product.name}</a>
        </h3>

        <div class="product-rating-row">
          <div class="star-rating-stars">${starsHtml}</div>
          <span class="star-rating-score">${ratingNum}</span>
          <span class="star-rating-count">(${Number(product.reviewsCount || 100).toLocaleString('en-IN')})</span>
        </div>

        <div class="product-price-row">
          <span class="product-current-price">${ShopScout.formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="product-original-price">${ShopScout.formatPrice(product.originalPrice)}</span>` : ''}
          ${product.discount ? `<span class="product-savings-pill">Save ${product.discount}%</span>` : ''}
        </div>

        ${altStoreSnippet}
      </div>

      <div class="product-card-footer">
        <a href="${detailsUrl}" class="btn-card-details">
          Details
        </a>
        <button class="btn-card-buy ${storeLower}" onclick="ShopScout.openBuyModal('${product.id}')">
          Buy Now <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem;"></i>
        </button>
      </div>
    </article>
  `;
}

