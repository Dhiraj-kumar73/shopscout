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

  // Initial render
  renderPriceRange(0, 999999, "All Best Deals");
});
