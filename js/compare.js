/**
 * SHOPSCOUT — 4-WAY PRODUCT COMPARISON CONTROLLER
 */

const CompareController = {
  async init() {
    this.renderComparisonTable();

    window.addEventListener('shopscout:compare_updated', () => {
      this.renderComparisonTable();
    });
  },

  async renderComparisonTable() {
    const container = document.getElementById('compare-table-container');
    if (!container) return;

    const compareIds = ShopScout.getCompare();
    const allProducts = await ProductService.getAllProducts();
    const comparedProducts = allProducts.filter(p => compareIds.includes(p.id));

    if (comparedProducts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-scale-balanced"></i>
          </div>
          <h2 class="empty-state-title">No products selected for comparison</h2>
          <p class="empty-state-desc">You can compare up to 4 products side-by-side on price, rating, marketplace offers, and specifications.</p>
          <a href="products.html" class="btn btn-primary">Browse Products to Compare</a>
        </div>
      `;
      return;
    }

    // Identify best price among compared
    const minPrice = Math.min(...comparedProducts.map(p => p.price));

    // Gather all unique specification keys
    const specKeys = new Set();
    comparedProducts.forEach(p => {
      if (p.specifications) {
        Object.keys(p.specifications).forEach(k => specKeys.add(k));
      }
    });

    const isPagesSubdir = window.location.pathname.includes('/pages/');
    const detailPrefix = isPagesSubdir ? 'product-details.html?id=' : 'pages/product-details.html?id=';

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <span style="font-weight: 600; color: var(--muted);">Comparing ${comparedProducts.length} of 4 products</span>
        <button class="btn btn-outline btn-sm" onclick="ShopScout.clearCompare()">Clear All</button>
      </div>

      <div class="table-responsive" style="border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface);">
        <table class="admin-table" style="min-width: 720px;">
          <thead>
            <tr>
              <th style="width: 220px;">Attribute</th>
              ${comparedProducts.map(p => `
                <th style="text-align: center; min-width: 200px;">
                  <div style="position: relative; display: inline-block;">
                    <button onclick="ShopScout.toggleCompare('${p.id}')" style="position: absolute; top: -6px; right: -6px; background: var(--surface-subtle); border: 1px solid var(--border); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--muted);" title="Remove">&times;</button>
                    <img src="${p.image}" alt="${p.name}" style="width: 100px; height: 100px; object-fit: contain; margin: 0 auto 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border);">
                  </div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: var(--text); line-height: 1.3;">
                    <a href="${detailPrefix}${p.id}">${p.name}</a>
                  </div>
                  <div style="font-size: 0.75rem; color: var(--muted); margin-top: 0.25rem;">${p.brand} &bull; ${p.category}</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            <!-- Price Row -->
            <tr>
              <td style="font-weight: 700;">Current Price</td>
              ${comparedProducts.map(p => {
                const isLowest = p.price === minPrice && comparedProducts.length > 1;
                return `
                  <td style="text-align: center;">
                    <div style="font-size: 1.25rem; font-weight: 800; color: ${isLowest ? 'var(--success)' : 'var(--text)'};">
                      ${ShopScout.formatPrice(p.price)}
                    </div>
                    ${isLowest ? '<span class="badge" style="background:#16A34A; color:#fff; font-size:0.65rem; margin-top:0.25rem;">Best Value</span>' : ''}
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- Original Price & Discount -->
            <tr>
              <td style="font-weight: 700;">MRP / Discount</td>
              ${comparedProducts.map(p => `
                <td style="text-align: center;">
                  <span style="color: var(--muted); text-decoration: line-through;">${ShopScout.formatPrice(p.originalPrice || p.price)}</span>
                  ${p.discount ? `<span class="badge badge-discount" style="margin-left: 0.5rem;">${p.discount}% OFF</span>` : ''}
                </td>
              `).join('')}
            </tr>

            <!-- Rating Row -->
            <tr>
              <td style="font-weight: 700;">User Rating</td>
              ${comparedProducts.map(p => `
                <td style="text-align: center;">
                  <span class="rating-pill"><i class="fa-solid fa-star" style="font-size: 0.65rem;"></i> ${p.rating || 4.5}</span>
                  <div style="font-size: 0.75rem; color: var(--muted); margin-top: 0.2rem;">${Number(p.reviewsCount || 0).toLocaleString('en-IN')} ratings</div>
                </td>
              `).join('')}
            </tr>

            <!-- Primary Store -->
            <tr>
              <td style="font-weight: 700;">Featured Marketplace</td>
              ${comparedProducts.map(p => `
                <td style="text-align: center;">
                  <span class="badge badge-store ${p.marketplace ? p.marketplace.toLowerCase() : 'amazon'}">${p.marketplace || 'Amazon'}</span>
                </td>
              `).join('')}
            </tr>

            <!-- Dynamic Specifications Rows -->
            ${Array.from(specKeys).map(key => `
              <tr>
                <td style="font-weight: 600; color: var(--muted);">${key}</td>
                ${comparedProducts.map(p => `
                  <td style="text-align: center; color: var(--text); font-size: 0.875rem;">
                    ${p.specifications && p.specifications[key] ? p.specifications[key] : '<span style="color: var(--muted-light);">&mdash;</span>'}
                  </td>
                `).join('')}
              </tr>
            `).join('')}

            <!-- Outbound Action Row -->
            <tr>
              <td style="font-weight: 700;">Purchase on Marketplace</td>
              ${comparedProducts.map(p => `
                <td style="text-align: center;">
                  <button class="btn btn-primary btn-sm" style="width: 100%;" onclick="ShopScout.openBuyModal('${p.id}')">
                    Buy Now <i class="fa-solid fa-arrow-up-right-from-square"></i>
                  </button>
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('compare.html')) {
    CompareController.init();
  }
});
