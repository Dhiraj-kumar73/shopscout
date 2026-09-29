/**
 * SHOPSCOUT — NAVBAR & SEARCH SUGGESTIONS CONTROLLER
 */

const NavbarController = {
  init() {
    this.bindMobileDrawer();
    this.bindHeaderSearch();
    this.highlightActiveLink();
    this.bindSecretAdminDoor();
  },

  // Secret Founder Door: Triple-tap the brand logo to access Admin Portal
  bindSecretAdminDoor() {
    let tapCount = 0;
    let tapTimer = null;
    document.querySelectorAll('.brand-logo').forEach(logo => {
      logo.addEventListener('click', (e) => {
        tapCount++;
        if (tapTimer) clearTimeout(tapTimer);
        if (tapCount >= 3) {
          e.preventDefault();
          tapCount = 0;
          const isPagesSubdir = window.location.pathname.includes('/pages/');
          const adminUrl = isPagesSubdir ? '../admin/products.html' : 'admin/products.html';
          if (typeof ShopScout !== 'undefined' && ShopScout.toast) {
            ShopScout.toast('👑 Founder Access: Opening Admin Portal...', 'info');
          }
          setTimeout(() => {
            window.location.href = adminUrl;
          }, 350);
          return;
        }
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 1200);
      });
    });
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

  // Mobile Drawer Toggle with Complete Background Scroll Lock
  bindMobileDrawer() {
    const toggleBtns = document.querySelectorAll('.mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-nav-drawer');
    const closeBtn = document.querySelector('.drawer-close-btn');

    if (!drawer) return;

    // Ensure backdrop exists in DOM
    let backdrop = document.querySelector('.mobile-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    let scrollPosition = 0;
    let isLocked = false;

    const openDrawer = () => {
      if (isLocked) return;
      isLocked = true;
      scrollPosition = window.pageYOffset || document.documentElement.scrollTop || 0;

      drawer.classList.add('active');
      backdrop.classList.add('active');

      // Comprehensive iOS / Android / Desktop body scroll lock
      document.body.style.top = `-${scrollPosition}px`;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      if (!isLocked && !drawer.classList.contains('active')) return;
      isLocked = false;

      drawer.classList.remove('active');
      backdrop.classList.remove('active');

      // Restore body position without jump
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollPosition);
    };

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (drawer.classList.contains('active')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeDrawer();
      });
    }

    backdrop.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDrawer();
    });

    // Prevent backdrop touch gestures from moving the viewport
    backdrop.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Close when clicking outside drawer
    document.addEventListener('click', (e) => {
      if (drawer.classList.contains('active')) {
        let isToggle = false;
        toggleBtns.forEach(btn => {
          if (btn.contains(e.target)) isToggle = true;
        });
        if (!drawer.contains(e.target) && !isToggle) {
          closeDrawer();
        }
      }
    });

    // Close on link click inside drawer
    drawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('active')) {
        closeDrawer();
      }
    });
  },

  // Header Search Autocomplete & Submission
  bindHeaderSearch() {
    const searchInputs = document.querySelectorAll('.header-search-input');
    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const searchUrl = isPagesSubdir ? 'products.html' : 'pages/products.html';
    const detailUrlPrefix = isPagesSubdir ? 'product-details.html?id=' : 'pages/product-details.html?id=';

    searchInputs.forEach(input => {
      const wrapper = input.closest('.mega-search-container') || input.closest('.mega-search-bar') || input.closest('.header-search-wrap') || input.parentElement;
      if (!wrapper) return;

      let dropdown = wrapper.querySelector('.search-suggestions-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'search-suggestions-dropdown';
        wrapper.appendChild(dropdown);
      }

      // Submit search query to products/catalog page
      const performSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const query = input.value.trim();
        dropdown.classList.remove('active');
        const deptSelect = wrapper.querySelector('.mega-search-category') || wrapper.querySelector('.search-dept-select');
        const catVal = deptSelect && deptSelect.value && deptSelect.value !== 'all' ? deptSelect.value : null;

        if (window.location.pathname.includes('products.html') && typeof FilterController !== 'undefined' && FilterController.setQuery) {
          if (catVal && FilterController.setCategory) {
            FilterController.setCategory(catVal);
          }
          FilterController.setQuery(query);
        } else if (query || catVal) {
          let target = `${searchUrl}?q=${encodeURIComponent(query || '')}`;
          if (catVal) target += `&category=${encodeURIComponent(catVal)}`;
          window.location.href = target;
        }
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          performSubmit(e);
        }
      });

      const searchForm = input.closest('form');
      if (searchForm) {
        searchForm.addEventListener('submit', performSubmit);
      }
      const searchBtn = wrapper.querySelector('.mega-search-btn');
      if (searchBtn && (!searchForm || searchBtn.type !== 'submit')) {
        searchBtn.addEventListener('click', performSubmit);
      }

      // Realtime search preview
      let debounceTimer;
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const val = input.value.trim();

        if (val.length < 2) {
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const products = await ProductService.getAllProducts();
            const matched = ShopScout.fuzzySearch(products, val).slice(0, 6);

            if (matched.length > 0) {
              const valEsc = val.replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
              dropdown.innerHTML = `
                <a href="${searchUrl}?q=${encodeURIComponent(val)}" class="suggestion-keyword-row">
                  <i class="fa-solid fa-magnifying-glass suggestion-search-icon"></i>
                  <div style="flex: 1; min-width: 0;">
                    <span style="color: var(--text);">Search for "<strong>${valEsc}</strong>"</span>
                  </div>
                  <i class="fa-solid fa-arrow-right suggestion-arrow"></i>
                </a>
                <div style="padding: 0.45rem 1.15rem 0.25rem; font-size: 0.7rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: space-between;">
                  <span>Matching Products</span>
                  <span style="font-size: 0.68rem; color: var(--muted); font-weight: 600;">${matched.length} found</span>
                </div>
              ` + matched.map(item => `
                <a href="${detailUrlPrefix}${item.id}" class="suggestion-item">
                  <img src="${item.image}" alt="${item.name}">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.84rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text);">${item.name}</div>
                    <div style="font-size: 0.72rem; color: var(--muted); display:flex; align-items:center; gap:0.4rem; margin-top: 2px;">
                      <span><i class="fa-solid fa-tag" style="font-size:0.65rem;"></i> ${item.brand || 'ShopScout'} &bull; ${item.category}</span>
                    </div>
                  </div>
                  <i class="fa-solid fa-arrow-right suggestion-arrow"></i>
                </a>
              `).join('') + `
                <a href="${searchUrl}?q=${encodeURIComponent(val)}" class="suggestion-view-all-link" style="display: block; text-align: center; padding: 0.6rem; font-size: 0.8rem; font-weight: 700; color: var(--primary); background: var(--surface-subtle); border-top: 1px solid var(--border); text-decoration: none;">
                  View all results for "${valEsc}" &rarr;
                </a>
              `;
              
              var viewAllBtn = dropdown.querySelector('.suggestion-view-all-link');
              var keywordRow = dropdown.querySelector('.suggestion-keyword-row');
              const handleDirectSearch = (ev) => {
                if (window.location.pathname.includes('products.html') && typeof FilterController !== 'undefined' && FilterController.setQuery) {
                  ev.preventDefault();
                  dropdown.classList.remove('active');
                  FilterController.setQuery(val);
                }
              };
              if (viewAllBtn) viewAllBtn.addEventListener('click', handleDirectSearch);
              if (keywordRow) keywordRow.addEventListener('click', handleDirectSearch);

              dropdown.classList.add('active');
            } else {
              var safeVal = val.replace(/[<>&"]/g, s => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s]));
              dropdown.innerHTML = `
                <div style="padding: 1.25rem 1rem; text-align: center; font-size: 0.85rem; color: var(--muted);">
                  <div style="width: 38px; height: 38px; margin: 0 auto 0.4rem; border-radius: 50%; background: rgba(234, 88, 12, 0.12); color: var(--deal-orange); display: flex; align-items: center; justify-content: center; font-size: 1.05rem;">
                    <i class="fa-solid fa-magnifying-glass"></i>
                  </div>
                  <div style="font-weight: 700; color: var(--text); margin-bottom: 0.25rem;">"${safeVal}" nahi mila</div>
                  <p style="font-size: 0.76rem; color: var(--muted); margin-bottom: 0.65rem;">Spelling check karein ya inme se chuney:</p>
                  <div style="display: flex; gap: 0.35rem; justify-content: center; flex-wrap: wrap;">
                    <button type="button" class="btn btn-outline btn-xs nav-notfound-chip" data-query="Mobile" style="border-radius: var(--radius-full); font-size: 0.72rem; padding: 0.2rem 0.55rem;">📱 Mobile</button>
                    <button type="button" class="btn btn-outline btn-xs nav-notfound-chip" data-query="Laptop" style="border-radius: var(--radius-full); font-size: 0.72rem; padding: 0.2rem 0.55rem;">💻 Laptop</button>
                    <button type="button" class="btn btn-outline btn-xs nav-notfound-chip" data-query="Audio" style="border-radius: var(--radius-full); font-size: 0.72rem; padding: 0.2rem 0.55rem;">🎧 Audio</button>
                    <button type="button" class="btn btn-outline btn-xs nav-notfound-chip" data-query="boAt" style="border-radius: var(--radius-full); font-size: 0.72rem; padding: 0.2rem 0.55rem;">⚡ boAt</button>
                  </div>
                </div>
              `;

              dropdown.querySelectorAll('.nav-notfound-chip').forEach(b => {
                b.addEventListener('click', (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  dropdown.classList.remove('active');
                  const targetQ = b.getAttribute('data-query');
                  if (typeof window.executeHomeSearch === 'function') {
                    window.executeHomeSearch(targetQ);
                  } else if (typeof window.executeSearchPageSearch === 'function') {
                    window.executeSearchPageSearch(targetQ);
                  } else {
                    window.location.href = `${searchUrl}?q=${encodeURIComponent(targetQ)}`;
                  }
                });
              });

              dropdown.classList.add('active');
            }
          } catch (err) {
            console.error(err);
          }
        }, 180);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.remove('active');
        }
      });
    });
  },



  // Universal Smart Back Navigation
  goBack() {
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back();
    } else {
      const isPagesDir = window.location.pathname.toLowerCase().includes('/pages/');
      const isSubdir = isPagesDir || window.location.pathname.toLowerCase().includes('/admin/');
      if (isSubdir) {
        window.location.href = '../index.html';
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
};

window.goBack = () => NavbarController.goBack();

document.addEventListener('DOMContentLoaded', () => {
  NavbarController.init();
});
