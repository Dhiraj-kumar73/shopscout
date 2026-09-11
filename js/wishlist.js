/**
 * SHOPSCOUT — WISHLIST CONTROLLER
 */

const WishlistController = {
  async init() {
    this.renderWishlist();

    // Listen to wishlist updates
    window.addEventListener('shopscout:wishlist_updated', () => {
      this.renderWishlist();
    });
  },

  async renderWishlist() {
    const grid = document.getElementById('wishlist-grid');
    const countEl = document.getElementById('wishlist-count-header');
    if (!grid) return;

    const wishlistIds = ShopScout.getWishlist();
    if (countEl) {
      countEl.textContent = `${wishlistIds.length} saved item${wishlistIds.length === 1 ? '' : 's'}`;
    }

    if (wishlistIds.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1;">
          <div class="empty-state">
            <div class="empty-state-icon">
              <i class="fa-regular fa-heart"></i>
            </div>
            <h2 class="empty-state-title">Your wishlist is empty</h2>
            <p class="empty-state-desc">Save products you love to keep track of price drops and compare deals across marketplaces.</p>
            <a href="products.html" class="btn btn-primary">Discover Products</a>
          </div>
        </div>
      `;
      return;
    }

    const allProducts = await ProductService.getAllProducts();
    const wishlistedProducts = allProducts.filter(p => wishlistIds.includes(p.id));

    grid.innerHTML = wishlistedProducts.map(p => renderProductCard(p)).join('');
  },

  clearAll() {
    if (confirm('Are you sure you want to clear your entire wishlist?')) {
      localStorage.setItem(ShopScout.KEYS.WISHLIST, JSON.stringify([]));
      ShopScout.updateBadges();
      ShopScout.toast('Wishlist cleared', 'info');
      this.renderWishlist();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('wishlist.html')) {
    WishlistController.init();
  }
});
