/**
 * SHOPSCOUT - HOME PAGE SCRIPT
 * Renders all product grids on the homepage
 */

document.addEventListener("DOMContentLoaded", async function() {
  var allProducts = await ProductService.getAllProducts();

  // 1. Render Today Best Deals Grid
  var dealsGrid = document.getElementById("home-deals-grid");
  if (dealsGrid) {
    var deals = allProducts.filter(function(p) { return p.isDeal || (p.discount && p.discount >= 15); });
    var toRender = deals.length > 0 ? deals : allProducts;
    if (toRender.length > 0) {
      dealsGrid.innerHTML = toRender.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      dealsGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No deals found. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">Browse All</a></p></div>";
    }
  }

  // 2. Render Trending Products Grid
  var trendingGrid = document.getElementById("trending-products-grid");
  if (trendingGrid) {
    var trending = allProducts.filter(function(p) { return p.isTrending; });
    var toShow = trending.length > 0 ? trending : allProducts;
    if (toShow.length > 0) {
      trendingGrid.innerHTML = toShow.map(function(p) { return renderProductCard(p); }).join("");
    } else {
      trendingGrid.innerHTML = "<div style=\"grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)\"><p>No products yet. <a href=\"pages/products.html\" style=\"color:var(--primary);font-weight:700;\">View All</a></p></div>";
    }
  }

  // 3. Price Range Filter
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
      priceRangeGrid.innerHTML = filtered.map(function(p) { return renderProductCard(p); }).join("");
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
});
