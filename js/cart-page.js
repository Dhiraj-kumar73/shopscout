/**
 * SHOPSCOUT — DEDICATED SHOPPING CART PAGE CONTROLLER
 * Manages full-page cart views, live quantity updates, order summary,
 * and bottom product recommendations for multi-item bundle orders.
 */

const CartPageController = {
  async init() {
    this.render();
    await this.renderRecommendations();

    // Listen to real-time cart changes
    window.addEventListener('shopscout:cart_updated', () => {
      this.render();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === CartService.STORAGE_KEY) {
        this.render();
      }
    });
  },

  render() {
    const cart = CartService.getCart();
    const totals = CartService.getTotals();

    this.renderItems(cart);
    this.renderSummary(totals);

    const clearBtn = document.getElementById('cart-clear-all-btn');
    if (clearBtn) {
      clearBtn.style.display = cart.length > 0 ? 'inline-flex' : 'none';
    }

    const headerSub = document.getElementById('cart-page-header-subtitle');
    if (headerSub) {
      headerSub.textContent = cart.length > 0
        ? `You have ${totals.itemCount} ${totals.itemCount === 1 ? 'item' : 'items'} in your cart. Ready to transfer to Amazon India in 1 click.`
        : 'Your cart is empty. Add products from below to buy them together on Amazon.';
    }
  },

  renderItems(cart) {
    const container = document.getElementById('cart-page-items-list');
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; color: var(--muted);">
          <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--surface-subtle); display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; color: var(--deal-orange); margin-bottom: 1.25rem;">
            <i class="fa-solid fa-basket-shopping"></i>
          </div>
          <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--text); margin-bottom: 0.5rem;">Your Cart is Empty</h3>
          <p style="font-size: 0.92rem; max-width: 420px; margin: 0 auto 1.5rem; line-height: 1.5;">
            Explore our curated products and deals below. Pick your favorites to bundle and checkout together on Amazon India!
          </p>
          <a href="products.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 0.65rem 1.5rem; border-radius: var(--radius-full);">
            <i class="fa-solid fa-layer-group"></i> Browse All Products
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = cart.map(item => {
      const itemSubtotal = item.price * item.quantity;
      const itemOriginalSubtotal = (item.originalPrice || item.price) * item.quantity;
      const savings = Math.max(0, itemOriginalSubtotal - itemSubtotal);
      const detailsUrl = `product-details.html?id=${encodeURIComponent(item.productId)}`;

      return `
        <div class="cart-page-item" id="cart-row-${item.cartItemId}">
          <div class="cart-page-thumb">
            <a href="${detailsUrl}">
              <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'">
            </a>
          </div>

          <div class="cart-page-info">
            <h4 class="cart-page-title">
              <a href="${detailsUrl}" title="${item.name}">${item.name}</a>
            </h4>
            ${item.variant && item.variant !== 'Standard' ? `<div class="cart-page-meta"><span>Variant: ${item.variant}</span></div>` : ''}
            
            <div class="cart-page-meta">
              <span class="stock-badge"><i class="fa-solid fa-circle-check"></i> In Stock</span>
              <span>•</span>
              <span><i class="fa-brands fa-amazon" style="color: #FF9900;"></i> Fulfilled by Amazon India</span>
            </div>

            <div class="cart-page-controls">
              <div class="cart-page-stepper">
                <button type="button" onclick="CartPageController.updateQty('${item.cartItemId}', -1)" title="Decrease Quantity">&minus;</button>
                <span>${item.quantity}</span>
                <button type="button" onclick="CartPageController.updateQty('${item.cartItemId}', 1)" title="Increase Quantity">&plus;</button>
              </div>

              <button type="button" class="cart-page-action-btn" onclick="CartPageController.removeItem('${item.cartItemId}')" title="Remove from Cart">
                <i class="fa-regular fa-trash-can"></i> Remove
              </button>

              <a href="${item.amazonUrl || item.affiliateUrl || '#'}" target="_blank" rel="noopener noreferrer" class="cart-page-single-buy" title="Buy this single item directly on Amazon">
                <i class="fa-brands fa-amazon"></i> Single Item <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.65rem;"></i>
              </a>
            </div>
          </div>

          <div class="cart-page-pricing">
            <span class="cart-page-price-current">₹${itemSubtotal.toLocaleString('en-IN')}</span>
            ${itemOriginalSubtotal > itemSubtotal ? `<span class="cart-page-price-original">₹${itemOriginalSubtotal.toLocaleString('en-IN')}</span>` : ''}
            ${savings > 0 ? `<span class="cart-page-price-save">Save ₹${savings.toLocaleString('en-IN')}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  renderSummary(totals) {
    const summaryContainer = document.getElementById('cart-page-summary-details');
    const checkoutBtn = document.getElementById('cart-page-amazon-checkout-btn');

    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="cart-bill-row">
          <span>Subtotal (${totals.itemCount} items):</span>
          <strong>₹${totals.originalTotal.toLocaleString('en-IN')}</strong>
        </div>
        ${totals.discount > 0 ? `
          <div class="cart-bill-row" style="color: #10B981;">
            <span>Marketplace Discount:</span>
            <strong>- ₹${totals.discount.toLocaleString('en-IN')}</strong>
          </div>
        ` : ''}
        <div class="cart-bill-row">
          <span>Estimated Delivery:</span>
          <strong style="color: #10B981;">FREE</strong>
        </div>
        <div class="cart-bill-row total">
          <span>Total Payable:</span>
          <span style="color: var(--text); font-size: 1.35rem; font-weight: 800;">₹${totals.total.toLocaleString('en-IN')}</span>
        </div>
      `;
    }

    if (checkoutBtn) {
      if (totals.itemCount > 0) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.pointerEvents = 'auto';
        checkoutBtn.innerHTML = `
          <i class="fa-brands fa-amazon" style="font-size: 1.3rem;"></i> 
          <span>Buy All on Amazon (${totals.itemCount} Items)</span> 
          <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.85rem;"></i>
        `;
      } else {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.pointerEvents = 'none';
        checkoutBtn.innerHTML = `
          <i class="fa-brands fa-amazon" style="font-size: 1.3rem;"></i> 
          <span>Cart is Empty</span>
        `;
      }
    }
  },

  async renderRecommendations() {
    const recGrid = document.getElementById('cart-recommended-grid');
    if (!recGrid) return;

    try {
      if (typeof ProductService === 'undefined') return;

      const allProducts = await ProductService.getAllProducts();
      const currentCart = CartService.getCart();
      const currentCartIds = new Set(currentCart.map(i => i.productId));

      // Filter products not currently in the cart
      let recs = allProducts.filter(p => !currentCartIds.has(p.id) && p.asin);
      if (recs.length < 4) {
        recs = allProducts.filter(p => !currentCartIds.has(p.id));
      }

      // Display up to 8 top recommended items
      const selectedRecs = recs.slice(0, 8);

      if (selectedRecs.length > 0) {
        recGrid.innerHTML = selectedRecs.map(product => renderProductCard(product)).join('');
      } else {
        recGrid.innerHTML = '<p style="color:var(--muted); grid-column:1/-1;">No more recommendations at this time.</p>';
      }
    } catch (e) {
      console.warn('Error rendering cart recommendations:', e);
    }
  },

  updateQty(cartItemId, delta) {
    CartService.updateQuantity(cartItemId, delta);
  },

  removeItem(cartItemId) {
    CartService.removeFromCart(cartItemId);
  },

  clearAll() {
    if (confirm('Are you sure you want to clear all items from your cart?')) {
      CartService.clearCart();
    }
  }
};

// Auto-boot on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CartPageController.init());
  } else {
    CartPageController.init();
  }
}
