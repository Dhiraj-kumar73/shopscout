/**
 * SHOPSCOUT — AMAZON MULTI-PRODUCT CART SERVICE
 * Enables customers to bundle multiple products on ShopScout, view the total combined price,
 * and transfer the entire multi-item cart directly to Amazon India with the affiliate tag attached!
 */

const CartService = {
  STORAGE_KEY: 'shopscout_cart',

  // ─── STATE MANAGEMENT ───
  getCart() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveCart(cart) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
      this.updateBadges();
      this.updateBundleBar();
      window.dispatchEvent(new CustomEvent('shopscout:cart_updated', { detail: { cart } }));
    } catch (e) {
      console.error('[CartService] Error saving cart:', e);
    }
  },

  // Helper to extract Amazon 10-char ASIN (e.g. B0HGQWJDCW)
  extractAsin(item) {
    if (!item) return null;
    if (item.asin && typeof item.asin === 'string' && /^[A-Z0-9]{10}$/i.test(item.asin)) {
      return item.asin.toUpperCase();
    }
    const candidates = [item.affiliateUrl, item.amazonUrl, item.url, item.productId, item.id];
    for (const c of candidates) {
      if (typeof c === 'string') {
        const m = c.match(/(?:\/dp\/|\/gp\/product\/|[?&]asin=|\/)([B0][A-Z0-9]{9})(?:[/?&#]|$)/i);
        if (m) return m[1].toUpperCase();
      }
    }
    return null;
  },

  addToCart(product, quantity = 1, options = {}, openDrawerAfter = true) {
    if (!product || !product.id) return;

    const cart = this.getCart();
    const variantKey = options.variant || product.selectedVariant || 'Standard';
    const colorKey = options.color || product.selectedColor || '';
    const cartItemId = `${product.id}_${variantKey}_${colorKey}`.replace(/\s+/g, '_');

    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    const price = Number(product.price) || 0;
    const originalPrice = Number(product.originalPrice) || price;
    const resolvedAsin = this.extractAsin(product) || product.asin || '';

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        cartItemId,
        productId: product.id,
        name: product.name,
        price,
        originalPrice,
        image: options.image || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
        variant: variantKey,
        color: colorKey,
        quantity: Math.max(1, quantity),
        asin: resolvedAsin,
        amazonUrl: product.amazonUrl || product.affiliateUrl || '',
        affiliateUrl: product.affiliateUrl || product.amazonUrl || '',
        addedAt: Date.now()
      });
    }

    this._bundleBarDismissed = false;
    this.saveCart(cart);
    this.renderDrawer();
    if (openDrawerAfter && !window.location.pathname.includes('cart.html')) {
      this.showAddedModal(product, options);
    }

    if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
      ShopScout.toast(`Added "${product.name.slice(0, 24)}..." to Cart!`, 'success');
    }
  },

  // 1-Click Multi-Item Combo Order
  async buyCombo(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    for (const p of products) {
      this.addToCart(p, 1, {}, false);
    }
    this.checkoutOnAmazon();
  },

  updateQuantity(cartItemId, delta) {
    const cart = this.getCart();
    const item = cart.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(cartItemId);
      return;
    }

    this.saveCart(cart);
    this.renderDrawer();
  },

  removeFromCart(cartItemId) {
    let cart = this.getCart();
    cart = cart.filter(i => i.cartItemId !== cartItemId);
    this.saveCart(cart);
    this.renderDrawer();

    if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
      ShopScout.toast('Item removed from cart', 'info');
    }
  },

  clearCart() {
    this.saveCart([]);
    this.renderDrawer();
  },

  getTotals() {
    const cart = this.getCart();
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const originalTotal = cart.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const discount = Math.max(0, originalTotal - subtotal);
    return { itemCount, subtotal, originalTotal, discount, total: subtotal };
  },

  // ─── UI BADGES & STICKY BUNDLE ORDER BAR ───
  updateBadges() {
    const totals = this.getTotals();
    document.querySelectorAll('.cart-count-badge').forEach(badge => {
      badge.textContent = totals.itemCount;
      badge.style.display = totals.itemCount > 0 ? 'flex' : 'none';
    });
  },

  dismissBundleBar() {
    this._bundleBarDismissed = true;
    const bar = document.getElementById('bundle-order-bar');
    if (bar) {
      bar.classList.remove('visible');
    }
  },

  updateBundleBar() {
    let bar = document.getElementById('bundle-order-bar');
    if (!bar) return;

    if (this._bundleBarDismissed) {
      bar.classList.remove('visible');
      return;
    }

    const totals = this.getTotals();
    if (totals.itemCount > 0) {
      bar.innerHTML = `
        <div class="bundle-bar-info">
          <div class="bundle-bar-main-pill">
            <span class="bundle-bar-count">
              <i class="fa-solid fa-basket-shopping"></i>
              <span>${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}</span>
            </span>
            <span class="bundle-bar-sep">•</span>
            <span class="bundle-bar-total">₹${totals.total.toLocaleString('en-IN')}</span>
          </div>
          <span class="bundle-bar-badge"><i class="fa-solid fa-bolt"></i> Free Amazon Delivery</span>
        </div>
        <div class="bundle-bar-actions">
          <button class="bundle-btn-view" onclick="CartService.goToCart()" title="View Shopping Cart">
            <i class="fa-solid fa-cart-shopping"></i> <span class="bundle-btn-view-text">Cart</span>
          </button>
          <button class="bundle-btn-amazon" onclick="CartService.checkoutOnAmazon()" title="Transfer all selected items to Amazon India Cart">
            <i class="fa-brands fa-amazon"></i> <span class="bundle-btn-amazon-text">Buy on Amazon</span> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.65rem;"></i>
          </button>
          <button class="bundle-btn-close" onclick="CartService.dismissBundleBar()" title="Dismiss bar" aria-label="Close bar">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  },

  // ─── PAGE & DRAWER NAVIGATION ───
  goToCart() {
    const isPages = window.location.pathname.includes('/pages/');
    const isAdmin = window.location.pathname.includes('/admin/');
    if (isPages) {
      window.location.href = 'cart.html';
    } else if (isAdmin) {
      window.location.href = '../pages/cart.html';
    } else {
      window.location.href = 'pages/cart.html';
    }
  },

  openDrawer() {
    this.goToCart();
  },

  closeDrawer() {
    const overlay = document.getElementById('shopscout-cart-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // ─── ADDED-TO-CART CELEBRATION MODAL & SMART COMPLEMENTARY RAIL ───
  injectAddedModal() {
    if (document.getElementById('added-modal-backdrop')) return;

    const modalHtml = `
      <div class="added-modal-backdrop" id="added-modal-backdrop" onclick="if(event.target===this) CartService.closeAddedModal()">
        <div class="added-modal-dialog">
          <button class="added-modal-close" onclick="CartService.closeAddedModal()" title="Close">&times;</button>
          
          <!-- Top Hero Confirmation & Live Cart Subtotal -->
          <div class="added-modal-hero">
            
            <!-- Left: Item Just Added Details -->
            <div class="added-modal-item-info">
              <div class="added-modal-thumb">
                <img src="" alt="" id="added-modal-img">
              </div>
              <div class="added-modal-meta">
                <div class="added-modal-badge">
                  <i class="fa-solid fa-circle-check"></i> Added to your Amazon Cart!
                </div>
                <h4 class="added-modal-title" id="added-modal-title">Product Name</h4>
                <div class="added-modal-sub" id="added-modal-sub">
                  <span class="added-modal-price" id="added-modal-price">₹0</span>
                  <span class="added-modal-variant" id="added-modal-variant" style="display:none;"></span>
                </div>
              </div>
            </div>

            <!-- Right: Subtotal & 1-Click Amazon Checkout Actions -->
            <div class="added-modal-checkout-card">
              <div class="added-modal-subtotal-row">
                <span class="added-modal-subtotal-label">Cart Subtotal:</span>
                <span class="added-modal-subtotal-val" id="added-modal-subtotal">₹0</span>
              </div>
              <div class="added-modal-prime-pill">
                <i class="fa-solid fa-bolt"></i> Eligible for Free Amazon Prime Delivery
              </div>
              <div class="added-modal-actions">
                <button class="added-btn-buy" id="added-modal-buy-btn" onclick="CartService.checkoutOnAmazon()">
                  <i class="fa-brands fa-amazon"></i> Proceed to Buy (<span id="added-modal-item-count">1</span>) <i class="fa-solid fa-arrow-right"></i>
                </button>
                <button class="added-btn-cart" onclick="CartService.goToCart()">
                  <i class="fa-solid fa-cart-shopping"></i> Go to Cart
                </button>
              </div>
            </div>

          </div>

          <!-- Interactive Accessories & Add-ons Selection (User Chooses freewill) -->
          <div class="added-modal-choose-section" id="added-modal-choose-section">
            <div class="choose-section-header">
              <div class="choose-header-left">
                <div class="choose-icon-badge"><i class="fa-solid fa-layer-group"></i></div>
                <div>
                  <h5 class="choose-title">Choose Accessories &amp; Upgrades</h5>
                  <span class="choose-sub">Select products you like to add to your order</span>
                </div>
              </div>
              <div class="choose-search-wrap">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="choose-search-input" placeholder="Search accessories..." oninput="CartService.filterChooseAccessories(this.value)">
              </div>
            </div>

            <!-- Category Filter Chips -->
            <div class="choose-cat-pills" id="choose-cat-pills">
              <!-- Dynamically populated -->
            </div>

            <!-- Items Grid -->
            <div class="choose-items-grid" id="choose-items-grid">
              <!-- Dynamically populated -->
            </div>
          </div>

        </div>
      </div>
    `;

    const el = document.createElement('div');
    el.innerHTML = modalHtml;
    document.body.appendChild(el.firstElementChild);
  },

  // State for modal accessory selector
  currentChoosePool: [],
  currentChooseCat: 'all',
  currentChooseSearch: '',
  currentMainProductId: null,

  async showAddedModal(product, options = {}) {
    this.injectAddedModal();

    const backdrop = document.getElementById('added-modal-backdrop');
    const imgEl = document.getElementById('added-modal-img');
    const titleEl = document.getElementById('added-modal-title');
    const priceEl = document.getElementById('added-modal-price');
    const variantEl = document.getElementById('added-modal-variant');

    if (!backdrop) return;

    this.currentMainProductId = product.id;

    // Populate Added Item Info
    if (imgEl) imgEl.src = options.image || product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200';
    if (titleEl) titleEl.textContent = product.name;
    if (priceEl) priceEl.textContent = '₹' + Number(product.price || 0).toLocaleString('en-IN');

    const vText = [options.variant || product.selectedVariant, options.color || product.selectedColor].filter(Boolean).filter(v => v !== 'Standard').join(' • ');
    if (variantEl) {
      if (vText) {
        variantEl.textContent = vText;
        variantEl.style.display = 'inline';
      } else {
        variantEl.style.display = 'none';
      }
    }

    // Update Totals
    this.updateModalTotals();

    // Populate Accessories for user to freely browse and choose
    if (typeof ProductService !== 'undefined') {
      try {
        const all = await ProductService.getAllProducts();
        this.renderChooseAccessories(product, all);
      } catch (e) {
        console.warn('Error loading accessories for modal:', e);
      }
    }

    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  updateModalTotals() {
    const totals = this.getTotals();
    const subtotalEl = document.getElementById('added-modal-subtotal');
    const countEl = document.getElementById('added-modal-item-count');
    if (subtotalEl) subtotalEl.textContent = '₹' + Number(totals.total || 0).toLocaleString('en-IN');
    if (countEl) countEl.textContent = `${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`;
  },

  renderChooseAccessories(mainProduct, allProducts) {
    this.currentChooseSearch = '';
    this.currentChooseCat = 'all';

    const searchInput = document.getElementById('choose-search-input');
    if (searchInput) searchInput.value = '';

    if (!Array.isArray(allProducts) || allProducts.length === 0) return;

    // Exclude the main product
    let pool = allProducts.filter(p => p.id !== mainProduct.id);

    // Prioritize popular accessory categories
    pool.sort((a, b) => {
      const aScore = (a.category === 'Audio' || a.category === 'Watches' || a.category === 'Gadgets') ? 0 : 1;
      const bScore = (b.category === 'Audio' || b.category === 'Watches' || b.category === 'Gadgets') ? 0 : 1;
      return aScore - bScore;
    });

    this.currentChoosePool = pool;

    // Render Category Pills
    const pillsContainer = document.getElementById('choose-cat-pills');
    if (pillsContainer) {
      const availableCats = new Set(pool.map(p => p.category).filter(Boolean));
      const catConfig = [
        { id: 'all', label: 'All Items', icon: 'fa-layer-group' },
        { id: 'Audio', label: 'Audio & Earbuds', icon: 'fa-headphones' },
        { id: 'Watches', label: 'Smartwatches', icon: 'fa-clock' },
        { id: 'Gadgets', label: 'Chargers & Gadgets', icon: 'fa-bolt' },
        { id: 'Laptops', label: 'Laptops & Gear', icon: 'fa-laptop' },
        { id: 'Mobiles', label: 'Smartphones', icon: 'fa-mobile-screen' }
      ];

      const activeCategories = catConfig.filter(c => c.id === 'all' || availableCats.has(c.id));

      pillsContainer.innerHTML = activeCategories.map(cat => `
        <button type="button" class="choose-cat-pill ${cat.id === 'all' ? 'active' : ''}" 
                data-cat="${cat.id}"
                onclick="CartService.setChooseCategory('${cat.id}', this)">
          <i class="fa-solid ${cat.icon}"></i> ${cat.label}
        </button>
      `).join('');
    }

    this.renderFilteredChooseGrid();
  },

  setChooseCategory(cat, pillEl) {
    this.currentChooseCat = cat;
    const pills = document.querySelectorAll('.choose-cat-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (pillEl) pillEl.classList.add('active');
    this.renderFilteredChooseGrid();
  },

  filterChooseAccessories(query) {
    this.currentChooseSearch = (query || '').toLowerCase().trim();
    this.renderFilteredChooseGrid();
  },

  renderFilteredChooseGrid() {
    const gridEl = document.getElementById('choose-items-grid');
    if (!gridEl) return;

    const cart = this.getCart();
    const cartProductIds = new Set(cart.map(c => c.productId));

    let filtered = this.currentChoosePool || [];

    if (this.currentChooseCat && this.currentChooseCat !== 'all') {
      filtered = filtered.filter(p => p.category === this.currentChooseCat);
    }

    if (this.currentChooseSearch) {
      const q = this.currentChooseSearch;
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem 1rem; color: var(--muted);">
          <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.6; display: block;"></i>
          <p style="margin: 0; font-size: 0.9rem;">No accessories found matching your filter.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map(item => {
      const isInCart = cartProductIds.has(item.id);
      return `
        <div class="choose-item-card ${isInCart ? 'in-cart' : ''}" id="choose-card-${item.id}">
          <div class="choose-thumb-wrap">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'">
          </div>
          <div class="choose-item-info">
            <span class="choose-item-badge">${item.category || 'Accessory'}</span>
            <h6 class="choose-item-name" title="${item.name}">${item.name}</h6>
            <div class="choose-price-row">
              <span class="choose-price-current">₹${Number(item.price).toLocaleString('en-IN')}</span>
              ${item.originalPrice > item.price ? `<span class="choose-price-mrp">₹${Number(item.originalPrice).toLocaleString('en-IN')}</span>` : ''}
            </div>
          </div>
          <button type="button" class="btn-choose-add ${isInCart ? 'added' : ''}" 
                  id="btn-choose-${item.id}" 
                  onclick="CartService.toggleChooseItem('${item.id}', this)">
            ${isInCart ? '<i class="fa-solid fa-check"></i> In Cart' : '<i class="fa-solid fa-plus"></i> Add to Cart'}
          </button>
        </div>
      `;
    }).join('');
  },

  async toggleChooseItem(productId, btnEl) {
    const cart = this.getCart();
    const existing = cart.find(c => c.productId === productId);

    if (existing) {
      // Remove from cart
      this.removeFromCart(existing.cartItemId);
      if (btnEl) {
        btnEl.classList.remove('added');
        btnEl.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Cart';
      }
      const card = document.getElementById(`choose-card-${productId}`);
      if (card) card.classList.remove('in-cart');
    } else {
      // Add to cart
      let prod = (this.currentChoosePool || []).find(p => p.id === productId);
      if (!prod && typeof ProductService !== 'undefined') {
        prod = await ProductService.getProductById(productId);
      }
      if (!prod) return;

      this.addToCart(prod, 1, {}, false);
      if (btnEl) {
        btnEl.classList.add('added');
        btnEl.innerHTML = '<i class="fa-solid fa-check"></i> In Cart';
      }
      const card = document.getElementById(`choose-card-${productId}`);
      if (card) card.classList.add('in-cart');
    }

    this.updateModalTotals();
  },

  closeAddedModal() {
    const backdrop = document.getElementById('added-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // ─── RENDER CART DRAWER CONTENT ───
  renderDrawer() {
    const listEl = document.getElementById('cart-items-list');
    const footerEl = document.getElementById('cart-drawer-footer');
    const countBadgeEl = document.getElementById('cart-drawer-count');

    if (!listEl) return;

    const cart = this.getCart();
    const totals = this.getTotals();

    if (countBadgeEl) {
      countBadgeEl.textContent = `${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'}`;
    }

    // Empty State
    if (cart.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon"><i class="fa-solid fa-bag-shopping"></i></div>
          <h4 class="cart-empty-title">Your Cart is Empty</h4>
          <p class="cart-empty-sub">Select products across the catalog to bundle items and see the combined total price.</p>
          <button class="btn btn-primary btn-sm" onclick="CartService.closeDrawer()" style="padding: 0.6rem 1.4rem;">
            Explore Products
          </button>
        </div>
      `;
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (footerEl) footerEl.style.display = 'block';

    // List of cart items
    listEl.innerHTML = cart.map(item => `
      <div class="cart-item-card">
        <div class="cart-item-thumb">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'">
        </div>
        <div class="cart-item-details">
          <h5 class="cart-item-name" title="${item.name}">${item.name}</h5>
          ${item.variant ? `<span class="cart-item-variant">${item.variant} ${item.color ? `• ${item.color}` : ''}</span>` : ''}
          <div class="cart-item-price-row">
            <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
            ${item.originalPrice > item.price ? `<span class="cart-item-original">₹${(item.originalPrice * item.quantity).toLocaleString('en-IN')}</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <div class="cart-stepper">
              <span class="cart-stepper-btn" onclick="CartService.updateQuantity('${item.cartItemId}', -1)">&minus;</span>
              <span class="cart-stepper-val">${item.quantity}</span>
              <span class="cart-stepper-btn" onclick="CartService.updateQuantity('${item.cartItemId}', 1)">&plus;</span>
            </div>
            <a href="${item.amazonUrl || item.affiliateUrl || '#'}" target="_blank" rel="noopener noreferrer" style="font-size: 0.74rem; color: #D97706; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="View single item on Amazon">
              <i class="fa-brands fa-amazon"></i> Single Item <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.65rem;"></i>
            </a>
          </div>
        </div>
        <div class="cart-item-actions">
          <span class="cart-item-remove-btn" title="Remove Item" onclick="CartService.removeFromCart('${item.cartItemId}')">
            <i class="fa-regular fa-trash-can"></i>
          </span>
        </div>
      </div>
    `).join('');

    // Footer with Total Combined Price and "Checkout All on Amazon"
    if (footerEl) {
      footerEl.innerHTML = `
        <div class="cart-bill-row">
          <span>Total Products:</span>
          <strong>${totals.itemCount} items</strong>
        </div>
        ${totals.discount > 0 ? `
          <div class="cart-bill-row" style="color: #10B981;">
            <span>Marketplace Savings:</span>
            <strong>- ₹${totals.discount.toLocaleString('en-IN')}</strong>
          </div>
        ` : ''}
        <div class="cart-bill-row total">
          <span>Combined Total Price:</span>
          <span style="color: var(--text); font-size: 1.3rem;">₹${totals.total.toLocaleString('en-IN')}</span>
        </div>

        <button class="cart-checkout-btn" onclick="CartService.checkoutOnAmazon()" style="background: linear-gradient(135deg, #FF9900, #E68A00); border: 1px solid #FF9900; color: #111111; font-weight: 800; font-size: 1.02rem;">
          <i class="fa-brands fa-amazon" style="font-size: 1.25rem;"></i> Buy All on Amazon (${totals.itemCount} Items) <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.8rem; margin-left: 4px;"></i>
        </button>

        <div style="margin-top: 0.65rem; text-align: center; font-size: 0.76rem; color: var(--muted); display: flex; align-items: center; justify-content: center; gap: 5px;">
          <i class="fa-solid fa-shield-halved text-success"></i> 100% Genuine Amazon India Checkout &amp; Fast Delivery
        </div>
      `;
    }
  },

  // ─── ONE-CLICK AMAZON REMOTE MULTI-CART CHECKOUT ───
  async checkoutOnAmazon() {
    const cart = this.getCart();
    if (cart.length === 0) {
      if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
        ShopScout.toast('Your cart is empty! Please add products.', 'warning');
      }
      return;
    }

    const affConfig = (typeof ShopScout !== 'undefined' && ShopScout.getAffiliateConfig) 
      ? ShopScout.getAffiliateConfig() 
      : { amazonTag: 'dhirajkuma05e-21' };
    const tag = affConfig.amazonTag || 'dhirajkuma05e-21';

    // Collect ASINs and quantities
    const itemsWithAsin = [];
    for (const item of cart) {
      const asin = this.extractAsin(item) || item.asin;
      if (asin && asin.length === 10) {
        itemsWithAsin.push({ asin, quantity: item.quantity, item });
      }
    }

    let targetAmazonUrl = '';

    if (itemsWithAsin.length > 0) {
      // Official Amazon Remote Multi-Cart API:
      // Adds all items directly into the customer's Amazon India cart with your affiliate tag!
      const params = new URLSearchParams();
      params.set('AssociateTag', tag);

      itemsWithAsin.forEach((it, idx) => {
        const n = idx + 1;
        params.set(`ASIN.${n}`, it.asin);
        params.set(`Quantity.${n}`, String(it.quantity || 1));
      });

      targetAmazonUrl = `https://www.amazon.in/gp/aws/cart/add.html?${params.toString()}`;
    } else if (cart.length === 1) {
      // Single product direct Amazon link
      const p = cart[0];
      const pureUrl = p.affiliateUrl || p.amazonUrl || '';
      if (pureUrl && pureUrl.includes('amazon')) {
        targetAmazonUrl = pureUrl.includes('tag=') 
          ? pureUrl.replace(/tag=[^&#]+/i, `tag=${tag}`)
          : pureUrl + (pureUrl.includes('?') ? '&' : '?') + `tag=${tag}`;
      } else {
        targetAmazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(p.name)}&tag=${tag}`;
      }
    } else {
      // Fallback combined search query
      const searchTerms = cart.map(i => i.name.split(' ').slice(0, 2).join(' ')).join(' ');
      targetAmazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(searchTerms)}&tag=${tag}`;
    }

    if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
      ShopScout.toast(`Transferring ${cart.length} items to your Amazon Cart...`, 'info');
    }

    // Log affiliate click for analytics
    if (typeof ShopScout !== 'undefined' && ShopScout.getClicks) {
      try {
        const clicks = ShopScout.getClicks();
        clicks.push({
          productName: `Multi-Item Amazon Cart (${cart.length} products)`,
          store: 'Amazon',
          targetUrl: targetAmazonUrl,
          timestamp: Date.now()
        });
        localStorage.setItem(ShopScout.KEYS.CLICKS, JSON.stringify(clicks));
      } catch (e) {}
    }

    // Open Amazon Cart in a new tab
    setTimeout(() => {
      window.open(targetAmazonUrl, '_blank', 'noopener,noreferrer');
    }, 250);
  },

  // ─── INJECT CART DRAWER & STICKY BUNDLE BAR DOM AUTOMATICALLY ───
  injectDOM() {
    // 1. Inject Cart Drawer
    if (!document.getElementById('shopscout-cart-overlay')) {
      const drawerHtml = `
        <div class="cart-drawer-overlay" id="shopscout-cart-overlay" onclick="if(event.target===this) CartService.closeDrawer()">
          <aside class="cart-drawer">
            <div class="cart-drawer-header">
              <div class="cart-header-title">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>Shopping Cart</span>
                <span class="cart-header-badge" id="cart-drawer-count">0 items</span>
              </div>
              <button class="cart-drawer-close" onclick="CartService.closeDrawer()" title="Close Cart">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="cart-drawer-body" id="cart-items-list">
              <!-- Injected by CartService.renderDrawer() -->
            </div>

            <div class="cart-drawer-footer" id="cart-drawer-footer" style="display: none;">
              <!-- Injected by CartService.renderDrawer() -->
            </div>
          </aside>
        </div>
      `;

      const container = document.createElement('div');
      container.innerHTML = drawerHtml;
      document.body.appendChild(container);
    }

    // 2. Inject Floating Multi-Product Bundle Order Bar
    if (!document.getElementById('bundle-order-bar')) {
      const barEl = document.createElement('div');
      barEl.className = 'bundle-order-bar';
      barEl.id = 'bundle-order-bar';
      document.body.appendChild(barEl);
    }
  },

  init() {
    this.injectDOM();
    this.updateBadges();
    this.updateBundleBar();

    // Listen to updates across tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY) {
        this.updateBadges();
        this.updateBundleBar();
        this.renderDrawer();
      }
    });

    window.addEventListener('shopscout:cart_updated', () => {
      this.updateBadges();
      this.updateBundleBar();
    });
  }
};

// Global Bootstrapper
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartService.init());
  } else {
    CartService.init();
  }
}
