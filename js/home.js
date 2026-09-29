/**
 * SHOPSCOUT - HOME PAGE SCRIPT
 * Renders all product grids on the homepage
 */

document.addEventListener("DOMContentLoaded", async function() {
  var allProducts = [];
  try {
    allProducts = await ProductService.getAllProducts();
  } catch (err) {
    console.error("[Home] Error loading products:", err);
  }

  // Double fallback: If still empty, pull live products from FakeStoreAPI
  if (!Array.isArray(allProducts) || allProducts.length === 0) {
    try {
      var fakeRes = await fetch("https://fakestoreapi.com/products?limit=10");
      if (fakeRes.ok) {
        var fakeItems = await fakeRes.json();
        allProducts = fakeItems.map(function(item, idx) {
          var inr = Math.round(Number(item.price || 20) * 85);
          var orig = Math.round(inr * 1.35);
          return {
            id: "fake-" + item.id,
            name: item.title,
            category: item.category || "Deals",
            brand: "Amazon Featured",
            price: inr,
            originalPrice: orig,
            discount: Math.round(((orig - inr) / orig) * 100),
            image: item.image,
            rating: item.rating?.rate || 4.5,
            reviewsCount: item.rating?.count || 135,
            marketplace: "Amazon",
            affiliateUrl: "https://www.amazon.in/s?k=" + encodeURIComponent(item.title) + "&tag=dhirajkuma05e-21",
            isDeal: true,
            isTrending: true,
            badge: idx % 2 === 0 ? "Deal of the Day" : "Trending"
          };
        });
      }
    } catch (e) {
      console.warn("[Home] FakeStore fallback warning:", e);
    }
  }

  if (!Array.isArray(allProducts)) allProducts = [];

  // 1. Render Today Best Deals Grid (Top 10 curated deals)
  var dealsGrid = document.getElementById("home-deals-grid");
  if (dealsGrid) {
    var deals = allProducts.filter(function(p) { return p.isDeal || (p.discount && p.discount >= 15); });
    var toRender = (deals.length > 0 ? deals : allProducts).slice(0, 6);
    if (toRender.length > 0) {
      dealsGrid.innerHTML = toRender.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      dealsGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No deals found. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">Browse All</a></p></div>";
    }
  }

  // 2. Render Trending Products Grid (Top 6 trending)
  var trendingGrid = document.getElementById("trending-products-grid");
  if (trendingGrid) {
    var trending = allProducts.filter(function(p) { return p.isTrending; });
    var toShow = (trending.length > 0 ? trending : allProducts).slice(0, 6);
    if (toShow.length > 0) {
      trendingGrid.innerHTML = toShow.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      trendingGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No products yet. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">View All</a></p></div>";
    }
  }

  // 3. Price Range Filter (Top 6 in selected range)
  var priceRangeGrid = document.getElementById("price-range-products-grid");
  var priceActiveTitle = document.getElementById("price-range-active-title");
  var priceActiveText = document.getElementById("price-range-active-text");
  var priceBtns = document.querySelectorAll("#price-range-buttons .price-range-card");
  var catalogLink = document.getElementById("price-range-view-catalog-link");

  function renderPriceRange(min, max, label) {
    if (!priceRangeGrid) return;
    var filtered = allProducts.filter(function(p) { return p.price >= min && p.price <= max; });
    if (priceActiveTitle) priceActiveTitle.textContent = (label || "All") + " - Verified Deals";
    if (priceActiveText) priceActiveText.textContent = "Selected: " + (label || "All Best Deals");
    if (catalogLink) catalogLink.href = max < 999999 ? "pages/products.html?maxPrice=" + max : "pages/products.html";

    if (filtered.length === 0) {
      priceRangeGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No products in this range. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">View All</a></p></div>";
    } else {
      var topFiltered = filtered.slice(0, 6);
      priceRangeGrid.innerHTML = topFiltered.map(function(p) { return renderProductCard(p); }).join("");
    }
  }

  priceBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      priceBtns.forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      renderPriceRange(parseInt(btn.dataset.min) || 0, parseInt(btn.dataset.max) || 999999, btn.dataset.label || "");
    });
  });

  // 4. Auto-Gliding Rail Engine ("Chalta rahe our dikhta rahe")
  var priceTrack = document.getElementById("price-range-buttons");
  var prevBtn = document.getElementById("price-slider-prev");
  var nextBtn = document.getElementById("price-slider-next");

  if (priceTrack && window.innerWidth >= 768) {
    var isGlidingPaused = false;
    var glideTimer = null;
    var glideSpeed = 1.75; // brisk, lively, and smooth gliding speed
    var isResetting = false;

    function glideTick() {
      if (!isGlidingPaused && !isResetting && priceTrack) {
        var maxScroll = priceTrack.scrollWidth - priceTrack.clientWidth;
        if (maxScroll > 15) {
          if (priceTrack.scrollLeft >= maxScroll - 2) {
            // Reached the end: quick pause, then smoothly glide back to start
            isResetting = true;
            setTimeout(function() {
              if (priceTrack) {
                priceTrack.scrollTo({ left: 0, behavior: "smooth" });
              }
              setTimeout(function() {
                isResetting = false;
              }, 900);
            }, 700);
          } else {
            priceTrack.scrollLeft += glideSpeed;
          }
        }
      }
      requestAnimationFrame(glideTick);
    }

    // Start auto-gliding quickly
    setTimeout(function() {
      requestAnimationFrame(glideTick);
    }, 400);

    function pauseGlide() {
      isGlidingPaused = true;
      if (glideTimer) clearTimeout(glideTimer);
    }

    function resumeGlide(delay) {
      if (glideTimer) clearTimeout(glideTimer);
      glideTimer = setTimeout(function() {
        isGlidingPaused = false;
      }, delay || 1200);
    }

    // Pause on hover or touch
    priceTrack.addEventListener("mouseenter", pauseGlide);
    priceTrack.addEventListener("mouseleave", function() { resumeGlide(800); });
    priceTrack.addEventListener("touchstart", pauseGlide, { passive: true });
    priceTrack.addEventListener("touchend", function() { resumeGlide(1500); });

    // Also pause on manual drag or scroll
    priceTrack.addEventListener("pointerdown", pauseGlide);
    priceTrack.addEventListener("pointerup", function() { resumeGlide(1500); });

    // Slider arrows
    if (prevBtn) {
      prevBtn.addEventListener("click", function() {
        pauseGlide();
        priceTrack.scrollBy({ left: -220, behavior: "smooth" });
        resumeGlide(3500);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function() {
        pauseGlide();
        priceTrack.scrollBy({ left: 220, behavior: "smooth" });
        resumeGlide(3500);
      });
    }
  }

  // Initial render
  renderPriceRange(0, 999999, "All Best Deals");

  // 5. In-Page Amazon-Style Instant Search
  var searchSection = document.getElementById("home-search-results-section");
  var searchGrid = document.getElementById("home-search-results-grid");
  var queryLabel = document.getElementById("home-search-query-label");
  var countText = document.getElementById("home-search-count-text");
  var clearBtn = document.getElementById("home-search-clear-btn");
  var headerInputs = document.querySelectorAll(".header-search-input");

  window.executeHomeSearch = function(query) {
    if (!searchSection || !searchGrid) return;
    query = (query || "").trim();

    if (!query) {
      window.clearHomeSearch();
      return;
    }

    // Sync all search inputs on page
    headerInputs.forEach(function(inp) { inp.value = query; });

    var matches = ShopScout.fuzzySearch(allProducts, query);
    if (queryLabel) queryLabel.textContent = query;
    if (countText) countText.textContent = matches.length + " matching " + (matches.length === 1 ? "product" : "products") + " found";

    if (matches.length > 0) {
      searchGrid.innerHTML = matches.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      var safeQuery = (query || "").replace(/[<>&"]/g, function(s) {
        return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[s];
      });
      var trending = allProducts.slice(0, 8);
      searchGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2.75rem 1.25rem 2rem; background: var(--surface); border: 1.5px dashed var(--border); border-radius: var(--radius-lg); margin-bottom: 2.5rem; box-shadow: var(--shadow-sm);">
          <div style="width: 64px; height: 64px; margin: 0 auto 1.25rem; border-radius: 50%; background: rgba(234, 88, 12, 0.12); color: var(--deal-orange); display: flex; align-items: center; justify-content: center; font-size: 1.8rem;">
            <i class="fa-solid fa-magnifying-glass-arrow-right"></i>
          </div>
          <h3 style="font-weight: 800; font-size: 1.35rem; color: var(--text); margin-bottom: 0.6rem;">
            "${safeQuery}" ke liye koi product nahi mila
          </h3>
          <p style="color: var(--muted); font-size: 0.92rem; max-width: 540px; margin: 0 auto 1.5rem; line-height: 1.6;">
            Aapka search kiya gaya item catalog me uplabdh nahi hai. Kripya spelling check karein ya neeche diye gaye popular categories me se chuney:
          </p>
          
          <!-- Quick Clickable Category Suggestions -->
          <div style="display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; margin-bottom: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm home-notfound-chip" data-query="Mobile" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">
              📱 Mobiles
            </button>
            <button type="button" class="btn btn-outline btn-sm home-notfound-chip" data-query="Laptop" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">
              💻 Laptops
            </button>
            <button type="button" class="btn btn-outline btn-sm home-notfound-chip" data-query="Audio" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">
              🎧 Audio &amp; boAt
            </button>
            <button type="button" class="btn btn-outline btn-sm home-notfound-chip" data-query="Watch" style="border-radius: var(--radius-full); font-weight: 600; padding: 0.4rem 0.9rem;">
              ⌚ Smartwatches
            </button>
            <a href="pages/deals.html" class="btn btn-outline btn-sm" style="border-radius: var(--radius-full); font-weight: 700; color: var(--deal-orange); border-color: rgba(234,88,12,0.4); padding: 0.4rem 0.9rem;">
              <i class="fa-solid fa-fire"></i> Today's Deals
            </a>
            <a href="pages/products.html" class="btn btn-primary btn-sm" style="border-radius: var(--radius-full); font-weight: 700; padding: 0.4rem 1rem;">
              Browse Full Catalog &rarr;
            </a>
          </div>
        </div>

        ${trending.length > 0 ? `
          <div style="grid-column: 1 / -1; margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h4 style="font-weight: 800; font-size: 1.2rem; color: var(--text); margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fa-solid fa-fire" style="color: var(--deal-orange);"></i> Popular Products You Might Like:
              </h4>
              <p style="font-size: 0.8rem; color: var(--muted); margin: 0.2rem 0 0;">Top verified trending products available right now</p>
            </div>
            <a href="pages/products.html" class="btn btn-outline btn-xs" style="font-weight: 700;">View All &rarr;</a>
          </div>
          ${trending.map(function(p) { return renderProductCard(p); }).join('')}
        ` : ''}
      `;

      // Attach instant click listeners to suggestion chips
      searchGrid.querySelectorAll('.home-notfound-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var targetQ = chip.getAttribute('data-query');
          window.executeHomeSearch(targetQ);
        });
      });
    }

    searchSection.style.display = "block";

    // Smooth scroll down to results section so user immediately sees their products
    setTimeout(function() {
      var headerOffset = 110;
      var elementPosition = searchSection.getBoundingClientRect().top;
      var offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }, 60);

    // Update browser URL cleanly without reload
    try {
      var newUrl = new URL(window.location.href);
      newUrl.searchParams.set("q", query);
      window.history.pushState({}, "", newUrl.toString());
    } catch(e) {}
  };

  window.clearHomeSearch = function() {
    if (!searchSection) return;
    searchSection.style.display = "none";
    headerInputs.forEach(function(inp) { inp.value = ""; });
    var deptSelect = document.getElementById("header-dept-select");
    if (deptSelect) deptSelect.value = "";
    try {
      var newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("q");
      window.history.pushState({}, "", newUrl.toString());
    } catch(e) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (clearBtn) {
    clearBtn.addEventListener("click", window.clearHomeSearch);
  }

  // Check if URL has ?q= on initial page load
  try {
    var initialParams = new URLSearchParams(window.location.search);
    var initialQ = initialParams.get("q");
    if (initialQ) {
      window.executeHomeSearch(initialQ);
    }
  } catch(e) {}

  // Trust Pillars Marquee Touch Pause & Interaction Handler
  var trustSlider = document.getElementById("ss-trust-slider");
  if (trustSlider) {
    var trustTrack = trustSlider.querySelector(".ss-trust-track");
    if (trustTrack) {
      var resumeTimeout = null;
      trustSlider.addEventListener("touchstart", function() {
        if (resumeTimeout) clearTimeout(resumeTimeout);
        trustTrack.classList.add("is-paused");
      }, { passive: true });
      trustSlider.addEventListener("touchend", function() {
        resumeTimeout = setTimeout(function() {
          trustTrack.classList.remove("is-paused");
        }, 1200);
      }, { passive: true });
    }
  }
});


