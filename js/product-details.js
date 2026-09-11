/**
 * SHOPSCOUT — PRODUCT DETAILS CONTROLLER
 */

const ProductDetailsController = {
  currentProduct: null,

  async init() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || 'prod-1';

    const product = await ProductService.getProductById(productId);
    if (!product) {
      this.renderNotFound();
      return;
    }

    this.currentProduct = product;
    document.title = `${product.name} — ShopScout Price Comparison`;

    this.renderBreadcrumbs(product);
    this.renderGallery(product);
    this.renderInfoPanel(product);
    this.renderVariants(product);
    this.renderMarketplaceComparison(product);
    this.renderTabs(product);
    this.renderRelatedProducts(product);
    this.bindPriceAlertModal(product);
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

    const images = rawImages.map((img, idx) => {
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
    });

    const activeItem = images[0];

    mainViewport.innerHTML = `
      <div class="gallery-angle-badge" id="current-angle-label">
        <i class="fa-solid ${activeItem.icon}"></i> <span id="angle-text">${activeItem.angle}</span>
      </div>
      <div class="gallery-zoom-trigger" onclick="ProductDetailsController.openFullZoom('${activeItem.url}')" title="Zoom image in full screen">
        <i class="fa-solid fa-magnifying-glass-plus"></i> Zoom
      </div>
      <img id="main-image-display" src="${activeItem.url}" alt="${product.name} - ${activeItem.angle}">
    `;

    if (angleChipsContainer) {
      if (images.length > 1) {
        angleChipsContainer.style.display = 'flex';
        angleChipsContainer.innerHTML = images.map((item, idx) => `
          <button type="button" class="angle-nav-chip ${idx === 0 ? 'active' : ''}" 
                  data-index="${idx}"
                  onclick="ProductDetailsController.switchAngle(${idx}, '${item.url}', '${item.angle}', '${item.icon}')">
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
           onclick="ProductDetailsController.switchAngle(${idx}, '${item.url}', '${item.angle}', '${item.icon}')">
        <img src="${item.url}" alt="${item.angle}">
        <span class="thumb-angle-tag">${item.angle.split(' ')[0]}</span>
      </div>
    `).join('');
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

    // Primary External Buy Button
    if (primaryBuyBtn) {
      primaryBuyBtn.innerHTML = `Buy Now <i class="fa-solid fa-arrow-up-right-from-square"></i>`;
      primaryBuyBtn.onclick = () => {
        ShopScout.openBuyModal(product);
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
          const flp = this.currentProduct.marketplacePrices.find(p => p.store.toLowerCase().includes('flipkart'));
          if (flp) flp.url = colorUrl;
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
          price: item.store.toLowerCase().includes('flipkart') ? price : Math.round(price * 1.03)
        }));
        this.renderMarketplaceComparison(this.currentProduct);
      }
    }

    ShopScout.toast(`Selected ${variantName} (${ShopScout.formatPrice(price)})`, 'success');
  },

  renderMarketplaceComparison(product) {
    const listEl = document.getElementById('market-prices-list');
    if (!listEl) return;

    // Strictly 2 marketplaces: Amazon and Flipkart (Third option eliminated)
    let prices = (product.marketplacePrices && product.marketplacePrices.length > 0 
      ? product.marketplacePrices 
      : [
          { store: 'Amazon', price: product.price, url: product.affiliateUrl, inStock: true, badge: 'Best Price' },
          { store: 'Flipkart', price: Math.round(product.price * 1.02), url: `https://www.flipkart.com/search?q=${encodeURIComponent(product.name)}&affid=shopscout`, inStock: true }
        ]
    ).filter(item => ['amazon', 'flipkart'].includes(item.store.toLowerCase()));

    // Find lowest price
    const minPrice = Math.min(...prices.map(p => p.price));

    listEl.innerHTML = prices.map(item => {
      const isLowest = item.price === minPrice;
      const storeClass = item.store.toLowerCase().replace(/\s+/g, '-');

      return `
        <div class="market-price-item ${isLowest ? 'best-deal' : ''}">
          <div class="store-brand-info">
            <span class="badge badge-store ${storeClass}">${item.store}</span>
            <div class="store-name-text">${item.store}</div>
            ${isLowest ? '<span class="badge" style="background:#16A34A; color:#fff; font-size:0.7rem;"><i class="fa-solid fa-check"></i> Best Price</span>' : ''}
          </div>

          <div style="display: flex; align-items: center;">
            <div class="store-pricing-info">
              <div class="store-price-val">${ShopScout.formatPrice(item.price)}</div>
              <div class="store-stock-status">${item.inStock ? '<i class="fa-solid fa-circle-check"></i> In Stock' : '<span style="color:var(--danger)"><i class="fa-solid fa-circle-xmark"></i> Out of Stock</span>'}</div>
            </div>

            <button class="btn btn-outline btn-sm" onclick="ShopScout.triggerAffiliateRedirect('${encodeURIComponent(product.name)}', '${item.store}', '${item.url}')">
              Visit Store <i class="fa-solid fa-arrow-up-right-from-square"></i>
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

    if (descText) descText.textContent = product.description || 'Comprehensive product discovery details with verified marketplace pricing.';

    if (featuresList && product.features) {
      featuresList.innerHTML = product.features.map(f => `
        <li><i class="fa-solid fa-check-circle"></i> <span>${f}</span></li>
      `).join('');
    }

    // Render A+ Visual Showcase & Bento Grid
    this.renderRichShowcase(product);

    // Render Real Customer Photos & Unboxing Rail
    this.renderCustomerPhotos(product);

    // Specifications Table
    const specsTable = document.getElementById('tab-specs-tbody');
    if (specsTable && product.specifications) {
      specsTable.innerHTML = Object.entries(product.specifications).map(([key, val]) => `
        <tr>
          <td>${key}</td>
          <td>${val}</td>
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

  renderRichShowcase(product) {
    const showcaseContainer = document.getElementById('product-rich-showcase-container');
    if (!showcaseContainer) return;

    const isPhone = (product.category === 'Mobiles' || (product.name && (product.name.includes('vivo') || product.name.includes('iPhone') || product.name.includes('Galaxy'))));

    const color1 = product.colorVariants && product.colorVariants[0] ? product.colorVariants[0] : { name: 'Cyber Green', image: product.image };
    const color2 = product.colorVariants && product.colorVariants[2] ? product.colorVariants[2] : (product.colorVariants && product.colorVariants[1] ? product.colorVariants[1] : { name: 'Star Silver', image: product.image });

    let html = `
      <div class="product-showcase-section">
        <!-- Hero Visual Showcase Banner (Matching user screenshot) -->
        <div class="showcase-hero-banner">
          <div class="showcase-hero-content">
            <span class="showcase-tag"><i class="fa-solid fa-gem"></i> Premium Craftsmanship</span>
            <h2 class="showcase-hero-title">
              Built to Shine, in <span class="gradient-text">EVERY COLOR</span>
            </h2>
            <p class="showcase-hero-desc">
              Precision-milled aerospace frame paired with anti-glare crystal glass. Ergonomically balanced at under 199g for maximum hand comfort and vibrant multi-angle reflections.
            </p>
          </div>

          <div class="showcase-hero-visual">
            <div class="showcase-phone-pair">
              <div class="showcase-phone-card">
                <img src="${color1.image}" alt="${color1.name}" class="showcase-phone-img">
                <span class="showcase-phone-label">${color1.name}</span>
              </div>
              <div class="showcase-phone-card" style="margin-bottom: -15px;">
                <img src="${color2.image}" alt="${color2.name}" class="showcase-phone-img">
                <span class="showcase-phone-label">${color2.name}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bento Highlights Grid (Matching user's left-hand screenshot) -->
        <div class="bento-highlights-grid">
          <!-- Card 1: Performance (Span 2) -->
          <div class="bento-card span-2" style="background: linear-gradient(135deg, var(--surface) 0%, var(--surface-subtle) 100%);">
            <div>
              <div class="bento-tag"><i class="fa-solid fa-gauge-high"></i> UNRIVALED SPEED</div>
              <h3 class="bento-card-title">Segment's Fastest ${isPhone ? '5G Smartphone' : 'Performance Architecture'}</h3>
              <p class="bento-card-desc">
                ${isPhone ? 'Engineered with Qualcomm Snapdragon 6 Gen 1 (4nm processor). Delivers 10% faster overall CPU computation, 15% accelerated AI processing, and an AnTuTu benchmark score surpassing 600,000+.' : 'Class-leading processing efficiency with high-throughput architecture for uninterrupted daily workflows.'}
              </p>
            </div>
            <div class="bento-metric-row">
              <div class="bento-metric-badge"><i class="fa-solid fa-microchip"></i> ${product.specifications?.Processor || '4nm Octa-Core 5G'}</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-chart-line"></i> AnTuTu 600K+</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-bolt"></i> UFS 2.2 Turbo Storage</div>
            </div>
          </div>

          <!-- Card 2: Battery -->
          <div class="bento-card">
            <div>
              <div class="bento-tag"><i class="fa-solid fa-battery-full"></i> ALL-DAY STAMINA</div>
              <h3 class="bento-card-title">Segment's Biggest 6,000 mAh Battery</h3>
              <p class="bento-card-desc">
                Massive ultra-dense battery with 44W Smart FlashCharge. Delivers up to 2 full days of nonstop streaming and rapid charging safety.
              </p>
            </div>
            <div class="bento-metric-row">
              <div class="bento-metric-badge"><i class="fa-solid fa-plug-circle-bolt"></i> 44W FlashCharge</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-hourglass-half"></i> 2-Day Endurance</div>
            </div>
          </div>

          <!-- Card 3: Water & Dust Defense -->
          <div class="bento-card">
            <div>
              <div class="bento-tag"><i class="fa-solid fa-droplet"></i> ALL-WEATHER SHIELD</div>
              <h3 class="bento-card-title">Industry-Grade IP64 Dust &amp; Water Armor</h3>
              <p class="bento-card-desc">
                Engineered with high-tolerance rubber seals to resist unexpected rainstorms, kitchen splashes, and dusty outdoor terrains.
              </p>
            </div>
            <div class="bento-metric-row">
              <div class="bento-metric-badge"><i class="fa-solid fa-shield-halved"></i> IP64 Certified</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-water"></i> Splash Resistant</div>
            </div>
          </div>

          <!-- Card 4: Military Toughness -->
          <div class="bento-card">
            <div>
              <div class="bento-tag"><i class="fa-solid fa-medal"></i> DURABILITY BENCHMARK</div>
              <h3 class="bento-card-title">Military-Grade Drop Certification</h3>
              <p class="bento-card-desc">
                Anti-fall structural cushioning with reinforced unibody corners absorbs high-impact surface drops onto hard marble and asphalt.
              </p>
            </div>
            <div class="bento-metric-row">
              <div class="bento-metric-badge"><i class="fa-solid fa-gem"></i> Anti-Scratch Finish</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-shield"></i> Drop Dampening</div>
            </div>
          </div>

          <!-- Card 5: Camera & AI -->
          <div class="bento-card">
            <div>
              <div class="bento-tag"><i class="fa-solid fa-camera"></i> STUDIO PHOTOGRAPHY</div>
              <h3 class="bento-card-title">50MP Ultra HD AI Night Camera</h3>
              <p class="bento-card-desc">
                Super Night Algorithm with Bokeh Flare Portrait mode. AI Transcript Assist and real-time document enhancement at your fingertips.
              </p>
            </div>
            <div class="bento-metric-row">
              <div class="bento-metric-badge"><i class="fa-solid fa-camera-retro"></i> 50MP AI Lens</div>
              <div class="bento-metric-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> AI Transcript</div>
            </div>
          </div>
        </div>
      </div>
    `;

    showcaseContainer.innerHTML = html;
  },

  renderCustomerPhotos(product) {
    const rail = document.getElementById('customer-photos-rail');
    if (!rail) return;

    const unboxingPhotos = product.customerPhotos && product.customerPhotos.length > 0 
      ? product.customerPhotos 
      : [
          {
            img: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
            label: 'In Hand View',
            buyer: 'Verified Buyer'
          },
          {
            img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
            label: 'Unboxing Phone',
            buyer: 'Aman K.'
          },
          {
            img: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
            label: 'Camera Finish',
            buyer: 'Rahul S.'
          },
          {
            img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
            label: 'Charger & Box',
            buyer: 'Pooja M.'
          },
          {
            img: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
            label: 'Side Profile',
            buyer: 'Vikram D.'
          },
          {
            img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
            label: 'Accessories Pack',
            buyer: 'Neha G.'
          }
        ];

    rail.innerHTML = unboxingPhotos.map((p, idx) => `
      <div class="customer-photo-card" onclick="ProductDetailsController.zoomCustomerPhoto('${p.img}', '${p.label}')" title="${p.label} by ${p.buyer}">
        <img src="${p.img}" alt="${p.label}" loading="lazy">
        <span class="customer-photo-badge"><i class="fa-solid fa-camera"></i> ${p.label}</span>
      </div>
    `).join('');
  },

  zoomCustomerPhoto(imgUrl, caption) {
    const mainImg = document.getElementById('main-image-display');
    if (mainImg) {
      mainImg.src = imgUrl;
      window.scrollTo({ top: 180, behavior: 'smooth' });
      ShopScout.toast(`Previewing customer unboxing: ${caption}`, 'info');
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
    const main = document.querySelector('.main-content');
    if (main) {
      main.innerHTML = `
        <div class="container" style="padding: 5rem 1.5rem;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fa-solid fa-triangle-exclamation text-danger"></i>
            </div>
            <h2 class="empty-state-title">Product Not Found</h2>
            <p class="empty-state-desc">The product you are looking for may have been retired or does not exist.</p>
            <a href="products.html" class="btn btn-primary">Browse All Products</a>
          </div>
        </div>
      `;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('product-details.html')) {
    ProductDetailsController.init();
  }
});
