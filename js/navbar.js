/**
 * SHOPSCOUT — NAVBAR & SEARCH SUGGESTIONS CONTROLLER
 */

const NavbarController = {
  init() {
    this.bindMobileDrawer();
    this.bindHeaderSearch();
    this.highlightActiveLink();
  },

  // Highlight Current Navigation Link
  highlightActiveLink() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link, .drawer-nav-link, .bottom-bar-item').forEach(link => {
      const href = link.getAttribute('href');
      if (href && (currentPath.endsWith(href) || (currentPath.endsWith('/') && href.includes('index.html')))) {
        link.classList.add('active');
      }
    });
  },

  // Mobile Drawer Toggle
  bindMobileDrawer() {
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-nav-drawer');
    const closeBtn = document.querySelector('.drawer-close-btn');

    if (toggleBtn && drawer) {
      toggleBtn.addEventListener('click', () => {
        drawer.classList.add('active');
      });
    }

    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => {
        drawer.classList.remove('active');
      });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (drawer && drawer.classList.contains('active')) {
        if (!drawer.contains(e.target) && !toggleBtn?.contains(e.target)) {
          drawer.classList.remove('active');
        }
      }
    });
  },

  // Header Search Autocomplete & Submission
  bindHeaderSearch() {
    const searchInputs = document.querySelectorAll('.header-search-input');
    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const searchUrl = isPagesSubdir ? 'search.html' : 'pages/search.html';
    const detailUrlPrefix = isPagesSubdir ? 'product-details.html?id=' : 'pages/product-details.html?id=';

    searchInputs.forEach(input => {
      const wrapper = input.closest('.header-search-wrap');
      if (!wrapper) return;

      let dropdown = wrapper.querySelector('.search-suggestions-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-suggestions-dropdown';
        wrapper.appendChild(dropdown);
      }

      // Enter key submits to search.html?q=...
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = input.value.trim();
          if (query) {
            window.location.href = `${searchUrl}?q=${encodeURIComponent(query)}`;
          }
        }
      });

      // Realtime search preview
      let debounceTimer;
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const val = input.value.trim().toLowerCase();

        if (val.length < 2) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const products = await ProductService.getAllProducts();
            const matched = ShopScout.fuzzySearch(products, val).slice(0, 5);

            if (matched.length > 0) {
              dropdown.innerHTML = `
                <div style="padding: 0.4rem 0.85rem; font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
                  <span><i class="fa-solid fa-wand-magic-sparkles" style="color: var(--primary);"></i> Smart Matches</span>
                  <span style="font-size: 0.68rem; color: var(--deal-orange); font-weight: 800;">${matched.length} items</span>
                </div>
              ` + matched.map(item => `
                <a href="${detailUrlPrefix}${item.id}" class="suggestion-item">
                  <img src="${item.image}" alt="${item.name}">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">${item.name}</div>
                    <div style="font-size: 0.72rem; color: var(--muted);"><i class="fa-solid fa-tag" style="font-size:0.65rem;"></i> ${item.brand || 'ShopScout'} &bull; ${item.category}</div>
                  </div>
                  <span class="suggestion-price" style="font-weight: 800; font-size: 0.86rem; color: var(--primary);">${ShopScout.formatPrice(item.price)}</span>
                </a>
              `).join('') + `
                <a href="${searchUrl}?q=${encodeURIComponent(val)}" style="display: block; text-align: center; padding: 0.55rem; font-size: 0.8rem; font-weight: 800; color: var(--primary); background: var(--surface-subtle); border-top: 1px solid var(--border); text-decoration: none;">
                  View all results for "${val}" &rarr;
                </a>
              `;
              dropdown.classList.add('active');
            } else {
              dropdown.innerHTML = `
                <div style="padding: 1.25rem 1rem; text-align: center; font-size: 0.85rem; color: var(--muted);">
                  <i class="fa-solid fa-magnifying-glass" style="font-size: 1.2rem; opacity: 0.4; margin-bottom: 0.35rem; display: block;"></i>
                  No quick matches found for "<strong>${val}</strong>".<br>
                  <span style="font-size: 0.76rem; opacity: 0.8;">Press Enter to search all departments</span>
                </div>
              `;
              dropdown.classList.add('active');
            }
          } catch (err) {
            console.error(err);
          }
        }, 200);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  NavbarController.init();
});
