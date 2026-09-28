/**
 * SHOPSCOUT - HOME PAGE SCRIPT
 * Renders all product grids on the homepage
 */

document.addEventListener("DOMContentLoaded", async function() {
  var allProducts = await ProductService.getAllProducts();

  // 1. Render Today Best Deals Grid (Top 10 curated deals)
  var dealsGrid = document.getElementById("home-deals-grid");
  if (dealsGrid) {
    var deals = allProducts.filter(function(p) { return p.isDeal || (p.discount && p.discount >= 15); });
    var toRender = (deals.length > 0 ? deals : allProducts).slice(0, 10);
    if (toRender.length > 0) {
      dealsGrid.innerHTML = toRender.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      dealsGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No deals found. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">Browse All</a></p></div>";
    }
  }

  // 2. Render Trending Products Grid (Top 8 trending)
  var trendingGrid = document.getElementById("trending-products-grid");
  if (trendingGrid) {
    var trending = allProducts.filter(function(p) { return p.isTrending; });
    var toShow = (trending.length > 0 ? trending : allProducts).slice(0, 8);
    if (toShow.length > 0) {
      trendingGrid.innerHTML = toShow.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      trendingGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No products yet. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">View All</a></p></div>";
    }
  }

  // 3. Price Range Filter (Top 10 in selected range)
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
      var topFiltered = filtered.slice(0, 10);
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
      searchGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 2.2rem; color: var(--deal-orange); margin-bottom: 0.5rem;"><i class="fa-solid fa-magnifying-glass"></i></div>
          <h3 style="font-weight: 800; color: var(--text); margin-bottom: 0.5rem;">No exact products found for "${query}"</h3>
          <p style="color: var(--muted); font-size: 0.88rem; max-width: 500px; margin: 0 auto 1.5rem;">Try searching for popular terms like <strong>Mobile, Samsung, iPhone, Laptops, Audio, or boAt</strong>.</p>
          <a href="pages/products.html" class="btn btn-primary btn-sm">Browse Full Catalog</a>
        </div>
      `;
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
});

