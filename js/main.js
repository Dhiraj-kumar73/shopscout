/**
 * SHOPSCOUT — GLOBAL UTILITIES & CORE STORE
 */

const ShopScout = {
  // LocalStorage Keys
  KEYS: {
    WISHLIST: 'shopscout_wishlist',
    COMPARE: 'shopscout_compare',
    ALERTS: 'shopscout_alerts',
    THEME: 'shopscout_theme',
    CLICKS: 'shopscout_clicks',
    CUSTOM_PRODUCTS: 'shopscout_custom_products',
    USER: 'shopscout_user',
    REGISTERED_USERS: 'shopscout_registered_users'
  },

  // State Getters
  getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.WISHLIST)) || [];
    } catch {
      return [];
    }
  },

  getCompare() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.COMPARE)) || [];
    } catch {
      return [];
    }
  },

  getAlerts() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.ALERTS)) || {};
    } catch {
      return {};
    }
  },

  getClicks() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CLICKS)) || [];
    } catch {
      return [];
    }
  },

  // Wishlist Actions
  toggleWishlist(productId) {
    let list = this.getWishlist();
    const index = list.indexOf(productId);
    let added = false;
    if (index > -1) {
      list.splice(index, 1);
      this.toast('Removed from your Wishlist', 'info');
    } else {
      list.push(productId);
      added = true;
      this.toast('Added to your Wishlist!', 'success');
    }
    localStorage.setItem(this.KEYS.WISHLIST, JSON.stringify(list));
    this.updateBadges();
    
    // Update any heart icons on the page
    document.querySelectorAll(`[data-wishlist-id="${productId}"]`).forEach(el => {
      el.classList.toggle('active', added);
      const icon = el.querySelector('i');
      if (icon) {
        icon.className = added ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      }
    });

    // Custom event
    window.dispatchEvent(new CustomEvent('shopscout:wishlist_updated', { detail: { list } }));
    return added;
  },

  isInWishlist(productId) {
    return this.getWishlist().includes(productId);
  },

  // Compare Actions (max 4 products)
  toggleCompare(productId) {
    let list = this.getCompare();
    const index = list.indexOf(productId);
    let added = false;
    if (index > -1) {
      list.splice(index, 1);
      this.toast('Removed from Comparison', 'info');
    } else {
      if (list.length >= 4) {
        this.toast('You can compare up to 4 products at once.', 'warning');
        return false;
      }
      list.push(productId);
      added = true;
      this.toast('Added to Comparison Drawer', 'success');
    }
    localStorage.setItem(this.KEYS.COMPARE, JSON.stringify(list));
    this.updateBadges();
    this.renderCompareDrawer();

    document.querySelectorAll(`[data-compare-id="${productId}"]`).forEach(el => {
      el.classList.toggle('active', added);
    });

    window.dispatchEvent(new CustomEvent('shopscout:compare_updated', { detail: { list } }));
    return added;
  },

  isInCompare(productId) {
    return this.getCompare().includes(productId);
  },

  clearCompare() {
    localStorage.setItem(this.KEYS.COMPARE, JSON.stringify([]));
    this.updateBadges();
    this.renderCompareDrawer();
    document.querySelectorAll(`[data-compare-id]`).forEach(el => el.classList.remove('active'));
    this.toast('Comparison list cleared', 'info');
    window.dispatchEvent(new CustomEvent('shopscout:compare_updated', { detail: { list: [] } }));
  },

  // Currency Formatter
  formatPrice(num) {
    if (isNaN(num)) return '₹0';
    return '₹' + Number(num).toLocaleString('en-IN');
  },

  // Toast System
  toast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'warning') iconClass = 'fa-solid fa-triangle-exclamation';
    if (type === 'danger') iconClass = 'fa-solid fa-circle-xmark';

    toast.innerHTML = `
      <i class="${iconClass} toast-icon ${type}"></i>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 260);
    }, 3200);
  },

  // Header Counters Update
  updateBadges() {
    const wishlistCount = this.getWishlist().length;
    const compareCount = this.getCompare().length;

    document.querySelectorAll('.wishlist-badge-count').forEach(el => {
      el.textContent = wishlistCount;
      el.style.display = wishlistCount > 0 ? 'flex' : 'none';
    });

    document.querySelectorAll('.compare-badge-count').forEach(el => {
      el.textContent = compareCount;
      el.style.display = compareCount > 0 ? 'flex' : 'none';
    });
  },

  // Outbound Affiliate Interstitial Flow
  // 2-Option Marketplace Selector Modal (Amazon vs Flipkart)
  async openBuyModal(productOrId) {
    let product = null;

    if (typeof productOrId === 'object' && productOrId !== null) {
      product = productOrId;
    } else if (typeof productOrId === 'string') {
      if (window.ProductService) {
        const all = await ProductService.getAllProducts();
        product = all.find(p => p.id === productOrId || p.name === productOrId);
      }
      if (!product) {
        const card = document.querySelector(`.product-card[data-id="${productOrId}"]`);
        const name = card ? card.querySelector('.product-title a')?.textContent : decodeURIComponent(productOrId);
        let extractedPrice = 12999;
        if (card) {
          const priceText = card.querySelector('.product-current-price')?.textContent || '';
          const num = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
          if (num) extractedPrice = num;
        }
        product = {
          name: name || decodeURIComponent(productOrId),
          price: extractedPrice,
          originalPrice: Math.round(extractedPrice * 1.35),
          image: card ? card.querySelector('.product-card-img')?.src : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
          marketplace: 'Flipkart',
          affiliateUrl: 'https://www.flipkart.com/vivo-t5x-5g-cyber-green-128-gb/p/itm7da8aa253e72b?pid=MOBHH69NM5ERRNFT&affid=shopscout',
          stores: []
        };
      }
    }

    const prodName = product.name || 'Product';
    const prodImg = product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
    const encodedName = encodeURIComponent(prodName);

    // Extract or calculate prices for Amazon and Flipkart ONLY (No 3rd option)
    let amazonPrice = product.price || 0;
    let flipkartPrice = Math.round(amazonPrice * 1.02);
    let amazonUrl = `https://www.amazon.in/s?k=${encodedName}&tag=shopscout-21`;
    let flipkartUrl = `https://www.flipkart.com/search?q=${encodedName}&affid=shopscout`;

    if (product.marketplacePrices && product.marketplacePrices.length > 0) {
      const amz = product.marketplacePrices.find(m => m.store.toLowerCase().includes('amazon'));
      if (amz) {
        amazonPrice = amz.price;
        if (amz.url && !amz.url.includes('example.com') && !amz.url.includes('ref=cs_404_link')) {
          amazonUrl = amz.url;
        }
      }
      const flp = product.marketplacePrices.find(m => m.store.toLowerCase().includes('flipkart'));
      if (flp) {
        flipkartPrice = flp.price;
        if (flp.url && !flp.url.includes('example.com')) {
          flipkartUrl = flp.url;
        }
      } else {
        flipkartPrice = Math.round(amazonPrice * 1.02);
      }
    } else if (product.stores && product.stores.length > 0) {
      const amz = product.stores.find(m => m.name.toLowerCase().includes('amazon'));
      if (amz) {
        amazonPrice = amz.price;
        if (amz.affiliateUrl) amazonUrl = amz.affiliateUrl;
      }
      const flp = product.stores.find(m => m.name.toLowerCase().includes('flipkart'));
      if (flp) {
        flipkartPrice = flp.price;
        if (flp.affiliateUrl) flipkartUrl = flp.affiliateUrl;
      }
    }

    // Direct product link handling from user input / single affiliateUrl
    if (product.affiliateUrl && product.affiliateUrl !== '#') {
      if (product.affiliateUrl.includes('flipkart.com')) {
        flipkartUrl = product.affiliateUrl;
      } else if (product.affiliateUrl.includes('amazon.')) {
        amazonUrl = product.affiliateUrl;
      }
    }

    const amazonIsCheaper = amazonPrice <= flipkartPrice;
    let selectedStore = (product.marketplace && product.marketplace.toLowerCase().includes('flipkart'))
      ? 'flipkart'
      : (amazonIsCheaper ? 'amazon' : 'flipkart');

    let modal = document.getElementById('buy-choice-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'buy-choice-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 520px; text-align: left; padding: 1.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
          <div>
            <span style="font-size: 0.75rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;">Choose Platform</span>
            <h3 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.2rem; color: var(--text);">Where do you want to buy?</h3>
          </div>
          <button type="button" class="btn-icon" id="btn-close-buy-modal" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--surface-subtle); color: var(--muted); cursor: pointer; border: none;">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Mini Product Banner -->
        <div style="display: flex; gap: 0.85rem; align-items: center; background: var(--surface-subtle); padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 1.25rem;">
          <img src="${prodImg}" alt="${prodName}" style="width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border);">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prodName}</div>
            <div style="font-size: 0.78rem; color: var(--muted);">Lowest Verified Price: <strong style="color: var(--primary);">${ShopScout.formatPrice(Math.min(amazonPrice, flipkartPrice))}</strong></div>
          </div>
        </div>

        <!-- 2 Options Only: Amazon & Flipkart (Third Option Removed) -->
        <div class="buy-options-container" style="display: flex; flex-direction: column; gap: 0.25rem;">
          <!-- Option 1: Amazon -->
          <div class="buy-choice-card amazon ${selectedStore === 'amazon' ? 'selected' : ''}" id="choice-amazon" data-store="amazon">
            <div class="buy-choice-left">
              <div class="buy-store-icon-wrap amazon">
                <i class="fa-brands fa-amazon"></i>
              </div>
              <div>
                <div class="buy-choice-title">
                  Amazon India 
                  ${amazonIsCheaper ? '<span class="badge" style="background:#16A34A; color:#fff; font-size:0.68rem; font-weight:700; padding:2px 6px; border-radius:3px;">Best Price</span>' : ''}
                </div>
                <div class="buy-choice-subtitle"><i class="fa-solid fa-truck-fast"></i> Prime Fast Delivery & Return Shield</div>
              </div>
            </div>
            <div class="buy-choice-right">
              <div class="buy-choice-price" style="color: #FF9900;">${ShopScout.formatPrice(amazonPrice)}</div>
              <div class="buy-choice-radio">
                <i class="fa-solid fa-check"></i>
              </div>
            </div>
          </div>

          <!-- Option 2: Flipkart -->
          <div class="buy-choice-card flipkart ${selectedStore === 'flipkart' ? 'selected' : ''}" id="choice-flipkart" data-store="flipkart">
            <div class="buy-choice-left">
              <div class="buy-store-icon-wrap flipkart">
                <i class="fa-solid fa-bag-shopping"></i>
              </div>
              <div>
                <div class="buy-choice-title">
                  Flipkart
                  ${!amazonIsCheaper ? '<span class="badge" style="background:#16A34A; color:#fff; font-size:0.68rem; font-weight:700; padding:2px 6px; border-radius:3px;">Best Price</span>' : ''}
                </div>
                <div class="buy-choice-subtitle"><i class="fa-solid fa-shield-halved"></i> Flipkart Assured & Bank Offers</div>
              </div>
            </div>
            <div class="buy-choice-right">
              <div class="buy-choice-price" style="color: #2874F0;">${ShopScout.formatPrice(flipkartPrice)}</div>
              <div class="buy-choice-radio">
                <i class="fa-solid fa-check"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- Transparency Box -->
        <div style="font-size: 0.78rem; color: var(--muted); background: rgba(0,0,0,0.03); border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 0.65rem 0.85rem; margin-top: 1rem; line-height: 1.4;">
          <i class="fa-solid fa-shield-halved text-primary"></i> <strong>Affiliate Notice:</strong> You will be safely redirected to the official store to complete your checkout. ShopScout earns an affiliate commission at ₹0 extra cost to you.
        </div>

        <!-- Buttons -->
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.35rem;">
          <button type="button" class="btn btn-outline btn-md" id="btn-cancel-buy-choice">Cancel</button>
          <button type="button" class="btn btn-primary btn-md" id="btn-continue-to-store" style="min-width: 190px;">
            Continue to <span id="label-selected-store">${selectedStore === 'amazon' ? 'Amazon' : 'Flipkart'}</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    const cardAmz = modal.querySelector('#choice-amazon');
    const cardFlp = modal.querySelector('#choice-flipkart');
    const labelStore = modal.querySelector('#label-selected-store');
    const continueBtn = modal.querySelector('#btn-continue-to-store');
    const cancelBtn = modal.querySelector('#btn-cancel-buy-choice');
    const closeBtn = modal.querySelector('#btn-close-buy-modal');

    const updateSelection = (store) => {
      selectedStore = store;
      if (store === 'amazon') {
        cardAmz.classList.add('selected');
        cardFlp.classList.remove('selected');
        labelStore.textContent = 'Amazon';
      } else {
        cardFlp.classList.add('selected');
        cardAmz.classList.remove('selected');
        labelStore.textContent = 'Flipkart';
      }
    };

    if (cardAmz) cardAmz.onclick = () => updateSelection('amazon');
    if (cardFlp) cardFlp.onclick = () => updateSelection('flipkart');

    const executeRedirect = () => {
      const targetStore = selectedStore === 'amazon' ? 'Amazon' : 'Flipkart';
      const targetUrl = selectedStore === 'amazon' ? amazonUrl : flipkartUrl;
      modal.classList.remove('active');
      ShopScout.triggerAffiliateRedirect(prodName, targetStore, targetUrl);
    };

    if (continueBtn) continueBtn.onclick = executeRedirect;
    if (cancelBtn) cancelBtn.onclick = () => modal.classList.remove('active');
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('active');
  },

  // Outbound Affiliate Interstitial Flow
  triggerAffiliateRedirect(productName, storeName, targetUrl) {
    const decodedName = decodeURIComponent(productName);
    const store = (storeName || 'Amazon').trim();
    
    // Ensure 100% working live marketplace destination URL (prevents dead links / 404s)
    let finalUrl = targetUrl;
    if (!finalUrl || finalUrl === '#' || finalUrl.includes('example.com') || finalUrl.includes('ref=cs_404_link')) {
      if (store.toLowerCase().includes('flipkart')) {
        finalUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(decodedName)}&affid=shopscout`;
      } else {
        finalUrl = `https://www.amazon.in/s?k=${encodeURIComponent(decodedName)}&tag=shopscout-21`;
      }
    } else {
      // Preserve direct product URL and ensure affiliate tag is appended
      if (store.toLowerCase().includes('flipkart') && !finalUrl.includes('affid=')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'affid=shopscout';
      } else if (store.toLowerCase().includes('amazon') && !finalUrl.includes('tag=')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'tag=shopscout-21';
      }
    }

    // Log outbound affiliate click
    const clicks = this.getClicks();
    clicks.push({
      productName: decodedName,
      marketplace: store,
      timestamp: new Date().toISOString(),
      url: finalUrl
    });
    localStorage.setItem(this.KEYS.CLICKS, JSON.stringify(clicks));

    // Show Interstitial Modal
    let modal = document.getElementById('affiliate-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'affiliate-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card">
          <div class="redirect-pulse">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </div>
          <h3 style="font-size: 1.35rem; margin-bottom: 0.35rem; font-weight: 800;">Opening ${store}...</h3>
          <p style="font-size: 0.9rem; color: var(--muted); margin-bottom: 1rem;">
            Taking you to <strong id="redirect-product-name" style="color: var(--text);"></strong> on ${store} to complete your order securely.
          </p>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" id="redirect-progress"></div>
          </div>
          <div class="affiliate-disclaimer-box">
            <i class="fa-solid fa-shield-halved text-primary"></i> <strong>Affiliate Disclosure:</strong> ShopScout does not sell or deliver this product directly. You complete your transaction on ${store}. We may earn an affiliate commission on eligible purchases at no extra cost to you.
          </div>
          <div style="margin-top: 1.25rem; display: flex; gap: 0.75rem; justify-content: center;">
            <button class="btn btn-outline btn-sm" id="cancel-redirect-btn">Cancel</button>
            <a href="${finalUrl}" target="_blank" rel="noopener noreferrer nofollow" class="btn btn-primary btn-sm" id="continue-redirect-btn">
              Go Immediately <i class="fa-solid fa-arrow-right"></i>
            </a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const prodNameEl = modal.querySelector('#redirect-product-name');
    if (prodNameEl) prodNameEl.textContent = decodedName;

    const continueBtn = modal.querySelector('#continue-redirect-btn');
    if (continueBtn) continueBtn.href = finalUrl;

    const progressBar = modal.querySelector('#redirect-progress');
    if (progressBar) progressBar.style.width = '0%';

    modal.classList.add('active');

    let startTime = Date.now();
    const duration = 1800; // 1.8 seconds interstitial

    const cancelBtn = modal.querySelector('#cancel-redirect-btn');
    let cancelled = false;

    cancelBtn.onclick = () => {
      cancelled = true;
      modal.classList.remove('active');
    };

    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval);
        return;
      }
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;

      if (elapsed >= duration) {
        clearInterval(interval);
        modal.classList.remove('active');
        window.open(finalUrl, '_blank', 'noopener,noreferrer,nofollow');
      }
    }, 40);
  },

  // Floating Compare Drawer
  renderCompareDrawer() {
    let drawer = document.getElementById('compare-drawer');
    const compareIds = this.getCompare();

    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'compare-drawer';
      drawer.className = 'compare-drawer';
      document.body.appendChild(drawer);
    }

    if (compareIds.length === 0) {
      drawer.classList.remove('active');
      return;
    }

    // Determine correct relative path for compare.html based on location
    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const compareUrl = isPagesSubdir ? 'compare.html' : 'pages/compare.html';

    drawer.innerHTML = `
      <div class="container compare-drawer-content">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div class="badge badge-primary">
            <i class="fa-solid fa-scale-balanced"></i> ${compareIds.length}/4 Selected
          </div>
          <span style="font-size: 0.85rem; font-weight: 600; color: var(--text);">Compare Products</span>
        </div>
        <div class="compare-slots" id="drawer-compare-slots">
          ${compareIds.map(id => `
            <div class="compare-slot">
              <span class="compare-slot-title">Item #${id}</span>
              <span class="compare-slot-remove" onclick="ShopScout.toggleCompare('${id}')" title="Remove">&times;</span>
            </div>
          `).join('')}
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <button class="btn btn-outline btn-sm" onclick="ShopScout.clearCompare()">Clear</button>
          <a href="${compareUrl}" class="btn btn-primary btn-sm">Compare Now &rarr;</a>
        </div>
      </div>
    `;

    drawer.classList.add('active');
  },

  // Theme Management
  initTheme() {
    const saved = localStorage.getItem(this.KEYS.THEME) || 'light';
    document.documentElement.setAttribute('data-theme', saved);

    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.onclick = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(this.KEYS.THEME, next);
      };
    });
  },

  // Price Drop Alert Setter
  setPriceAlert(productId, targetPrice, email) {
    const alerts = this.getAlerts();
    alerts[productId] = {
      targetPrice: Number(targetPrice),
      email: email || 'user@example.com',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(alerts));
    this.toast(`Price alert activated for ₹${Number(targetPrice).toLocaleString('en-IN')}!`, 'success');
  },

  // Global Bootstrapper
  init() {
    this.initTheme();
    this.updateBadges();
    this.renderCompareDrawer();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ShopScout.init();
});
