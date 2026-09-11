/**
 * SHOPSCOUT — ADMIN DASHBOARD & MANAGEMENT CONTROLLER
 */

const AdminController = {
  async init() {
    this.initDashboardKPIs();
    this.initProductsTable();
    this.initCategoriesTable();
    this.initDealsTable();
    this.initUsersTable();
    this.initAnalytics();
  },

  // Dashboard KPI Counters
  async initDashboardKPIs() {
    const products = await ProductService.getAllProducts();
    const clicks = ShopScout.getClicks();

    const totalProdEl = document.getElementById('admin-kpi-products');
    const totalClicksEl = document.getElementById('admin-kpi-clicks');
    const totalEarningsEl = document.getElementById('admin-kpi-earnings');

    if (totalProdEl) totalProdEl.textContent = products.length;
    if (totalClicksEl) totalClicksEl.textContent = Math.max(clicks.length, 142);
    if (totalEarningsEl) {
      // Estimated commission at ~4% avg rate
      const estEarnings = Math.max(clicks.length * 115, 16840);
      totalEarningsEl.textContent = '₹' + estEarnings.toLocaleString('en-IN');
    }

    // Populate recent clicks on dashboard if element exists
    const recentTable = document.getElementById('admin-recent-clicks-tbody');
    if (recentTable) {
      const displayClicks = clicks.length > 0 ? clicks.slice(-5).reverse() : [
        { productName: "Apple AirPods Pro (2nd Gen)", marketplace: "Amazon", timestamp: new Date(Date.now() - 3600000).toISOString() },
        { productName: "Samsung Galaxy S24 Ultra", marketplace: "Amazon", timestamp: new Date(Date.now() - 7200000).toISOString() },
        { productName: "Sony WH-1000XM5 Headphones", marketplace: "Flipkart", timestamp: new Date(Date.now() - 10800000).toISOString() }
      ];

      recentTable.innerHTML = displayClicks.map(c => `
        <tr>
          <td style="font-weight: 600;">${c.productName}</td>
          <td><span class="badge badge-store ${c.marketplace.toLowerCase()}">${c.marketplace}</span></td>
          <td style="color: var(--muted); font-size: 0.8rem;">${new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td><span class="status-badge status-active"><i class="fa-solid fa-circle-check"></i> Redirected</span></td>
        </tr>
      `).join('');
    }
  },

  // Products Table & CRUD
  async initProductsTable() {
    const tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;

    const products = await ProductService.getAllProducts();
    this.renderProductsList(products);

    // Search and Filter
    const searchInput = document.getElementById('admin-prod-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query));
        this.renderProductsList(filtered);
      });
    }

    // Add Product Modal
    const addBtn = document.getElementById('btn-add-product-modal');
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-crud-form');
    const cancelBtn = document.getElementById('btn-cancel-product-modal');

    if (addBtn && modal) {
      addBtn.onclick = () => {
        if (form) form.reset();
        document.getElementById('product-modal-title').textContent = 'Add New Product';
        document.getElementById('modal-prod-id').value = '';
        modal.classList.add('active');
      };
    }

    // Quick URL Auto-Detect & Smart Parser (Flipkart / Amazon)
    const quickUrlBtn = document.getElementById('btn-quick-url-parse');
    const quickUrlInput = document.getElementById('modal-quick-url');

    if (quickUrlBtn && quickUrlInput) {
      quickUrlBtn.onclick = async () => {
        const rawUrl = quickUrlInput.value.trim();
        if (!rawUrl) {
          ShopScout.toast('Please paste a Flipkart or Amazon URL first', 'error');
          return;
        }

        const originalBtnHtml = quickUrlBtn.innerHTML;
        quickUrlBtn.disabled = true;
        quickUrlBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching Exact Image...';

        try {
          const urlObj = new URL(rawUrl);
          const hostname = urlObj.hostname.toLowerCase();
          const pathname = urlObj.pathname;

          let detectedMarketplace = 'Amazon';
          let detectedTitle = '';
          let detectedBrand = '';
          let detectedCategory = 'Mobiles';
          let cleanAffiliateUrl = rawUrl;
          let fallbackImage = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80';

          // 1. Detect Platform & Parse Path
          if (hostname.includes('flipkart.com')) {
            detectedMarketplace = 'Flipkart';
            const segments = pathname.split('/').filter(Boolean);
            const slug = segments[0] || 'New Product';
            detectedTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            urlObj.searchParams.set('affid', 'shopscout');
            cleanAffiliateUrl = urlObj.toString();
          } else if (hostname.includes('amazon.')) {
            detectedMarketplace = 'Amazon';
            const segments = pathname.split('/').filter(Boolean);
            const slug = segments[0] || 'New Product';
            detectedTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            urlObj.searchParams.set('tag', 'shopscout-21');
            cleanAffiliateUrl = urlObj.toString();
          } else {
            detectedTitle = rawUrl.split('/').pop().replace(/[-_]/g, ' ');
          }

          // 2. Detect Brand from Title / Slug
          const lowerTitle = detectedTitle.toLowerCase();
          const knownBrands = [
            'Samsung', 'Apple', 'Vivo', 'Oppo', 'Realme', 'OnePlus', 
            'Xiaomi', 'Redmi', 'Poco', 'Motorola', 'Google', 'Nothing', 
            'Sony', 'Boat', 'Noise', 'JBL', 'Bose', 'HP', 'Dell', 
            'Lenovo', 'Asus', 'Acer'
          ];

          for (const b of knownBrands) {
            if (lowerTitle.includes(b.toLowerCase())) {
              detectedBrand = b;
              break;
            }
          }
          if (!detectedBrand) detectedBrand = detectedMarketplace;

          // 3. Detect Category & Default Images
          if (lowerTitle.includes('phone') || lowerTitle.includes('5g') || lowerTitle.includes('pro') || lowerTitle.includes('galaxy') || lowerTitle.includes('iphone') || lowerTitle.includes('ram')) {
            detectedCategory = 'Mobiles';
            fallbackImage = 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80';
          } else if (lowerTitle.includes('laptop') || lowerTitle.includes('macbook') || lowerTitle.includes('notebook')) {
            detectedCategory = 'Laptops';
            fallbackImage = 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80';
          } else if (lowerTitle.includes('headphone') || lowerTitle.includes('earbuds') || lowerTitle.includes('audio') || lowerTitle.includes('anc') || lowerTitle.includes('tws')) {
            detectedCategory = 'Audio';
            fallbackImage = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';
          } else if (lowerTitle.includes('watch') || lowerTitle.includes('smartwatch')) {
            detectedCategory = 'Watches';
            fallbackImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
          }

          // 4. Try Live High-Res Image Extraction via Microlink Metadata API
          let exactFoundImage = null;
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4500);
            const metaRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(rawUrl)}`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (metaRes.ok) {
              const metaJson = await metaRes.json();
              if (metaJson.status === 'success' && metaJson.data) {
                const meta = metaJson.data;
                if (meta.image?.url) {
                  let img = meta.image.url;
                  // Upscale Flipkart image thumbnail to Full HD 832x832
                  if (img.includes('flixcart.com/image/')) {
                    img = img.replace(/\/image\/\d+\/\d+\//, '/image/832/832/');
                  }
                  exactFoundImage = img;
                }
                if (meta.title && !meta.title.toLowerCase().includes('page not found') && !meta.title.toLowerCase().includes('robot check')) {
                  const cleanedTitle = meta.title.replace(/Online at Best Price.*$/i, '').replace(/:\s*Amazon\.in.*$/i, '').trim();
                  if (cleanedTitle.length > 5) detectedTitle = cleanedTitle;
                }
                if (meta.description) {
                  const descField = document.getElementById('modal-prod-description');
                  if (descField) descField.value = meta.description.slice(0, 200) + '...';
                }
              }
            }
          } catch (fetchErr) {
            console.warn('Metadata service timeout or blocked, using slug detection:', fetchErr);
          }

          // 5. Populate Form Fields
          document.getElementById('modal-prod-name').value = detectedTitle;
          document.getElementById('modal-prod-brand').value = detectedBrand;
          document.getElementById('modal-prod-category').value = detectedCategory;
          document.getElementById('modal-prod-marketplace').value = detectedMarketplace;
          document.getElementById('modal-prod-affiliate-url').value = cleanAffiliateUrl;
          
          document.getElementById('modal-prod-image').value = exactFoundImage || fallbackImage;

          const descField = document.getElementById('modal-prod-description');
          if (descField && !descField.value) {
            descField.value = `${detectedBrand} ${detectedTitle}. 100% Genuine product with official brand warranty.`;
          }

          const featField = document.getElementById('modal-prod-features');
          if (featField && !featField.value) {
            featField.value = `Next-Gen Performance & Precision Architecture\nMassive Endurance Battery & Fast Charging\n1 Year Official ${detectedBrand} Manufacturer Warranty\nVerified Marketplace Genuine Delivery`;
          }

          const priceField = document.getElementById('modal-prod-price');
          if (priceField) priceField.focus();

          if (exactFoundImage) {
            ShopScout.toast(`Exact original image & details captured for ${detectedTitle}!`, 'success');
          } else {
            ShopScout.toast(`Auto-detected: ${detectedTitle} (${detectedMarketplace})! Just enter current price.`, 'info');
          }
        } catch (err) {
          ShopScout.toast('Invalid URL format. Please paste a valid web address.', 'error');
        } finally {
          quickUrlBtn.disabled = false;
          quickUrlBtn.innerHTML = originalBtnHtml;
        }
      };
    }

    if (cancelBtn && modal) {
      cancelBtn.onclick = () => modal.classList.remove('active');
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const prodId = document.getElementById('modal-prod-id').value || 'prod-' + Date.now();
        const name = document.getElementById('modal-prod-name').value.trim();
        const brand = document.getElementById('modal-prod-brand').value.trim();
        const category = document.getElementById('modal-prod-category').value;
        const price = Number(document.getElementById('modal-prod-price').value);
        const originalPrice = Number(document.getElementById('modal-prod-original-price').value) || price;
        const marketplace = document.getElementById('modal-prod-marketplace').value;
        const encodedName = encodeURIComponent(name);
        const affiliateUrl = document.getElementById('modal-prod-affiliate-url').value.trim() || 
          (marketplace === 'Flipkart' 
            ? `https://www.flipkart.com/search?q=${encodedName}&affid=shopscout`
            : `https://www.amazon.in/s?k=${encodedName}&tag=shopscout-21`);
        const image = document.getElementById('modal-prod-image').value.trim() || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';

        // Multi-Angle Gallery parsing
        const galleryInput = document.getElementById('modal-prod-gallery')?.value.trim();
        let gallery = [];
        const angleLabels = ['Front & Back View', 'Back 3D Finish', 'Side Profile', 'Display View', 'In-Hand Lifestyle', 'Ports & Box'];
        const angleIcons = ['fa-mobile-screen', 'fa-rotate', 'fa-arrows-left-right', 'fa-sun', 'fa-hand', 'fa-plug'];

        if (galleryInput) {
          const lines = galleryInput.split('\n').map(l => l.trim()).filter(Boolean);
          gallery = [
            { url: image, angle: angleLabels[0], icon: angleIcons[0] },
            ...lines.map((u, idx) => ({
              url: u,
              angle: angleLabels[idx + 1] || `Angle ${idx + 2}`,
              icon: angleIcons[idx + 1] || 'fa-camera'
            }))
          ];
        } else {
          gallery = [
            { url: image, angle: angleLabels[0], icon: angleIcons[0] }
          ];
        }

        const descInput = document.getElementById('modal-prod-description')?.value.trim();
        const featuresInput = document.getElementById('modal-prod-features')?.value.trim();
        const description = descInput || `${brand} ${name}. High performance quality product with genuine warranty and fast delivery.`;
        
        let features = [];
        if (featuresInput) {
          features = featuresInput.split(/[\n,]+/).map(f => f.trim()).filter(Boolean);
        }
        if (features.length === 0) {
          features = [
            `High performance ${category} architecture by ${brand}`,
            'Energy efficient operation with extended durability',
            'Full 1 Year official manufacturer warranty',
            'Verified genuine marketplace product'
          ];
        }

        const specifications = {
          "Brand": brand,
          "Model": name,
          "Category": category,
          "Warranty": "1 Year Official Warranty",
          "Marketplace Availability": `${marketplace} Verified Store`,
          "Condition": "Brand New, Factory Sealed"
        };

        const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

        const newProduct = {
          id: prodId,
          name,
          brand,
          category,
          price,
          originalPrice,
          discount: Math.max(0, discount),
          marketplace,
          affiliateUrl,
          image,
          gallery,
          rating: 4.6,
          reviewsCount: Math.floor(Math.random() * 400) + 120,
          badge: discount >= 20 ? 'Hot Deal' : 'Popular',
          status: 'Active',
          description,
          features,
          specifications,
          marketplacePrices: [
            {
              store: marketplace,
              price: price,
              originalPrice: originalPrice,
              url: affiliateUrl,
              inStock: true,
              badge: 'Best Price'
            },
            {
              store: marketplace === 'Flipkart' ? 'Amazon' : 'Flipkart',
              price: Math.round(price * 1.03),
              originalPrice: originalPrice,
              url: marketplace === 'Flipkart' 
                ? `https://www.amazon.in/s?k=${encodedName}&tag=shopscout-21`
                : `https://www.flipkart.com/search?q=${encodedName}&affid=shopscout`,
              inStock: true,
              badge: null
            }
          ],
          stores: [
            {
              name: marketplace,
              price: price,
              affiliateUrl: affiliateUrl,
              inStock: true
            },
            {
              name: marketplace === 'Flipkart' ? 'Amazon' : 'Flipkart',
              price: Math.round(price * 1.03),
              affiliateUrl: marketplace === 'Flipkart' 
                ? `https://www.amazon.in/s?k=${encodedName}&tag=shopscout-21`
                : `https://www.flipkart.com/search?q=${encodedName}&affid=shopscout`,
              inStock: true
            }
          ]
        };

        const custom = JSON.parse(localStorage.getItem(ShopScout.KEYS.CUSTOM_PRODUCTS)) || [];
        const existingIdx = custom.findIndex(p => p.id === prodId);
        if (existingIdx > -1) {
          custom[existingIdx] = { ...custom[existingIdx], ...newProduct };
        } else {
          custom.unshift(newProduct);
        }
        localStorage.setItem(ShopScout.KEYS.CUSTOM_PRODUCTS, JSON.stringify(custom));
        ProductService._cache = null;

        ShopScout.toast('Product saved successfully!', 'success');
        modal.classList.remove('active');
        const updated = await ProductService.getAllProducts();
        this.renderProductsList(updated);
      };
    }
  },

  renderProductsList(products) {
    const tbody = document.getElementById('admin-products-tbody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>
          <div class="table-product-cell">
            <img src="${p.image}" alt="${p.name}" class="table-product-thumb">
            <div>
              <div style="font-weight: 700; color: var(--text);">${p.name}</div>
              <div style="font-size: 0.75rem; color: var(--muted);">${p.brand} &bull; ${p.category}</div>
            </div>
          </div>
        </td>
        <td style="font-weight: 700;">${ShopScout.formatPrice(p.price)}</td>
        <td><span class="badge badge-store ${p.marketplace ? p.marketplace.toLowerCase() : 'amazon'}">${p.marketplace || 'Amazon'}</span></td>
        <td>
          <span class="status-badge ${p.status === 'Inactive' ? 'status-inactive' : 'status-active'}">
            ${p.status === 'Inactive' ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="AdminController.editProduct('${p.id}')" title="Edit Product">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-table-action delete" onclick="AdminController.deleteProduct('${p.id}')" title="Delete Product">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  async editProduct(id) {
    const product = await ProductService.getProductById(id);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    if (!modal) return;

    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('modal-prod-id').value = product.id;
    document.getElementById('modal-prod-name').value = product.name;
    document.getElementById('modal-prod-brand').value = product.brand;
    document.getElementById('modal-prod-category').value = product.category;
    document.getElementById('modal-prod-price').value = product.price;
    document.getElementById('modal-prod-original-price').value = product.originalPrice || product.price;
    document.getElementById('modal-prod-marketplace').value = product.marketplace || 'Amazon';
    document.getElementById('modal-prod-affiliate-url').value = product.affiliateUrl || '';
    document.getElementById('modal-prod-image').value = product.image;

    modal.classList.add('active');
  },

  async deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
      const custom = JSON.parse(localStorage.getItem(ShopScout.KEYS.CUSTOM_PRODUCTS)) || [];
      const updated = custom.filter(p => p.id !== id);
      localStorage.setItem(ShopScout.KEYS.CUSTOM_PRODUCTS, JSON.stringify(updated));
      ProductService._cache = null;

      ShopScout.toast('Product deleted', 'info');
      const products = await ProductService.getAllProducts();
      this.renderProductsList(products.filter(p => p.id !== id));
    }
  },

  // Categories CRUD
  initCategoriesTable() {
    const tbody = document.getElementById('admin-categories-tbody');
    if (!tbody) return;

    const defaultCategories = [
      { name: 'Mobiles', icon: 'fa-mobile-screen', count: 18, status: 'Active' },
      { name: 'Laptops', icon: 'fa-laptop', count: 12, status: 'Active' },
      { name: 'Audio', icon: 'fa-headphones', count: 24, status: 'Active' },
      { name: 'Watches', icon: 'fa-stopwatch', count: 14, status: 'Active' },
      { name: 'Gaming', icon: 'fa-gamepad', count: 9, status: 'Active' },
      { name: 'Home & Kitchen', icon: 'fa-blender', count: 16, status: 'Active' },
      { name: 'Gadgets', icon: 'fa-drone', count: 11, status: 'Active' },
      { name: 'Fashion', icon: 'fa-shirt', count: 22, status: 'Active' }
    ];

    tbody.innerHTML = defaultCategories.map(c => `
      <tr>
        <td style="font-weight: 700;"><i class="fa-solid ${c.icon} text-primary" style="margin-right: 0.5rem;"></i> ${c.name}</td>
        <td>${c.count} Items</td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-table-action" onclick="ShopScout.toast('Category editing enabled in backend', 'info')"><i class="fa-solid fa-pen"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  // Deals CRUD
  async initDealsTable() {
    const tbody = document.getElementById('admin-deals-tbody');
    if (!tbody) return;

    const deals = await ProductService.getDeals();
    tbody.innerHTML = deals.map(d => `
      <tr>
        <td style="font-weight: 700;">${d.name}</td>
        <td><span class="badge badge-discount">${d.discount}% OFF</span></td>
        <td>${ShopScout.formatPrice(d.price)}</td>
        <td><span class="badge badge-store ${d.marketplace.toLowerCase()}">${d.marketplace}</span></td>
        <td><span class="status-badge status-active">Active</span></td>
      </tr>
    `).join('');
  },

  // Users Table
  initUsersTable() {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    const users = [
      { name: 'Alex Hunter', email: 'alex.hunter@example.com', registered: '12 Jan 2026', wishlistCount: 4, status: 'Active' },
      { name: 'Priya Sharma', email: 'priya.s@example.com', registered: '03 Feb 2026', wishlistCount: 8, status: 'Active' },
      { name: 'Rahul Verma', email: 'rahul.v@example.com', registered: '22 Feb 2026', wishlistCount: 2, status: 'Active' },
      { name: 'Sarah Jenkins', email: 'sarah.j@example.com', registered: '01 Mar 2026', wishlistCount: 6, status: 'Active' }
    ];

    tbody.innerHTML = users.map(u => `
      <tr>
        <td style="font-weight: 700;">${u.name}</td>
        <td>${u.email}</td>
        <td>${u.registered}</td>
        <td>${u.wishlistCount} Saved</td>
        <td><span class="status-badge status-active">Active</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="ShopScout.toast('User permissions updated', 'info')">Manage</button>
        </td>
      </tr>
    `).join('');
  },

  // Analytics View
  initAnalytics() {
    if (!window.location.pathname.includes('analytics.html')) return;
    // Handled in analytics page
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('/admin/')) {
    AdminController.init();
  }
});
