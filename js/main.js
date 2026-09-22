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
    DELETED_PRODUCTS: 'shopscout_deleted_products',
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

  getAffiliateConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem('shopscout_affiliate_config'));
      if (saved && saved.amazonTag) return saved;
    } catch (e) {}
    return {
      amazonTag: 'shopscout-21'
    };
  },

  getApiBase() {
    if (typeof window !== 'undefined') {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (isLocal) {
        return (window.location.port === '3000') ? '' : 'http://localhost:3000';
      }
    }
    return '';
  },

  async loadServerAffiliateConfig() {
    try {
      const apiBase = this.getApiBase();
      const res = await fetch(`${apiBase}/api/config/affiliate`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const cfg = { amazonTag: data.amazonTag };
          localStorage.setItem('shopscout_affiliate_config', JSON.stringify(cfg));
          return cfg;
        }
      }
    } catch (e) {}
    return this.getAffiliateConfig();
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

  // 1-Click WhatsApp Deal Share
  async shareOnWhatsApp(productId) {
    try {
      let product = null;
      if (typeof ProductService !== 'undefined') {
        product = await ProductService.getProductById(productId);
      }
      if (!product) {
        const custom = JSON.parse(localStorage.getItem(this.KEYS.CUSTOM_PRODUCTS)) || [];
        product = custom.find(p => p.id === productId);
      }
      if (!product) return;

      const origin = window.location.origin;
      const isPagesSubdir = window.location.pathname.includes('/pages/');
      const shareUrl = isPagesSubdir 
        ? `${origin}/pages/product-details.html?id=${product.id}`
        : `${origin}/pages/product-details.html?id=${product.id}`;

      const discount = product.discount ? `${product.discount}% OFF` : '';
      const text = `🔥 *Loot Deal Alert on ShopScout!* 🛍️\n\n*${product.name}*\n💰 Deal Price: ${this.formatPrice(product.price)}${product.originalPrice ? ` (MRP: ${this.formatPrice(product.originalPrice)})` : ''} ${discount}\n🛒 Store: ${product.marketplace || 'Amazon'}\n\n👉 Check Deal & Compare Live Rates:\n${shareUrl}`;

      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      this.toast('Opening WhatsApp to share deal...', 'success');
    } catch (e) {
      console.error('Error sharing on WhatsApp:', e);
    }
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
  // Outbound Affiliate Direct Checkout Flow (Amazon India)
  async openBuyModal(productOrId) {
    let product = null;

    if (typeof productOrId === 'object' && productOrId !== null) {
      product = productOrId;
    } else if (typeof productOrId === 'string') {
      // 1. Direct localStorage check first for newly added admin products
      try {
        const custom = JSON.parse(localStorage.getItem(ShopScout.KEYS.CUSTOM_PRODUCTS)) || [];
        product = custom.find(p => String(p.id) === String(productOrId) || p.name === productOrId);
      } catch (e) {}

      // 2. ProductService lookup
      if (!product && window.ProductService) {
        if (ProductService._cache) ProductService._cache = null; // Force fresh read
        const all = await ProductService.getAllProducts();
        product = all.find(p => String(p.id) === String(productOrId) || p.name === productOrId);
      }

      // 3. Fallback: extract from DOM card
      if (!product) {
        const card = document.querySelector(`.product-card[data-id="${productOrId}"]`);
        const name = card ? card.querySelector('.product-title a')?.textContent?.trim() : decodeURIComponent(productOrId);
        const cardAffiliateUrl = card ? (card.getAttribute('data-affiliate-url') || card.querySelector('.btn-card-buy')?.getAttribute('data-affiliate-url') || '') : '';
        
        let extractedPrice = 12999;
        if (card) {
          const priceText = card.querySelector('.product-current-price')?.textContent || '';
          const num = parseInt(priceText.replace(/[^0-9]/g, ''), 10);
          if (num) extractedPrice = num;
        }

        product = {
          id: productOrId,
          name: name || decodeURIComponent(productOrId),
          price: extractedPrice,
          originalPrice: Math.round(extractedPrice * 1.35),
          image: card ? card.querySelector('.product-card-img')?.src : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
          marketplace: 'Amazon',
          affiliateUrl: cardAffiliateUrl || `https://www.amazon.in/s?k=${encodeURIComponent(name || 'product')}&tag=shopscout-21`,
          stores: []
        };
      }
    }

    if (!product) return;

    const prodName = product.name || 'Product';
    const cleanEncodedName = encodeURIComponent(prodName.replace(/[()]/g, ' ').trim());

    // Resolve Amazon URL
    let amzUrl = product.amazonUrl || (product.marketplace === 'Amazon' ? product.affiliateUrl : '');
    if (!amzUrl && Array.isArray(product.marketplacePrices)) {
      const u = product.marketplacePrices.find(p => p.store?.toLowerCase().includes('amazon'))?.url || '';
      if (u) amzUrl = u;
    }
    if (!amzUrl && Array.isArray(product.stores)) {
      const u = product.stores.find(s => s.name?.toLowerCase().includes('amazon'))?.affiliateUrl || '';
      if (u) amzUrl = u;
    }
    if (!amzUrl || amzUrl === '#' || amzUrl.includes('/s?k=')) {
      try {
        const apiBase = this.getApiBase();
        const res = await fetch(`${apiBase}/api/products/direct-link?store=Amazon&query=${cleanEncodedName}`);
        if (res.ok) {
          const d = await res.json();
          if (d.directUrl && !d.directUrl.includes('/s?k=')) {
            amzUrl = d.directUrl;
          }
        }
      } catch (e) {}
      if (!amzUrl || amzUrl === '#') {
        amzUrl = `https://www.amazon.in/s?k=${cleanEncodedName}&tag=shopscout-21`;
      }
    }

    // Direct One-Click Amazon Redirection
    this.triggerAffiliateRedirect(prodName, 'Amazon', amzUrl);
  },

  // Outbound Affiliate Interstitial Flow (Amazon India Verified)
  async triggerAffiliateRedirect(productName, storeName, targetUrl) {
    const decodedName = decodeURIComponent(productName);
    const store = 'Amazon';
    let finalUrl = targetUrl;
    const cleanSearchQuery = encodeURIComponent(decodedName.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim());

    // Clean any accidental non-amazon URL
    if (finalUrl && !finalUrl.includes('amazon') && !finalUrl.includes('amzn')) {
      finalUrl = '';
    }

    // If target URL is a search page or empty, resolve the exact direct product buy page!
    if (!finalUrl || finalUrl === '#' || finalUrl.includes('/s?k=')) {
      try {
        const apiBase = this.getApiBase();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`${apiBase}/api/products/direct-link?store=Amazon&query=${cleanSearchQuery}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.directUrl) {
            finalUrl = data.directUrl;
          }
        }
      } catch (e) {}
    }

    const affConfig = this.getAffiliateConfig();
    const activeAmzTag = affConfig.amazonTag || 'shopscout-21';

    if (!finalUrl || finalUrl === '#' || finalUrl.includes('example.com') || finalUrl.includes('ref=cs_404_link')) {
      finalUrl = `https://www.amazon.in/s?k=${cleanSearchQuery}&tag=${activeAmzTag}`;
    } else {
      // Preserve direct product URL and ensure active affiliate tag is appended or replaced
      if (!finalUrl.includes('tag=')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + `tag=${activeAmzTag}`;
      } else {
        finalUrl = finalUrl.replace(/tag=[^&#]+/i, `tag=${activeAmzTag}`);
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

    // Open destination in a clean new tab while keeping the current ShopScout tab completely intact
    try {
      const link = document.createElement('a');
      link.href = finalUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }
  },

  // Floating Compare Drawer
  renderCompareDrawer() {
    if (window.location.pathname.includes('/admin/')) {
      const existing = document.getElementById('compare-drawer');
      if (existing) existing.remove();
      return;
    }

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

  // Trust Features Interactive Modals
  openTrustModal(type) {
    let modal = document.getElementById('trust-feature-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'trust-feature-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const basePath = isPagesSubdir ? '' : 'pages/';

    let content = '';

    if (type === 'tracking') {
      content = `
        <div class="modal-card" style="max-width: 520px; text-align: left; padding: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(37,99,235,0.12); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                <i class="fa-solid fa-chart-line"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">Live Price Tracking</h3>
                <span style="font-size: 0.8rem; color: var(--muted);">Real-Time Retailer Comparison</span>
              </div>
            </div>
            <button type="button" class="btn-icon" onclick="document.getElementById('trust-feature-modal').classList.remove('active')" style="background: var(--surface-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--muted);"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.25rem;">
            <p style="margin-bottom: 0.75rem;"><strong>Ye kaise kaam karta hai?</strong></p>
            <p>ShopScout har ghante <strong style="color: var(--text);">Amazon India</strong> ke live prices fetch karta hai. Jab aap koi product open karte hain, hum live pricing, lightning deals aur Prime delivery timeline verify karke aapko sabse sasti deal automatically dikhate hain!</p>
            <div style="background: var(--surface-subtle); padding: 1rem; border-radius: var(--radius-md); margin-top: 1rem; border-left: 3px solid #2563eb;">
              <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.25rem; color: var(--text);"><i class="fa-solid fa-bolt" style="color: #2563eb;"></i> Instant Savings</div>
              <div style="font-size: 0.82rem; color: var(--muted);">Shoppers ne average 18% se 35% tak ki bachat ki hai best verified deals choose karke!</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('trust-feature-modal').classList.remove('active')">Close</button>
            <a href="${basePath}deals.html" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-bolt"></i> View Top Deals</a>
          </div>
        </div>
      `;
    } else if (type === 'retailers') {
      content = `
        <div class="modal-card" style="max-width: 520px; text-align: left; padding: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16,185,129,0.12); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">100% Genuine Retailers</h3>
                <span style="font-size: 0.8rem; color: var(--muted);">Verified &amp; Safe Checkout</span>
              </div>
            </div>
            <button type="button" class="btn-icon" onclick="document.getElementById('trust-feature-modal').classList.remove('active')" style="background: var(--surface-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--muted);"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.25rem;">
            <p style="margin-bottom: 0.75rem;"><strong>Aapki Security Hamari Priority Hai:</strong></p>
            <ul style="padding-left: 1.2rem; margin: 0 0 1rem 0; font-size: 0.88rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <li><strong style="color: var(--text);">Direct Store Checkout:</strong> Hum aapse payment nahi lete; payment direct Amazon India par official safe gateway se hoti hai.</li>
              <li><strong style="color: var(--text);">100% Original Brands:</strong> Apple, Samsung, Sony jaise brands ke brand warranty aur GST invoice ke sath items milte hain.</li>
              <li><strong style="color: var(--text);">Official Return Policy:</strong> 7 se 10 dino ki replacement &amp; refund policy applicable rehti hai.</li>
            </ul>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('trust-feature-modal').classList.remove('active')">Got It</button>
            <a href="${basePath}affiliate-disclosure.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-file-shield"></i> Read Safety Policy</a>
          </div>
        </div>
      `;
    } else if (type === 'alerts') {
      content = `
        <div class="modal-card" style="max-width: 500px; text-align: left; padding: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(245,158,11,0.15); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                <i class="fa-solid fa-bell"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">Price Drop Alert</h3>
                <span style="font-size: 0.8rem; color: var(--muted);">Kabhi bhi mehenga mat kharido</span>
              </div>
            </div>
            <button type="button" class="btn-icon" onclick="document.getElementById('trust-feature-modal').classList.remove('active')" style="background: var(--surface-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--muted);"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <form id="global-price-alert-form" onsubmit="event.preventDefault(); ShopScout.handleGlobalPriceAlert(event);">
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text);">Product Name / Category</label>
              <input type="text" id="alert-product-input" class="form-control" placeholder="e.g. iPhone 15, Sony Headphones, boAt Watch" required style="width: 100%; padding: 0.65rem 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--text);" />
            </div>

            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text);">Email or WhatsApp Number</label>
              <input type="text" id="alert-contact-input" class="form-control" placeholder="e.g. name@example.com ya 9876543210" required style="width: 100%; padding: 0.65rem 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--text);" />
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: block; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text);">Target Discount</label>
              <select id="alert-discount-select" class="form-control" style="width: 100%; padding: 0.65rem 0.9rem; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); color: var(--text);">
                <option value="10">Jab price 10% kam ho</option>
                <option value="20" selected>Jab price 20% kam ho (Recommended)</option>
                <option value="30">Jab price 30% kam ho</option>
                <option value="50">Bumper Loot Deal (50%+ Off)</option>
              </select>
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
              <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('trust-feature-modal').classList.remove('active')">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm" style="display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-bell"></i> Set Price Alert</button>
            </div>
          </form>
        </div>
      `;
    } else if (type === 'markup') {
      content = `
        <div class="modal-card" style="max-width: 520px; text-align: left; padding: 2rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(139,92,246,0.15); color: #8b5cf6; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                <i class="fa-solid fa-hand-holding-dollar"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800;">Zero Extra Markup</h3>
                <span style="font-size: 0.8rem; color: var(--muted);">100% Free For All Shoppers</span>
              </div>
            </div>
            <button type="button" class="btn-icon" onclick="document.getElementById('trust-feature-modal').classList.remove('active')" style="background: var(--surface-subtle); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: var(--muted);"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <div style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.25rem;">
            <p style="margin-top: 0.5rem;">Jab aap hamare link se Amazon par jaakar khareedte hain, toh retailer hume chhota sa marketing referral deta hai. <strong style="color: var(--text);">Aapke liye price bilkul wahi rehta hai, ya offers ki wajah se aur bhi kam ho jata hai!</strong></p>
          </div>

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('trust-feature-modal').classList.remove('active')">Got It</button>
            <a href="${basePath}about.html" class="btn btn-primary btn-sm"><i class="fa-solid fa-circle-info"></i> About Us</a>
          </div>
        </div>
      `;
    }

    modal.innerHTML = content;
    modal.classList.add('active');

    // Close on background overlay click
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('active');
    };
  },

  handleGlobalPriceAlert(e) {
    const product = document.getElementById('alert-product-input').value;
    const contact = document.getElementById('alert-contact-input').value;
    const discount = document.getElementById('alert-discount-select').value;
    
    // Save to alerts storage
    const alerts = this.getAlerts();
    const alertId = 'alert_' + Date.now();
    alerts[alertId] = {
      product,
      contact,
      discount: discount + '%',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.ALERTS, JSON.stringify(alerts));

    const modal = document.getElementById('trust-feature-modal');
    if (modal) modal.classList.remove('active');

    this.toast(`🔔 Price Drop Alert set for "${product}"! Hum aapko notify karenge.`, 'success');
  },

  // --------------------------------------------------------------------------
  // INTELLIGENT FUZZY SEARCH & TYPO TOLERANCE ENGINE
  // --------------------------------------------------------------------------
  SEARCH_SYNONYMS: {
    // Computing, Peripherals & Gaming
    'mose': 'mouse', 'mous': 'mouse', 'muse': 'mouse', 'mowse': 'mouse', 'maus': 'mouse', 'mosue': 'mouse',
    'laptp': 'laptop', 'lapotp': 'laptop', 'lapto': 'laptop', 'leptop': 'laptop', 'labtop': 'laptop', 'leppy': 'laptop',
    'keybord': 'keyboard', 'kybord': 'keyboard', 'keybrd': 'keyboard', 'kybrd': 'keyboard',
    'moniter': 'monitor', 'monitr': 'monitor', 'scrn': 'screen',
    'gamming': 'gaming', 'gamin': 'gaming', 'gaiming': 'gaming', 'gamng': 'gaming',

    // Audio & Speakers
    'spekar': 'speaker', 'speeker': 'speaker', 'speker': 'speaker', 'spikr': 'speaker', 'spker': 'speaker', 'spkr': 'speaker', 'spikers': 'speaker',
    'headfone': 'headphone', 'hedphone': 'headphone', 'hedfone': 'headphone', 'headfones': 'headphone', 'hedphones': 'headphone',
    'earfone': 'earphone', 'erphone': 'earphone', 'earfones': 'earphone',
    'airpod': 'earbuds', 'airpods': 'earbuds', 'earbud': 'earbuds', 'earbuds': 'earbuds', 'earbad': 'earbuds', 'earbads': 'earbuds', 'tws': 'earbuds',
    'saund': 'sound', 'sond': 'sound', 'bas': 'bass', 'bazz': 'bass',
    'audeo': 'audio', 'audiyo': 'audio', 'ado': 'audio',

    // Connectivity & Power
    'wireles': 'wireless', 'wirless': 'wireless', 'wirles': 'wireless', 'wirelss': 'wireless', 'wless': 'wireless',
    'blutooth': 'bluetooth', 'blututh': 'bluetooth', 'bluetoth': 'bluetooth', 'bt': 'bluetooth', 'blutoot': 'bluetooth',
    'chager': 'charger', 'chargr': 'charger', 'cargr': 'charger', 'adpter': 'adapter',
    'cabal': 'cable', 'cabl': 'cable', 'kabal': 'cable',
    'powrbank': 'powerbank', 'powerbanck': 'powerbank', 'powrbnk': 'powerbank',

    // Wearables, Mobile & General
    'fon': 'phone', 'fone': 'phone', 'moble': 'mobile', 'mobil': 'mobile', 'smartfone': 'smartphone',
    'wach': 'watch', 'wtch': 'watch', 'smartwach': 'smartwatch', 'wacth': 'watch',
    'spashproof': 'splashproof', 'waterprof': 'waterproof', 'watrproof': 'waterproof',
    'camra': 'camera', 'cam': 'camera',

    // Popular Brands
    'lenvo': 'lenovo', 'lenov': 'lenovo', 'linovo': 'lenovo',
    'frontch': 'frontech', 'frontec': 'frontech', 'frontek': 'frontech',
    'sounc': 'sounce', 'sounse': 'sounce', 'sounze': 'sounce', 'souncee': 'sounce',
    'snoy': 'sony', 'soni': 'sony',
    'aple': 'apple', 'appl': 'apple', 'aplle': 'apple',
    'samsng': 'samsung', 'samung': 'samsung', 'samsumg': 'samsung', 'smasung': 'samsung',
    'logitek': 'logitech', 'logitec': 'logitech', 'logi': 'logitech',
    'bot': 'boat', 'boatt': 'boat',
    'zebro': 'zebronics', 'zebronik': 'zebronics', 'zebronic': 'zebronics',
    'oneplus': 'oneplus', '1plus': 'oneplus',
    'relme': 'realme', 'relami': 'realme',
    'redmi': 'xiaomi', 'mi': 'xiaomi',
    'jbll': 'jbl', 'jb': 'jbl'
  },

  // Damerau-Levenshtein Edit Distance (insertions, deletions, substitutions, adjacent transpositions)
  editDistance(s1, s2) {
    if (s1 === s2) return 0;
    const l1 = s1.length;
    const l2 = s2.length;
    if (l1 === 0) return l2;
    if (l2 === 0) return l1;
    if (Math.abs(l1 - l2) > 3) return 99; // Early exit on huge length differences

    const d = [];
    for (let i = 0; i <= l1; i++) {
      d[i] = [i];
    }
    for (let j = 0; j <= l2; j++) {
      d[0][j] = j;
    }

    for (let i = 1; i <= l1; i++) {
      for (let j = 1; j <= l2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,       // deletion
          d[i][j - 1] + 1,       // insertion
          d[i - 1][j - 1] + cost // substitution
        );
        // Transposition check (e.g. "teh" -> "the", "la-tp-op" -> "la-pt-op")
        if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[l1][l2];
  },

  // Tokenize text into lowercase alphanumeric words
  tokenize(str) {
    if (!str || typeof str !== 'string') return [];
    return str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  },

  // Match a query token against a target word in product fields
  matchTokenAgainstWord(token, word) {
    if (!token || !word) return 0;
    if (token === word) return 100; // Exact match

    // Check synonym dictionary
    const syn = this.SEARCH_SYNONYMS[token];
    if (syn && (syn === word || word.includes(syn))) return 95;
    const wordSyn = this.SEARCH_SYNONYMS[word];
    if (wordSyn && (wordSyn === token || token.includes(wordSyn))) return 95;

    // Prefix match (e.g., "gam" -> "gaming", "len" -> "lenovo")
    if (token.length >= 2 && word.startsWith(token)) return 85;
    if (word.length >= 2 && token.startsWith(word)) return 80;

    // Substring match
    if (token.length >= 3 && word.includes(token)) return 75;
    if (word.length >= 3 && token.includes(word)) return 70;

    // Length-adaptive Typo / Levenshtein distance
    const tLen = token.length;
    let maxDist = 0;
    if (tLen >= 3 && tLen <= 4) maxDist = 1;      // e.g. "mose" -> "mouse", "snoy" -> "sony"
    else if (tLen >= 5 && tLen <= 8) maxDist = 2; // e.g. "lenvo" -> "lenovo", "spekar" -> "speaker", "wireles" -> "wireless"
    else if (tLen >= 9) maxDist = 3;              // e.g. "splashprof" -> "splashproof"

    if (maxDist > 0) {
      const dist = this.editDistance(token, word);
      if (dist <= maxDist) {
        if (dist === 1) return 65;
        if (dist === 2) return 45;
        if (dist === 3) return 30;
      }

      // Check fuzzy prefix (e.g., user wrote "gamig" vs "gaming")
      if (word.length > tLen && tLen >= 4) {
        const prefixDist = this.editDistance(token, word.slice(0, tLen));
        if (prefixDist <= 1) return 55;
      }
    }

    return 0;
  },

  // Score a product against query tokens
  scoreProduct(product, queryTokens, rawQuery) {
    if (!product || !queryTokens || queryTokens.length === 0) return 0;

    const brand = (product.brand || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    const features = Array.isArray(product.features) ? product.features.join(' ').toLowerCase() : '';
    const specs = product.specifications ? Object.values(product.specifications).join(' ').toLowerCase() : '';

    const brandWords = this.tokenize(brand);
    const nameWords = this.tokenize(name);
    const catWords = this.tokenize(category);
    const otherWords = this.tokenize(`${description} ${features} ${specs}`);

    let totalScore = 0;
    let matchedTokensCount = 0;

    // Full query substring match bonus
    const cleanRaw = rawQuery.toLowerCase().trim();
    if (cleanRaw.length >= 3) {
      if (name.includes(cleanRaw)) totalScore += 180;
      else if (brand.includes(cleanRaw)) totalScore += 150;
      else if (category.includes(cleanRaw)) totalScore += 120;
    }

    // Match each token
    queryTokens.forEach(token => {
      let bestTokenScore = 0;

      // Check Brand (Weight 2.5)
      for (const bw of brandWords) {
        const s = this.matchTokenAgainstWord(token, bw) * 2.5;
        if (s > bestTokenScore) bestTokenScore = s;
      }

      // Check Name / Title (Weight 2.0)
      for (const nw of nameWords) {
        const s = this.matchTokenAgainstWord(token, nw) * 2.0;
        if (s > bestTokenScore) bestTokenScore = s;
      }

      // Check Category (Weight 1.8)
      for (const cw of catWords) {
        const s = this.matchTokenAgainstWord(token, cw) * 1.8;
        if (s > bestTokenScore) bestTokenScore = s;
      }

      // Check Description & Features (Weight 1.0)
      if (bestTokenScore < 60) {
        for (const ow of otherWords) {
          const s = this.matchTokenAgainstWord(token, ow) * 1.0;
          if (s > bestTokenScore) bestTokenScore = s;
        }
      }

      if (bestTokenScore >= 40) {
        matchedTokensCount++;
        totalScore += bestTokenScore;
      }
    });

    const numTokens = queryTokens.length;
    if (numTokens === 1) {
      return matchedTokensCount === 1 ? totalScore : 0;
    }

    // Multi-word queries:
    if (matchedTokensCount === numTokens) {
      totalScore += 160; // Huge bonus for matching all user search terms
    } else if (matchedTokensCount >= Math.ceil(numTokens * 0.5)) {
      totalScore += 40 * matchedTokensCount;
    } else {
      return 0; // Filter out products that matched too few tokens
    }

    return totalScore;
  },

  // Main intelligent search entry point: returns products sorted by relevance
  fuzzySearch(products, query) {
    if (!products || !Array.isArray(products)) return [];
    if (!query || typeof query !== 'string' || !query.trim()) return products;

    const rawQuery = query.trim();
    const allTokens = this.tokenize(rawQuery);
    if (allTokens.length === 0) return products;

    // Filter common English stop-words only if there are other tokens
    const stopWords = new Set(['in', 'on', 'at', 'with', 'for', 'of', 'and', 'the', 'a', 'an', 'is', 'to']);
    let tokens = allTokens.filter(t => !stopWords.has(t));
    if (tokens.length === 0) tokens = allTokens;

    const scoredList = [];
    for (const p of products) {
      const score = this.scoreProduct(p, tokens, rawQuery);
      if (score > 0) {
        scoredList.push({ product: p, score });
      }
    }

    // Sort descending by relevance score
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.map(item => item.product);
  },

  // Global Bootstrapper
  init() {
    try {
      const v = localStorage.getItem('shopscout_v_clean');
      if (v !== '2.2') {
        localStorage.removeItem(this.KEYS.CUSTOM_PRODUCTS);
        localStorage.removeItem(this.KEYS.COMPARE);
        localStorage.removeItem(this.KEYS.DELETED_PRODUCTS);
        localStorage.setItem('shopscout_v_clean', '2.2');
      }
    } catch (e) {}

    this.initTheme();
    this.updateBadges();
    this.renderCompareDrawer();
    this.loadServerAffiliateConfig();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ShopScout.init();
});
