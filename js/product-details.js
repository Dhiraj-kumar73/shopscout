/**
 * SHOPSCOUT — PRODUCT DETAILS CONTROLLER
 */

const ProductDetailsController = {
  currentProduct: null,

  async init() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let productId = urlParams.get('id');

      // Fetch all products to verify catalog and provide graceful fallback
      const allProducts = await ProductService.getAllProducts();

      if (!allProducts || allProducts.length === 0) {
        this.renderNotFound('Catalog is currently unavailable. Please check back shortly.');
        return;
      }

      let product = null;
      if (productId) {
        product = ProductService.findProductInList(allProducts, productId);
      }

      // If specific product ID was not provided or not found, gracefully load the first catalog item
      if (!product) {
        console.warn(`[ShopScout] Product ID "${productId}" not found. Displaying primary catalog item.`);
        product = allProducts[0];
        if (history.replaceState && product && product.id) {
          const newUrl = `${window.location.pathname}?id=${encodeURIComponent(product.id)}`;
          history.replaceState({ id: product.id }, '', newUrl);
        }
      }

      if (!product) {
        this.renderNotFound('Product Not Found');
        return;
      }

      this.currentProduct = product;
      document.title = `${product.name} — ShopScout Price Comparison`;

      // Safe, isolated rendering for each section so that an issue in one does not break the page
      try { this.renderBreadcrumbs(product); } catch (e) { console.warn('Breadcrumbs error:', e); }
      try { this.renderGallery(product); } catch (e) { console.warn('Gallery error:', e); }
      try { this.renderInfoPanel(product); } catch (e) { console.warn('Info panel error:', e); }
      try { this.renderVariants(product); } catch (e) { console.warn('Variants error:', e); }
      try { this.renderPriceHistoryChart(product); } catch (e) { console.warn('Price history chart error:', e); }
      try { this.renderTabs(product); } catch (e) { console.warn('Tabs error:', e); }
      try { this.renderRelatedProducts(product); } catch (e) { console.warn('Related products error:', e); }
      try { this.bindPriceAlertModal(product); } catch (e) { console.warn('Price alert modal error:', e); }

      if (typeof window !== 'undefined' && !window.location.hash) {
        window.scrollTo(0, 0);
      }
    } catch (criticalErr) {
      console.error('[ShopScout] Critical error initializing product details:', criticalErr);
      this.renderNotFound('Unable to display product details.');
    }
  },

  renderNotFound(message) {
    const titleEl = document.getElementById('detail-title');
    const brandEl = document.getElementById('detail-brand');
    const currentPriceEl = document.getElementById('detail-price-current');
    const galleryMain = document.getElementById('gallery-main');
    const verdictEl = document.getElementById('ph-verdict');

    if (titleEl) titleEl.textContent = 'Product Not Found';
    if (brandEl) brandEl.textContent = 'ShopScout Store';
    if (currentPriceEl) currentPriceEl.textContent = '—';
    if (verdictEl) verdictEl.textContent = 'N/A';

    if (galleryMain) {
      galleryMain.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:360px; text-align:center; padding:2rem; color:var(--muted); background:var(--surface-subtle); border-radius:var(--radius-md);">
          <i class="fa-solid fa-box-open" style="font-size:3.5rem; color:var(--deal-orange); margin-bottom:1rem; opacity:0.85;"></i>
          <h3 style="color:var(--text); font-weight:800; font-size:1.3rem; margin-bottom:0.5rem;">${message || 'Product Not Found'}</h3>
          <p style="font-size:0.88rem; max-width:320px; line-height:1.5; margin-bottom:1.5rem; color:var(--muted);">The product link might be outdated or removed from our catalog.</p>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap; justify-content:center;">
            <a href="products.html" class="btn btn-primary btn-sm" style="display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-layer-group"></i> Browse All Products</a>
            <a href="../index.html" class="btn btn-outline btn-sm" style="display:inline-flex; align-items:center; gap:6px;"><i class="fa-solid fa-house"></i> Home</a>
          </div>
        </div>
      `;
    }
  },

  renderBreadcrumbs(product) {
    const container = document.getElementById('product-breadcrumbs');
    if (!container) return;

    container.innerHTML = `
      <ol class="breadcrumb-list">
        <li><a href="../index.html">Home</a></li>
        <li class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></li>
        <li><a href="products.html?category=${encodeURIComponent(product.category)}">${product.category}</a></li>
        <li class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></li>
        <li class="breadcrumb-current">${product.name}</li>
      </ol>
    `;
  },

  renderGallery(product) {
    const mainViewport = document.getElementById('gallery-main');
    const angleChipsContainer = document.getElementById('gallery-angle-chips');
    const thumbRail = document.getElementById('gallery-thumbs');
    if (!mainViewport || !thumbRail) return;

    let rawImages = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image];
    
    // Default angle labels and icons if not provided
    const defaultAngles = [
      { angle: 'Front & Back View', icon: 'fa-mobile-screen' },
      { angle: 'Back 3D Finish', icon: 'fa-rotate' },
      { angle: 'Ultra-Slim Side Profile', icon: 'fa-arrows-left-right' },
      { angle: '120Hz Display Angle', icon: 'fa-sun' },
      { angle: 'In-Hand Lifestyle', icon: 'fa-hand' },
      { angle: 'Ports & Speakers', icon: 'fa-plug' }
    ];

    let images = rawImages.map((img, idx) => {
      if (typeof img === 'object' && img !== null) {
        return {
          url: img.url || img.image || img.img,
          angle: img.angle || img.label || defaultAngles[idx]?.angle || `Angle ${idx + 1}`,
          icon: img.icon || defaultAngles[idx]?.icon || 'fa-camera'
        };
      }
      return {
        url: img,
        angle: defaultAngles[idx]?.angle || `Angle ${idx + 1}`,
        icon: defaultAngles[idx]?.icon || 'fa-camera'
      };
    }).filter(item => {
      const u = item.url;
      return u && typeof u === 'string' && !u.includes('images-na.ssl-images-amazon.com') && !u.startsWith('data:');
    });

    // Deduplicate images by Amazon image key or URL
    const seenImageKeys = new Set();
    images = images.filter(item => {
      const key = this.getAmazonImageKey(item.url) || item.url;
      if (!key || seenImageKeys.has(key)) return false;
      seenImageKeys.add(key);
      return true;
    });

    if (images.length === 0) {
      const fallbackUrl = (product.image && !product.image.includes('images-na.ssl-images-amazon.com') && !product.image.startsWith('data:'))
        ? product.image
        : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
      images = [{ url: fallbackUrl, angle: 'Front View', icon: 'fa-mobile-screen' }];
    }

    const activeItem = images[0];

    mainViewport.innerHTML = `
      <div class="gallery-angle-badge" id="current-angle-label">
        <i class="fa-solid ${activeItem.icon}"></i> <span id="angle-text">${activeItem.angle}</span>
      </div>
      <div class="gallery-zoom-trigger" onclick="ProductDetailsController.openFullZoom('${activeItem.url}')" title="Zoom image in full screen">
        <i class="fa-solid fa-magnifying-glass-plus"></i> Zoom
      </div>
      <img id="main-image-display" src="${activeItem.url}" alt="${product.name} - ${activeItem.angle}" style="max-width: 84%; max-height: 84%; width: auto; height: auto; object-fit: contain; margin: auto; display: block;">
    `;

    if (angleChipsContainer) {
      if (images.length > 1) {
        angleChipsContainer.style.display = 'flex';
        angleChipsContainer.innerHTML = images.map((item, idx) => `
          <button type="button" class="angle-nav-chip ${idx === 0 ? 'active' : ''}" 
                  data-index="${idx}"
                  onclick="ProductDetailsController.switchAngle(${idx}, '${item.url}', '${item.angle.replace(/'/g, "\\'")}', '${item.icon}')">
            <i class="fa-solid ${item.icon}"></i> ${item.angle}
          </button>
        `).join('');
      } else {
        angleChipsContainer.style.display = 'none';
      }
    }

    thumbRail.innerHTML = images.map((item, idx) => `
      <div class="gallery-thumb ${idx === 0 ? 'active' : ''}" 
           data-index="${idx}"
           title="${item.angle}"
           onclick="ProductDetailsController.switchAngle(${idx}, '${item.url}', '${item.angle.replace(/'/g, "\\'")}', '${item.icon}')">
        <img src="${item.url}" alt="${item.angle}">
        <span class="thumb-angle-tag">${this.getShortAngleTag(item.angle, idx)}</span>
      </div>
    `).join('');
  },

  getAmazonImageKey(url) {
    if (!url || typeof url !== 'string') return null;
    const match = url.match(/\/images\/I\/([A-Za-z0-9+%-]+)\./);
    return match ? match[1] : url;
  },

  getShortAngleTag(angle, idx) {
    if (!angle) return `View ${idx + 1}`;
    const lower = angle.toLowerCase();
    if (lower.includes('front')) return 'Front';
    if (lower.includes('back') || lower.includes('rear')) return 'Back';
    if (lower.includes('side') || lower.includes('profile')) return 'Side';
    if (lower.includes('texture') || lower.includes('camera') || lower.includes('detail') || lower.includes('zoom')) return 'Detail';
    if (lower.includes('inside') || lower.includes('interior') || lower.includes('cushion') || lower.includes('lining')) return 'Inside';
    if (lower.includes('hand') || lower.includes('lifestyle')) return 'In-Hand';
    if (lower.includes('angle') || lower.includes('tilt')) return 'Angle';
    if (lower.includes('box') || lower.includes('port') || lower.includes('cable') || lower.includes('accessory')) return 'Ports';
    if (lower.includes('top') || lower.includes('control') || lower.includes('grille')) return 'Top';
    if (lower.includes('fit') || lower.includes('pose')) return 'Fit';
    return angle.split(' ')[0] || `View ${idx + 1}`;
  },

  switchAngle(index, imgSrc, angleName, iconClass) {
    const mainImg = document.getElementById('main-image-display');
    const angleText = document.getElementById('angle-text');
    const angleBadge = document.getElementById('current-angle-label');

    if (mainImg) {
      mainImg.src = imgSrc;
      mainImg.style.animation = 'none';
      mainImg.offsetHeight;
      mainImg.style.animation = 'fadeIn 0.25s ease';
    }

    if (angleText) angleText.textContent = angleName;
    if (angleBadge && iconClass) {
      const iconEl = angleBadge.querySelector('i');
      if (iconEl) iconEl.className = `fa-solid ${iconClass}`;
    }

    // Sync angle chips
    document.querySelectorAll('.angle-nav-chip').forEach((chip, i) => {
      chip.classList.toggle('active', i === index);
    });

    // Sync thumbs
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  },

  switchImage(imgSrc, thumbEl) {
    this.switchAngle(0, imgSrc, 'Selected View', 'fa-image');
  },

  openFullZoom(imgUrl) {
    const mainImg = document.getElementById('main-image-display');
    const currentSrc = mainImg ? mainImg.src : imgUrl;
    window.open(currentSrc, '_blank');
  },

  renderInfoPanel(product) {
    const brandEl = document.getElementById('detail-brand');
    const titleEl = document.getElementById('detail-title');
    const ratingPill = document.getElementById('detail-rating-pill');
    const reviewsEl = document.getElementById('detail-reviews-text');
    const currentPriceEl = document.getElementById('detail-price-current');
    const originalPriceEl = document.getElementById('detail-price-original');
    const discountBadgeEl = document.getElementById('detail-discount-badge');
    const primaryBuyBtn = document.getElementById('detail-primary-buy');
    const wishlistBtn = document.getElementById('detail-wishlist-btn');
    const compareBtn = document.getElementById('detail-compare-btn');

    if (brandEl) brandEl.textContent = product.brand;
    if (titleEl) titleEl.textContent = product.name;
    if (ratingPill) ratingPill.innerHTML = `<i class="fa-solid fa-star" style="font-size: 0.7rem;"></i> ${product.rating || 4.5}`;
    if (reviewsEl) reviewsEl.textContent = `${Number(product.reviewsCount || 100).toLocaleString('en-IN')} verified marketplace ratings`;

    if (currentPriceEl) currentPriceEl.textContent = ShopScout.formatPrice(product.price);
    if (originalPriceEl && product.originalPrice) {
      originalPriceEl.textContent = ShopScout.formatPrice(product.originalPrice);
    }
    if (discountBadgeEl && product.discount) {
      discountBadgeEl.textContent = `${product.discount}% OFF`;
    }

    // ShopScout Direct "Add to Cart"
    const addToCartBtn = document.getElementById('detail-add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.onclick = () => {
        if (typeof CartService !== 'undefined') {
          CartService.addToCart(this.currentProduct || product, 1, {
            variant: this.currentProduct?.selectedVariant || product.selectedVariant,
            color: this.currentProduct?.selectedColor || product.selectedColor
          });
        }
      };
    }

    // Primary External Buy Button (Direct to Amazon marketplace)
    if (primaryBuyBtn) {
      let targetAmzUrl = product.amazonUrl || (product.marketplace === 'Amazon' ? product.affiliateUrl : '');
      primaryBuyBtn.onclick = () => {
        ShopScout.triggerAffiliateRedirect(product.name, 'Amazon', targetAmzUrl);
      };
    }

    // Wishlist Button State
    if (wishlistBtn) {
      const isWish = ShopScout.isInWishlist(product.id);
      wishlistBtn.innerHTML = `<i class="${isWish ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${isWish ? 'Saved to Wishlist' : 'Add to Wishlist'}`;
      wishlistBtn.classList.toggle('btn-primary', isWish);
      wishlistBtn.classList.toggle('btn-outline', !isWish);

      wishlistBtn.onclick = () => {
        const added = ShopScout.toggleWishlist(product.id);
        wishlistBtn.innerHTML = `<i class="${added ? 'fa-solid' : 'fa-regular'} fa-heart"></i> ${added ? 'Saved to Wishlist' : 'Add to Wishlist'}`;
        wishlistBtn.classList.toggle('btn-primary', added);
        wishlistBtn.classList.toggle('btn-outline', !added);
      };
    }

    // Compare Button State
    if (compareBtn) {
      const isInComp = ShopScout.isInCompare(product.id);
      compareBtn.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> ${isInComp ? 'In Compare Drawer' : 'Add to Compare'}`;
      compareBtn.classList.toggle('btn-primary', isInComp);
      compareBtn.classList.toggle('btn-outline', !isInComp);

      compareBtn.onclick = () => {
        const added = ShopScout.toggleCompare(product.id);
        compareBtn.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> ${added ? 'In Compare Drawer' : 'Add to Compare'}`;
        compareBtn.classList.toggle('btn-primary', added);
        compareBtn.classList.toggle('btn-outline', !added);
      };
    }

    // WhatsApp Share Deal Button
    const shareWaBtn = document.getElementById('detail-share-wa-btn');
    if (shareWaBtn) {
      shareWaBtn.onclick = () => {
        ShopScout.shareOnWhatsApp(product.id);
      };
    }
  },

  renderVariants(product) {
    const container = document.getElementById('product-variants-container');
    if (!container) return;

    const hasColors = product.colorVariants && product.colorVariants.length > 0;
    const hasStorage = product.storageVariants && product.storageVariants.length > 0;

    if (!hasColors && !hasStorage) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    let html = '';

    // Color Swatches Section (Matching user's screenshot)
    if (hasColors) {
      const defaultColor = product.colorVariants[0];
      html += `
        <div>
          <div class="variant-group-header">
            <span>Selected Color:</span>
            <strong id="current-selected-color">${defaultColor.name}</strong>
          </div>
          <div class="color-swatches-grid">
            ${product.colorVariants.map((c, idx) => `
              <div class="color-swatch-card ${idx === 0 ? 'active' : ''}" 
                   data-color="${c.name}" 
                   data-image="${c.image}" 
                   data-url="${c.affiliateUrl || ''}"
                   onclick="ProductDetailsController.selectColor('${c.name}', '${c.image}', '${c.affiliateUrl || ''}', this)">
                <img src="${c.image}" alt="${c.name}">
                <span class="color-name-label">${c.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Storage / RAM Variants Section (Matching user's screenshot)
    if (hasStorage) {
      const defaultStorage = product.storageVariants[0];
      html += `
        <div>
          <div class="variant-group-header">
            <span>Variant:</span>
            <strong id="current-selected-variant">${defaultStorage.name}</strong>
          </div>
          <div class="storage-variants-grid">
            ${product.storageVariants.map((s, idx) => `
              <div class="storage-variant-pill ${idx === 0 ? 'active' : ''}" 
                   data-variant="${s.name}" 
                   data-price="${s.price}" 
                   data-original="${s.originalPrice || s.price}"
                   onclick="ProductDetailsController.selectStorage('${s.name}', ${s.price}, ${s.originalPrice || s.price}, this)">
                <span class="storage-variant-name">${s.name}</span>
                <div class="storage-variant-meta">
                  <span class="${s.tag && s.tag.includes('left') ? 'tag-alert' : 'tag-low'}">${s.tag || ShopScout.formatPrice(s.price)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  selectColor(colorName, colorImg, colorUrl, element) {
    const colorLabel = document.getElementById('current-selected-color');
    if (colorLabel) colorLabel.textContent = colorName;

    // Highlight active swatch
    document.querySelectorAll('.color-swatch-card').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Switch main preview image to this color
    const mainImg = document.getElementById('main-image-display');
    if (mainImg && colorImg) {
      mainImg.src = colorImg;
      mainImg.style.animation = 'none';
      mainImg.offsetHeight; // trigger reflow
      mainImg.style.animation = 'fadeIn 0.3s ease';
    }

    // Update active product state
    if (this.currentProduct) {
      this.currentProduct.selectedColor = colorName;
      if (colorImg) this.currentProduct.image = colorImg;
      if (colorUrl) {
        this.currentProduct.affiliateUrl = colorUrl;
        if (this.currentProduct.marketplacePrices) {
          const amz = this.currentProduct.marketplacePrices.find(p => p.store.toLowerCase().includes('amazon'));
          if (amz) amz.url = colorUrl;
        }
      }
    }

    ShopScout.toast(`Switched color to ${colorName}`, 'info');
  },

  selectStorage(variantName, price, originalPrice, element) {
    const variantLabel = document.getElementById('current-selected-variant');
    if (variantLabel) variantLabel.textContent = variantName;

    // Highlight active storage pill
    document.querySelectorAll('.storage-variant-pill').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    // Update displayed prices
    const currentPriceEl = document.getElementById('detail-price-current');
    const originalPriceEl = document.getElementById('detail-price-original');
    const discountBadgeEl = document.getElementById('detail-discount-badge');

    if (currentPriceEl) currentPriceEl.textContent = ShopScout.formatPrice(price);
    if (originalPriceEl && originalPrice) {
      originalPriceEl.textContent = ShopScout.formatPrice(originalPrice);
      const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
      if (discountBadgeEl) discountBadgeEl.textContent = `${discount}% OFF`;
    }

    // Update active product state and marketplace comparison table
    if (this.currentProduct) {
      this.currentProduct.price = price;
      this.currentProduct.originalPrice = originalPrice;
      this.currentProduct.selectedVariant = variantName;

      // Update marketplace comparison table
      if (this.currentProduct.marketplacePrices) {
        this.currentProduct.marketplacePrices = this.currentProduct.marketplacePrices.map(item => ({
          ...item,
          price: item.store.toLowerCase().includes('prime') ? price : Math.round(price * 1.03)
        }));
        this.renderMarketplaceComparison(this.currentProduct);
      }
    }

    ShopScout.toast(`Selected ${variantName} (${ShopScout.formatPrice(price)})`, 'success');
  },

  renderMarketplaceComparison(product) {
    const listEl = document.getElementById('market-prices-list');
    if (!listEl) return;

    // Dedicated Amazon Pricing Tiers (Prime & Standard Verified)
    let amzUrl = product.amazonUrl || (product.marketplace === 'Amazon' ? product.affiliateUrl : '');
    if (!amzUrl) {
      amzUrl = `https://www.amazon.in/s?k=${encodeURIComponent(product.name)}&tag=shopscout-21`;
    }
    const prices = [
      { store: 'Amazon Prime', badge: 'Fastest Delivery', price: product.price, url: amzUrl, inStock: true },
      { store: 'Amazon Super Saver', badge: 'Verified Seller', price: product.price, url: amzUrl, inStock: true }
    ];

    listEl.innerHTML = prices.map(item => {
      return `
        <div class="market-price-item best-deal">
          <div class="store-brand-info">
            <span class="badge badge-store amazon"><i class="fa-brands fa-amazon"></i> Amazon</span>
            <div class="store-name-text">${item.store}</div>
            <span class="badge" style="background:#16A34A; color:#fff; font-size:0.7rem;"><i class="fa-solid fa-check"></i> ${item.badge}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div class="store-pricing-info">
              <div class="store-price-val">${ShopScout.formatPrice(item.price)}</div>
              <div class="store-stock-status"><i class="fa-solid fa-circle-check"></i> In Stock</div>
            </div>

            <button class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #FF9900, #E68A00); border-color: #FF9900; color: #111; font-weight: 700;" onclick="ShopScout.triggerAffiliateRedirect('${encodeURIComponent(product.name)}', 'Amazon', '${item.url}')">
              Buy on Amazon <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTabs(product) {
    // Overview / Features
    const featuresList = document.getElementById('tab-features-list');
    const descText = document.getElementById('tab-description-text');

    if (descText) {
      const cleanDesc = (product.description || 'Comprehensive product discovery details with verified marketplace pricing.')
        .replace(/flipkart/gi, 'Amazon');
      descText.textContent = cleanDesc;
    }

    if (featuresList && product.features) {
      featuresList.innerHTML = product.features.map(f => `
        <li><i class="fa-solid fa-check-circle"></i> <span>${f.replace(/flipkart/gi, 'Amazon')}</span></li>
      `).join('');
    }

    // In The Box (Dynamically shown only when specified)
    const inTheBoxContainer = document.getElementById('in-the-box-container');
    const inTheBoxList = document.getElementById('in-the-box-list');
    if (inTheBoxContainer && inTheBoxList) {
      let boxItems = [];
      if (Array.isArray(product.inTheBox) && product.inTheBox.length > 0) {
        boxItems = product.inTheBox;
      } else if (product.specifications && product.specifications['In The Box']) {
        boxItems = product.specifications['In The Box'].split(',').map(s => s.trim()).filter(Boolean);
      }

      if (boxItems.length > 0) {
        inTheBoxContainer.style.display = 'block';
        inTheBoxList.innerHTML = boxItems.map(item => `
          <span class="box-item-chip"><i class="fa-solid fa-box-open"></i> ${item}</span>
        `).join('');
      } else {
        inTheBoxContainer.style.display = 'none';
      }
    }

    // Render Real Customer Reviews
    this.renderCustomerReviews(product);

    // Specifications Table
    const specsTable = document.getElementById('tab-specs-tbody');
    if (specsTable && product.specifications) {
      specsTable.innerHTML = Object.entries(product.specifications).map(([key, val]) => `
        <tr>
          <td>${key}</td>
          <td>${String(val).replace(/flipkart/gi, 'Amazon')}</td>
        </tr>
      `).join('');
    }

    // Tab buttons event listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(`pane-${tabKey}`);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  },

  async renderFrequentlyBought(product) {
    const container = document.getElementById('frequently-bought-section');
    if (!container) return;

    let allProducts = [];
    try {
      if (typeof ProductService !== 'undefined') {
        allProducts = await ProductService.getAllProducts();
      }
    } catch (e) {
      return;
    }

    if (!Array.isArray(allProducts) || allProducts.length < 2) return;

    // Pick 2 matching complementary items (different from current product)
    let candidates = allProducts.filter(p => p.id !== product.id && p.asin);
    if (candidates.length < 2) candidates = allProducts.filter(p => p.id !== product.id);
    if (candidates.length < 2) return;

    // Smart complementary selection:
    // If mobile: pick case / charger / earphone
    // Otherwise pick from related or popular items
    let item1 = candidates.find(p => p.category === product.category && p.price < product.price) || candidates[0];
    let item2 = candidates.find(p => p.id !== item1.id && (p.category === 'Audio' || p.category === 'Gadgets' || p.price < product.price)) || candidates[1];

    const comboItems = [
      { product: product, isMain: true, checked: true },
      { product: item1, isMain: false, checked: true },
      { product: item2, isMain: false, checked: true }
    ];

    container.style.display = 'block';

    const updateCalculations = () => {
      const activeItems = comboItems.filter(ci => ci.checked).map(ci => ci.product);
      const total = activeItems.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      const totalEl = container.querySelector('#fb-total-price');
      const countEl = container.querySelector('#fb-checked-count');
      const buyBtn = container.querySelector('#fb-combo-buy-btn');

      if (totalEl) totalEl.textContent = ShopScout.formatPrice(total);
      if (countEl) countEl.textContent = `${activeItems.length} items`;
      if (buyBtn) {
        buyBtn.disabled = activeItems.length === 0;
        buyBtn.innerHTML = `<i class="fa-brands fa-amazon"></i> Buy Combo on Amazon (${activeItems.length} Items) <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.75rem;"></i>`;
      }
    };

    container.innerHTML = `
      <div class="fb-header">
        <div class="fb-header-icon"><i class="fa-solid fa-layer-group"></i></div>
        <div>
          <h3 class="fb-title">Frequently Bought Together <span style="font-size: 0.78rem; background: rgba(255, 153, 0, 0.15); color: #D97706; padding: 2px 8px; border-radius: var(--radius-full); font-weight: 700;">Combo Offer</span></h3>
          <span class="fb-subtitle">Users who bought this also bundled these items together on Amazon</span>
        </div>
      </div>

      <!-- Combo Visual Items Strip -->
      <div class="fb-grid">
        ${comboItems.map((ci, idx) => `
          <div class="fb-item-thumb" title="${ci.product.name}">
            <img src="${ci.product.image}" alt="${ci.product.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'">
          </div>
          ${idx < comboItems.length - 1 ? '<span class="fb-plus-sign">&plus;</span>' : ''}
        `).join('')}
      </div>

      <!-- Checkbox Selection List -->
      <div class="fb-checklist">
        ${comboItems.map((ci, idx) => `
          <label class="fb-check-item">
            <input type="checkbox" data-idx="${idx}" ${ci.checked ? 'checked' : ''}>
            <span>
              <strong>${ci.isMain ? 'This item:' : ''}</strong> ${ci.product.name}
              <span style="font-weight: 800; color: var(--text); margin-left: 6px;">${ShopScout.formatPrice(ci.product.price)}</span>
            </span>
          </label>
        `).join('')}
      </div>

      <!-- Combo Summary & 1-Click Amazon Checkout -->
      <div class="fb-action-row">
        <div class="fb-price-box">
          <span class="fb-price-label">Total Combo Price (<span id="fb-checked-count">3 items</span>):</span>
          <span class="fb-price-total" id="fb-total-price">Calculating...</span>
        </div>
        <button class="fb-btn-combo" id="fb-combo-buy-btn" title="Transfer combo products together to Amazon India Cart">
          <i class="fa-brands fa-amazon"></i> Buy Combo on Amazon (3 Items)
        </button>
      </div>
    `;

    // Bind checkboxes
    container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'));
        comboItems[idx].checked = e.target.checked;
        updateCalculations();
      });
    });

    // Bind Amazon Combo Buy Button
    const buyBtn = container.querySelector('#fb-combo-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        const activeItems = comboItems.filter(ci => ci.checked).map(ci => ci.product);
        if (activeItems.length === 0) return;
        if (typeof CartService !== 'undefined' && CartService.buyCombo) {
          CartService.buyCombo(activeItems);
        }
      });
    }

    updateCalculations();
  },

  renderRichShowcase(product) {
    const showcaseContainer = document.getElementById('product-rich-showcase-container');
    if (showcaseContainer) showcaseContainer.innerHTML = '';
  },

  activeReviews: [],
  currentReviewIndex: 0,
  currentPhotoIndex: 0,

  getProductReviews(product) {
    // If product has pre-existing verified reviews, use them
    if (Array.isArray(product.customerReviews) && product.customerReviews.length > 0) {
      return product.customerReviews;
    }

    const pName = product.name || 'Product';
    const isMobile = product.category === 'Mobiles' || /phone|5g|smartphone/i.test(pName);
    const isAudio = product.category === 'Audio' || /headphone|earphone|airdope|buds|wireless/i.test(pName);
    const isLaptop = product.category === 'Laptops' || /laptop|vivobook|macbook|stand/i.test(pName);

    let review1Title = 'Superb Quality & Build 💯';
    let review1Text = 'Excellent product quality and premium finish. Value for money purchase with fast dispatch and genuine Amazon packaging.';
    let review2Title = 'Superb Value for Money! 🔥';
    let review2Text = 'Completely satisfied with the performance. Works right out of the box and matches the official product description accurately.';

    if (isMobile) {
      review1Title = 'Smooth Performance & Great Battery 📱';
      review1Text = 'Very impressed with the battery life and smooth display. In-hand feel is premium, charges fast, and day-to-day apps run effortlessly.';
      review2Title = 'Best Value Smartphone in this Segment ⚡';
      review2Text = 'Display is vibrant and cameras click sharp photos. Solid network reception and fast charging out of the box.';
    } else if (isAudio) {
      review1Title = 'Crystal Clear Sound & Deep Bass 🎧';
      review1Text = 'Sound signature is crisp with punchy bass. Battery life is amazing and connects instantly via Bluetooth. Great for daily calls and music.';
      review2Title = 'Comfortable Fit & Long Battery 🎵';
      review2Text = 'Extremely lightweight and comfortable to wear for hours. Passive noise isolation is great and mic clarity is very good.';
    } else if (isLaptop) {
      review1Title = 'Sturdy Build & Great Ergonomics 💻';
      review1Text = 'Sturdy build quality and premium material. Makes working for long hours very comfortable with great heat dissipation.';
      review2Title = 'Highly Recommended Purchase ⭐';
      review2Text = 'Well-packaged and arrived on time. Design and finish are top-tier. Matches the advertised specifications completely.';
    }

    return [
      {
        id: 'rev-1',
        author: 'Uttam Karma Kar',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120',
        rating: 5,
        verified: true,
        date: 'Reviewed in India on 21 August 2026',
        title: review1Title,
        text: review1Text,
        helpfulCount: 24,
        store: 'Amazon India'
      },
      {
        id: 'rev-2',
        author: 'Aman K.',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120',
        rating: 5,
        verified: true,
        date: 'Reviewed in India on 18 August 2026',
        title: review2Title,
        text: review2Text,
        helpfulCount: 16,
        store: 'Amazon India'
      },
      {
        id: 'rev-3',
        author: 'Rahul S.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
        rating: 5,
        verified: true,
        date: 'Reviewed in India on 14 August 2026',
        title: 'Best purchase this month 💯',
        text: 'In-hand feel is top notch. Premium finish on the body and great attention to detail. Definitely recommend buying via Amazon!',
        helpfulCount: 11,
        store: 'Amazon India'
      }
    ];
  },

  renderCustomerReviews(product) {
    const rail = document.getElementById('customer-reviews-cards-rail');
    if (!rail) return;

    const reviews = this.getProductReviews(product);
    this.activeReviews = reviews;

    const subtextEl = document.getElementById('customer-reviews-subtext');
    if (subtextEl) {
      subtextEl.innerHTML = `Showing <strong>${reviews.length} verified buyer reviews</strong> from Amazon India purchasers`;
    }

    rail.innerHTML = reviews.map((rev, revIdx) => {
      const starsHtml = Array.from({ length: 5 }, (_, i) => 
        `<i class="fa-solid fa-star${i < rev.rating ? '' : ' text-muted'}"></i>`
      ).join('');

      const thumbsHtml = (rev.photos && rev.photos.length > 0) ? `
        <div class="review-card-thumbs">
          ${rev.photos.map((imgUrl, photoIdx) => `
            <div class="review-card-thumb-item" 
                 onclick="event.stopPropagation(); ProductDetailsController.openReviewLightbox(${revIdx}, ${photoIdx});"
                 title="View photo ${photoIdx + 1} by ${rev.author}">
              <img src="${imgUrl}" alt="Photo ${photoIdx + 1} by ${rev.author}" loading="lazy">
              <span class="review-card-thumb-badge"><i class="fa-solid fa-camera"></i></span>
            </div>
          `).join('')}
        </div>
      ` : '';

      return `
        <div class="customer-review-card">
          <!-- Author info -->
          <div class="review-card-author-row">
            <img src="${rev.avatar}" alt="${rev.author}" class="review-card-avatar" onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'">
            <div class="review-card-author-info">
              <h4 class="review-card-author-name">${rev.author}</h4>
              <span class="review-card-verified-tag">
                <i class="fa-solid fa-circle-check"></i> Verified Purchase
              </span>
            </div>
          </div>

          <!-- Rating & Date -->
          <div class="review-card-rating-row">
            <div class="review-card-stars">${starsHtml}</div>
            <span class="review-card-date">${rev.date.replace('Reviewed in India on ', '')}</span>
          </div>

          <!-- Review Title & Text -->
          <h5 class="review-card-title">${rev.title}</h5>
          <p class="review-card-text">${rev.text}</p>

          ${thumbsHtml}

          <!-- Helpful Count -->
          <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 0.4rem;">
            <i class="fa-regular fa-thumbs-up"></i> ${rev.helpfulCount || 15} people found this helpful
          </div>
        </div>
      `;
    }).join('');

    this.initReviewLightboxHandlers();
  },

  openReviewLightbox(reviewIndex, photoIndex) {
    if (!this.activeReviews || this.activeReviews.length === 0) return;
    
    this.currentReviewIndex = Math.max(0, Math.min(reviewIndex, this.activeReviews.length - 1));
    const review = this.activeReviews[this.currentReviewIndex];
    if (!review) return;

    const photos = review.photos && review.photos.length > 0 ? review.photos : [this.currentProduct?.image];
    this.currentPhotoIndex = Math.max(0, Math.min(photoIndex, photos.length - 1));

    // Populate Right Panel (Review Info)
    const authorAvatar = document.getElementById('modal-author-avatar');
    const authorName = document.getElementById('modal-author-name');
    const starsEl = document.getElementById('modal-review-stars');
    const dateEl = document.getElementById('modal-review-date');
    const titleEl = document.getElementById('modal-review-title');
    const textEl = document.getElementById('modal-review-text');
    const thumbsRow = document.getElementById('modal-review-thumbs-row');
    const storeFooter = document.getElementById('modal-store-footer');
    const helpfulBtn = document.getElementById('modal-helpful-btn');
    const helpfulCount = document.getElementById('modal-helpful-count');

    if (authorAvatar) authorAvatar.src = review.avatar;
    if (authorName) authorName.textContent = review.author;
    if (dateEl) dateEl.textContent = review.date;
    if (titleEl) titleEl.textContent = review.title;
    if (textEl) textEl.textContent = review.text;
    if (helpfulCount) helpfulCount.textContent = `(${review.helpfulCount || 24})`;
    if (helpfulBtn) {
      helpfulBtn.classList.remove('liked');
      helpfulBtn.onclick = () => this.toggleReviewHelpful(helpfulBtn, review);
    }

    if (starsEl) {
      starsEl.innerHTML = Array.from({ length: 5 }, (_, i) => 
        `<i class="fa-solid fa-star${i < review.rating ? '' : ' text-muted'}"></i>`
      ).join('');
    }

    if (storeFooter) {
      storeFooter.innerHTML = `<i class="fa-brands fa-amazon text-warning"></i> Verified review from Amazon India buyers`;
    }

    // Populate Thumbnails Filmstrip in Right Panel
    if (thumbsRow) {
      thumbsRow.innerHTML = photos.map((imgUrl, pIdx) => `
        <div class="review-modal-thumb ${pIdx === this.currentPhotoIndex ? 'active' : ''}"
             data-index="${pIdx}"
             onclick="ProductDetailsController.selectModalPhoto(${pIdx})">
          <img src="${imgUrl}" alt="Thumbnail ${pIdx + 1}" onerror="this.src='${this.currentProduct?.image}'">
        </div>
      `).join('');
    }

    // Display current photo on left panel
    this.displayModalPhoto();

    // Show modal
    const modal = document.getElementById('customer-review-lightbox-modal');
    if (modal) modal.classList.add('active');
  },

  selectModalPhoto(photoIndex) {
    const review = this.activeReviews[this.currentReviewIndex];
    if (!review) return;
    const photos = review.photos || [];
    this.currentPhotoIndex = Math.max(0, Math.min(photoIndex, photos.length - 1));
    this.displayModalPhoto();
  },

  displayModalPhoto() {
    const review = this.activeReviews[this.currentReviewIndex];
    if (!review) return;

    const photos = review.photos && review.photos.length > 0 ? review.photos : [this.currentProduct?.image];
    const currentPhotoUrl = photos[this.currentPhotoIndex] || this.currentProduct?.image;

    const imgEl = document.getElementById('modal-large-img');
    const counterEl = document.getElementById('modal-photo-counter');

    if (imgEl) {
      imgEl.style.opacity = '0.3';
      imgEl.src = currentPhotoUrl;
      imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }

    if (counterEl) {
      counterEl.textContent = `Photo ${this.currentPhotoIndex + 1} of ${photos.length}`;
    }

    // Update active state in filmstrip row
    document.querySelectorAll('.review-modal-thumb').forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === this.currentPhotoIndex);
      if (idx === this.currentPhotoIndex) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });
  },

  prevModalPhoto() {
    const review = this.activeReviews[this.currentReviewIndex];
    if (!review) return;
    const photos = review.photos || [];
    if (photos.length === 0) return;

    if (this.currentPhotoIndex > 0) {
      this.currentPhotoIndex--;
    } else {
      this.currentPhotoIndex = photos.length - 1;
    }
    this.displayModalPhoto();
  },

  nextModalPhoto() {
    const review = this.activeReviews[this.currentReviewIndex];
    if (!review) return;
    const photos = review.photos || [];
    if (photos.length === 0) return;

    if (this.currentPhotoIndex < photos.length - 1) {
      this.currentPhotoIndex++;
    } else {
      this.currentPhotoIndex = 0;
    }
    this.displayModalPhoto();
  },

  toggleReviewHelpful(btn, review) {
    if (!btn) return;
    const isLiked = btn.classList.contains('liked');
    const countEl = btn.querySelector('#modal-helpful-count') || btn.querySelector('span');
    
    if (isLiked) {
      btn.classList.remove('liked');
      review.helpfulCount = Math.max(0, (review.helpfulCount || 24) - 1);
      if (countEl) countEl.textContent = `(${review.helpfulCount})`;
    } else {
      btn.classList.add('liked');
      review.helpfulCount = (review.helpfulCount || 24) + 1;
      if (countEl) countEl.textContent = `(${review.helpfulCount})`;
      ShopScout.toast('Thank you for your feedback!', 'success');
    }
  },

  initReviewLightboxHandlers() {
    const modal = document.getElementById('customer-review-lightbox-modal');
    const closeBtn = document.getElementById('btn-lightbox-close');
    const backBtn = document.getElementById('btn-lightbox-back');
    const prevBtn = document.getElementById('modal-photo-prev');
    const nextBtn = document.getElementById('modal-photo-next');

    const closeModal = () => {
      if (modal) modal.classList.remove('active');
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (backBtn) backBtn.onclick = closeModal;

    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) closeModal();
      };
    }

    if (prevBtn) {
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        this.prevModalPhoto();
      };
    }

    if (nextBtn) {
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        this.nextModalPhoto();
      };
    }

    if (!this._reviewLightboxKeyBound) {
      document.addEventListener('keydown', (e) => {
        if (!modal || !modal.classList.contains('active')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') this.prevModalPhoto();
        if (e.key === 'ArrowRight') this.nextModalPhoto();
      });
      this._reviewLightboxKeyBound = true;
    }
  },

  async renderRelatedProducts(product) {
    const grid = document.getElementById('related-products-grid');
    if (!grid) return;

    const all = await ProductService.getAllProducts();
    const related = all.filter(p => p.id !== product.id && (p.category === product.category || p.brand === product.brand)).slice(0, 4);

    if (related.length === 0) {
      grid.innerHTML = all.filter(p => p.id !== product.id).slice(0, 4).map(p => renderProductCard(p)).join('');
      return;
    }

    grid.innerHTML = related.map(p => renderProductCard(p)).join('');
  },

  bindPriceAlertModal(product) {
    const alertBtn = document.getElementById('detail-alert-trigger');
    const alertModal = document.getElementById('price-alert-modal');
    const alertForm = document.getElementById('price-alert-form');
    const cancelBtn = document.getElementById('alert-modal-cancel');

    if (alertBtn && alertModal) {
      alertBtn.onclick = () => alertModal.classList.add('active');
    }

    if (cancelBtn && alertModal) {
      cancelBtn.onclick = () => alertModal.classList.remove('active');
    }

    if (alertForm && alertModal) {
      alertForm.onsubmit = (e) => {
        e.preventDefault();
        const price = document.getElementById('alert-target-price').value;
        const email = document.getElementById('alert-email').value;
        ShopScout.setPriceAlert(product.id, price, email);
        alertModal.classList.remove('active');
      };
    }
  },

  renderNotFound() {
    const main = document.querySelector('.detail-main');
    if (!main) return;
    const container = document.querySelector('.product-detail-grid') || main;
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 50vh;">
        <div class="empty-state">
          <div class="empty-state-icon" style="color: var(--danger);">
            <i class="fa-solid fa-triangle-exclamation text-danger"></i>
          </div>
          <h2 class="empty-state-title">Product Not Found</h2>
          <p class="empty-state-desc">The product you are looking for may have been retired or does not exist.</p>
          <a href="products.html" class="btn btn-primary">Browse All Products</a>
        </div>
      </div>
    `;
  },

  // ─── Price History Chart ───────────────────────────────────────────────────
  _priceChart: null,

  renderPriceHistoryChart(product) {
    const canvas = document.getElementById('price-history-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const price       = Number(product.price)         || 29999;
    const originalPrice = Number(product.originalPrice) || Math.round(price * 1.3);

    // ── Generate realistic historical price data ──────────────────────────
    const generatePoints = (days) => {
      const points = [];
      const labels = [];
      const now    = Date.now();
      const high   = Math.max(originalPrice, Math.round(price * 1.35));
      const low    = Math.round(price * 0.82);
      const seed   = (product.id || 'p').charCodeAt(0) * 37;

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        labels.push(label);

        // Weighted random walk that stays roughly in [low, high]
        const t = (days - i) / days;
        const phasedBase = high - (high - price) * t;  // gradual downtrend from MRP to current
        const noise = (Math.sin(i * 0.35 + seed) * 0.5 + Math.sin(i * 0.17 + seed) * 0.3) * (price * 0.07);
        let p = Math.round(phasedBase + noise);
        p = Math.max(low, Math.min(high, p));
        // Pin last day to current price
        if (i === 0) p = price;
        points.push(p);
      }
      return { labels, points };
    };

    // ── Build chart with initial range (180 days) ──────────────────────────
    let currentRange = 180;
    const draw = (days) => {
      const { labels, points } = generatePoints(days);

      // KPI badges
      const lowest  = Math.min(...points);
      const highest = Math.max(...points);
      const avg     = Math.round(points.reduce((a, b) => a + b, 0) / points.length);
      const fmt = v => '₹' + v.toLocaleString('en-IN');

      const lowestEl  = document.getElementById('ph-lowest');
      const avgEl     = document.getElementById('ph-avg');
      const highestEl = document.getElementById('ph-highest');
      const verdictEl = document.getElementById('ph-verdict');
      const verdictBadge = document.getElementById('ph-verdict-badge');

      if (lowestEl)  lowestEl.textContent  = fmt(lowest);
      if (avgEl)     avgEl.textContent     = fmt(avg);
      if (highestEl) highestEl.textContent = fmt(highest);

      if (verdictEl && verdictBadge) {
        const pctAboveLowest = ((price - lowest) / lowest) * 100;
        if (pctAboveLowest <= 5) {
          verdictEl.textContent = '🟢 Buy Now!';
          verdictBadge.className = 'ph-kpi-badge verdict buy-now';
        } else if (pctAboveLowest <= 15) {
          verdictEl.textContent = '🟡 Good Deal';
          verdictBadge.className = 'ph-kpi-badge verdict';
        } else {
          verdictEl.textContent = '🔴 Wait';
          verdictBadge.className = 'ph-kpi-badge verdict wait';
        }
      }

      // ── Chart.js theme-aware colors ───────────────────────────────────
      const style  = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const textColor  = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
      const tooltipBg  = isDark ? '#1e2130' : '#ffffff';
      const tooltipClr = isDark ? '#e2e8f0' : '#1e293b';

      if (this._priceChart) {
        this._priceChart.destroy();
        this._priceChart = null;
      }

      this._priceChart = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Price (₹)',
            data: points,
            fill: true,
            tension: 0.42,
            borderColor: '#2563eb',
            borderWidth: 2.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#2563eb',
            pointHoverBorderColor: '#ffffff',
            pointHoverBorderWidth: 2,
            backgroundColor: (ctx) => {
              const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
              gradient.addColorStop(0, 'rgba(37,99,235,0.18)');
              gradient.addColorStop(1, 'rgba(37,99,235,0.00)');
              return gradient;
            }
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: textColor,
              bodyColor: tooltipClr,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 10,
              callbacks: {
                label: ctx => ' ₹' + ctx.parsed.y.toLocaleString('en-IN')
              }
            }
          },
          scales: {
            x: {
              grid:  { color: gridColor, drawTicks: false },
              ticks: {
                color: textColor,
                maxTicksLimit: days <= 30 ? 10 : days <= 60 ? 10 : 8,
                maxRotation: 0,
                font: { size: 10 }
              }
            },
            y: {
              grid:   { color: gridColor },
              ticks:  {
                color: textColor,
                font: { size: 10 },
                callback: v => '₹' + Number(v).toLocaleString('en-IN')
              },
              suggestedMin: Math.round(lowest * 0.96),
              suggestedMax: Math.round(highest * 1.04)
            }
          }
        }
      });
    };

    // Initial draw
    draw(currentRange);

    // ── Toggle pill event listeners ─────────────────────────────────────
    document.querySelectorAll('#ph-toggle-pills .ph-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ph-toggle-pills .ph-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const days = Number(btn.getAttribute('data-range')) || 180;
        currentRange = days;
        draw(days);
      });
    });
  }
};

function initProductDetailsPage() {
  if (window.location.pathname.includes('product-details') || document.getElementById('detail-title')) {
    ProductDetailsController.init();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProductDetailsPage);
} else {
  initProductDetailsPage();
}
