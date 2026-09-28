/**
 * SHOPSCOUT ENGAGEMENT ENGINE
 * Feature 1: Countdown Timer
 * Feature 2: Social Proof Popups
 * Feature 3: WhatsApp Share Button
 * Feature 4: Amazon Trust Badges
 */

const ShopScoutEngagement = {
  _timerIntervals: [],

  getDealEndTime(productId) {
    const key = 'ss_deal_end_' + productId;
    let end = sessionStorage.getItem(key);
    if (!end || Number(end) < Date.now()) {
      const seed = String(productId).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const hoursLeft = 1 + (seed % 7);
      const minutesLeft = (seed * 3) % 60;
      end = Date.now() + (hoursLeft * 3600 + minutesLeft * 60) * 1000;
      sessionStorage.setItem(key, end);
    }
    return Number(end);
  },

  formatCountdown(ms) {
    if (ms <= 0) return null;
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = n => String(n).padStart(2, '0');
    return { h: pad(h), m: pad(m), s: pad(s), totalSecs };
  },

  injectProductPageTimer(product) {
    if (!product || document.getElementById('ss-deal-timer-bar')) return;
    const endTime = this.getDealEndTime(product.id);
    const discount = product.discount ||
      (product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);
    const bar = document.createElement('div');
    bar.id = 'ss-deal-timer-bar';
    bar.className = 'ss-deal-timer-bar';
    let html = '<div class="ss-timer-left">';
    html += '<span class="ss-timer-fire">&#9889;</span>';
    html += '<span class="ss-timer-label">Limited Time Deal</span>';
    if (discount > 0) html += '<span class="ss-timer-discount-badge">' + discount + '% OFF</span>';
    html += '</div>';
    html += '<div class="ss-timer-right">';
    html += '<span class="ss-timer-ends-text">Deal ends in:</span>';
    html += '<div class="ss-timer-digits">';
    html += '<div class="ss-timer-unit"><span id="ss-t-h">00</span><small>hrs</small></div>';
    html += '<div class="ss-timer-colon">:</div>';
    html += '<div class="ss-timer-unit"><span id="ss-t-m">00</span><small>min</small></div>';
    html += '<div class="ss-timer-colon">:</div>';
    html += '<div class="ss-timer-unit"><span id="ss-t-s">00</span><small>sec</small></div>';
    html += '</div></div>';
    bar.innerHTML = html;
    const priceBox = document.querySelector('.detail-price-box') ||
                     document.querySelector('.detail-action-buttons') ||
                     document.querySelector('.product-info-panel');
    if (priceBox) priceBox.parentNode.insertBefore(bar, priceBox);
    this._startCountdown('ss-t-h', 'ss-t-m', 'ss-t-s', endTime, bar);
  },

  _startCountdown(hId, mId, sId, endTime, bar) {
    const self = this;
    const tick = function() {
      const rem = endTime - Date.now();
      const fmt = self.formatCountdown(rem);
      if (!fmt) { if (bar) bar.style.display = 'none'; return; }
      const hEl = document.getElementById(hId);
      const mEl = document.getElementById(mId);
      const sEl = document.getElementById(sId);
      if (hEl) hEl.textContent = fmt.h;
      if (mEl) mEl.textContent = fmt.m;
      if (sEl) sEl.textContent = fmt.s;
      if (bar && fmt.totalSecs < 1800) bar.classList.add('urgent');
    };
    tick();
    this._timerIntervals.push(setInterval(tick, 1000));
  },

  addTimerToProductCards() {
    const self = this;
    document.querySelectorAll('[data-product-id]').forEach(function(card) {
      if (card.querySelector('.ss-card-timer')) return;
      const pid = card.getAttribute('data-product-id');
      if (!pid) return;
      const endTime = self.getDealEndTime(pid);
      const chip = document.createElement('div');
      chip.className = 'ss-card-timer';
      chip.innerHTML = '<i class="fa-solid fa-clock"></i> <span class="ss-ct-h">--</span>:<span class="ss-ct-m">--</span>:<span class="ss-ct-s">--</span> left';
      const badge = card.querySelector('.product-badge-row') || card.querySelector('.product-card-body') || card;
      badge.appendChild(chip);
      const tick = function() {
        const rem = endTime - Date.now();
        const fmt = self.formatCountdown(rem);
        if (!fmt) { chip.style.display = 'none'; return; }
        chip.querySelector('.ss-ct-h').textContent = fmt.h;
        chip.querySelector('.ss-ct-m').textContent = fmt.m;
        chip.querySelector('.ss-ct-s').textContent = fmt.s;
      };
      tick();
      self._timerIntervals.push(setInterval(tick, 1000));
    });
  },

  _NAMES: ['Rahul','Priya','Amit','Sneha','Rohit','Anjali','Vikram','Pooja','Suresh','Deepa','Kiran','Arjun','Kavita','Manish','Neha','Sanjay','Divya','Raj','Sunita','Arun','Meena','Vinod','Rekha','Gaurav'],
  _CITIES: ['Delhi','Mumbai','Bengaluru','Hyderabad','Chennai','Kolkata','Pune','Jaipur','Lucknow','Ahmedabad','Surat','Nagpur','Indore','Noida','Gurugram','Chandigarh','Kochi'],
  _ACTIONS: ['just bought','ordered','added to cart','purchased'],
  _TIMES: ['just now','2 mins ago','5 mins ago','8 mins ago','12 mins ago'],
  _currentProductName: null,

  initSocialProof(productName) {
    this._currentProductName = productName;
    if (document.getElementById('ss-social-toast')) return;
    const toastEl = document.createElement('div');
    toastEl.id = 'ss-social-toast';
    toastEl.className = 'ss-social-toast';
    let thtml = '<div class="ss-st-icon"><i class="fa-solid fa-fire"></i></div>';
    thtml += '<div class="ss-st-body">';
    thtml += '<div class="ss-st-name" id="ss-st-name">Rahul from Delhi</div>';
    thtml += '<div class="ss-st-action" id="ss-st-action">just bought this product</div>';
    thtml += '</div>';
    thtml += '<button class="ss-st-close" id="ss-toast-close-btn">x</button>';
    toastEl.innerHTML = thtml;
    document.body.appendChild(toastEl);
    document.getElementById('ss-toast-close-btn').addEventListener('click', function() {
      document.getElementById('ss-social-toast').classList.remove('visible');
    });
    const self = this;
    setTimeout(function() { self._showSocialPopup(); }, 7000);
    setInterval(function() { self._showSocialPopup(); }, 22000);
    this._injectViewersBadge();
  },

  _showSocialPopup() {
    const toast = document.getElementById('ss-social-toast');
    if (!toast) return;
    const name = this._NAMES[Math.floor(Math.random() * this._NAMES.length)];
    const city = this._CITIES[Math.floor(Math.random() * this._CITIES.length)];
    const action = this._ACTIONS[Math.floor(Math.random() * this._ACTIONS.length)];
    const time = this._TIMES[Math.floor(Math.random() * this._TIMES.length)];
    const shortName = this._currentProductName ? this._currentProductName.split(' ').slice(0, 3).join(' ') : 'this product';
    document.getElementById('ss-st-name').textContent = name + ' from ' + city;
    document.getElementById('ss-st-action').textContent = action + ' "' + shortName + '" - ' + time;
    toast.classList.add('visible');
    setTimeout(function() { toast.classList.remove('visible'); }, 5000);
  },

  _injectViewersBadge() {
    if (document.getElementById('ss-viewers-badge')) return;
    let viewers = 8 + Math.floor(Math.random() * 24);
    const badge = document.createElement('div');
    badge.id = 'ss-viewers-badge';
    badge.className = 'ss-viewers-badge';
    badge.innerHTML = '<span class="ss-vb-dot"></span> <strong>' + viewers + '</strong> people viewing this right now';
    const anchor = document.querySelector('.detail-action-buttons') || document.querySelector('.detail-price-box');
    if (anchor) anchor.parentNode.insertBefore(badge, anchor.nextSibling);
    setInterval(function() {
      viewers = Math.max(3, Math.min(50, viewers + (Math.random() > 0.5 ? 1 : -1)));
      const strong = badge.querySelector('strong');
      if (strong) strong.textContent = viewers;
    }, 7000);
  },

  AFFILIATE_TAG: 'dhirajkuma05e-21',

  buildShareUrl(product) {
    if (!product) return window.location.href;
    let amazonUrl = product.affiliateUrl || product.amazonUrl || '';
    if (amazonUrl) {
      if (amazonUrl.indexOf('tag=') !== -1) {
        amazonUrl = amazonUrl.replace(/tag=[^&]+/, 'tag=' + this.AFFILIATE_TAG);
      } else {
        amazonUrl += (amazonUrl.indexOf('?') !== -1 ? '&' : '?') + 'tag=' + this.AFFILIATE_TAG;
      }
    } else if (product.asin) {
      amazonUrl = 'https://www.amazon.in/dp/' + product.asin + '?tag=' + this.AFFILIATE_TAG;
    } else {
      amazonUrl = 'https://www.amazon.in/s?k=' + encodeURIComponent(product.name || '') + '&tag=' + this.AFFILIATE_TAG;
    }
    return amazonUrl;
  },

  buildWhatsAppMessage(product) {
    if (!product) return '';
    const discount = product.discount || (product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);
    const price = 'Rs.' + Number(product.price).toLocaleString('en-IN');
    const mrp = product.originalPrice > product.price ? '(MRP: Rs.' + Number(product.originalPrice).toLocaleString('en-IN') + ')' : '';
    const savings = product.originalPrice > product.price ? 'Save Rs.' + (product.originalPrice - product.price).toLocaleString('en-IN') + '!' : '';
    const link = this.buildShareUrl(product);
    let msg = 'LOOT DEAL on ShopScout!\n\n' + (product.name || '') + '\nPrice: ' + price + ' ' + mrp + '\n';
    if (discount > 0) msg += 'Discount: ' + discount + '% OFF ' + savings + '\n';
    msg += 'Available on: Amazon India\n\nBuy Now: ' + link + '\n\nShared via ShopScout';
    return msg;
  },

  injectShareButtons(product) {
    if (!product || document.getElementById('ss-share-section')) return;
    const self = this;
    const waMsg = this.buildWhatsAppMessage(product);
    const waUrl = 'https://wa.me/?text=' + encodeURIComponent(waMsg);
    const tgUrl = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(waMsg);
    const copyLink = this.buildShareUrl(product);
    const section = document.createElement('div');
    section.id = 'ss-share-section';
    section.className = 'ss-share-section';
    let shtml = '<div class="ss-share-label"><i class="fa-solid fa-share-nodes"></i> Share This Deal</div>';
    shtml += '<div class="ss-share-btns">';
    shtml += '<a class="ss-share-btn ss-wa-btn" id="ss-wa-share" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp"></i><span>WhatsApp</span></a>';
    shtml += '<a class="ss-share-btn ss-tg-btn" id="ss-tg-share" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-telegram"></i><span>Telegram</span></a>';
    shtml += '<button class="ss-share-btn ss-copy-btn" id="ss-copy-link-btn"><i class="fa-solid fa-link"></i><span>Copy Link</span></button>';
    shtml += '</div>';
    section.innerHTML = shtml;
    const anchor = document.querySelector('.detail-action-buttons');
    if (anchor) anchor.parentNode.insertBefore(section, anchor.nextSibling);
    const waEl = document.getElementById('ss-wa-share');
    if (waEl) waEl.href = waUrl;
    const tgEl = document.getElementById('ss-tg-share');
    if (tgEl) tgEl.href = tgUrl;
    const copyBtn = document.getElementById('ss-copy-link-btn');
    if (copyBtn) copyBtn.addEventListener('click', function() { self.copyDealLink(copyBtn, copyLink); });
  },

  copyDealLink(btnEl, url) {
    const self = this;
    const done = function() {
      if (!btnEl) return;
      const orig = btnEl.innerHTML;
      btnEl.innerHTML = '<i class="fa-solid fa-check"></i><span>Copied!</span>';
      btnEl.style.background = '#10B981'; btnEl.style.color = '#fff';
      setTimeout(function() { btnEl.innerHTML = orig; btnEl.style.background = ''; btnEl.style.color = ''; }, 2200);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      } catch(e) {}
      done();
    }
  },

  addShareToProductCards() {
    document.addEventListener('click', function(e) {
      const btn = e.target.closest('[data-wa-share]');
      if (!btn) return;
      const name = btn.getAttribute('data-name') || '';
      const price = btn.getAttribute('data-price') || '';
      const link = btn.getAttribute('data-link') || window.location.href;
      const msg = 'DEAL on ShopScout!\n\n' + name + '\n' + price + '\n\n' + link;
      window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    });
  },

  injectTrustBadges(product) {
    if (document.getElementById('ss-trust-badges')) return;
    const isElec = product && ['Mobiles','Laptops','Audio','Gadgets','Watches'].indexOf(product.category) !== -1;
    const section = document.createElement('div');
    section.id = 'ss-trust-badges';
    section.className = 'ss-trust-badges-section';
    let bhtml = '<div class="ss-tb-header"><i class="fa-solid fa-shield-halved"></i>';
    bhtml += '<span>100% Safe and Genuine - Fulfilled by Amazon India</span></div>';
    bhtml += '<div class="ss-trust-grid">';
    bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-amazon"><i class="fa-brands fa-amazon"></i></div><div class="ss-trust-text"><strong>Fulfilled by Amazon</strong><span>Stored, packed and shipped by Amazon</span></div></div>';
    bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-prime"><i class="fa-solid fa-bolt"></i></div><div class="ss-trust-text"><strong>Prime Delivery</strong><span>FREE 1-day delivery for Prime</span></div></div>';
    bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-cod"><i class="fa-solid fa-indian-rupee-sign"></i></div><div class="ss-trust-text"><strong>Cash on Delivery</strong><span>Pay on delivery - No advance needed</span></div></div>';
    bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-return"><i class="fa-solid fa-rotate-left"></i></div><div class="ss-trust-text"><strong>7-Day Easy Return</strong><span>Hassle-free, no questions asked</span></div></div>';
    if (isElec) {
      bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-warranty"><i class="fa-solid fa-certificate"></i></div><div class="ss-trust-text"><strong>Brand Warranty</strong><span>Official 1 Year warranty included</span></div></div>';
    }
    bhtml += '<div class="ss-trust-item"><div class="ss-trust-icon ss-ti-secure"><i class="fa-solid fa-lock"></i></div><div class="ss-trust-text"><strong>Secure Checkout</strong><span>256-bit encrypted Amazon payment</span></div></div>';
    bhtml += '</div>';
    bhtml += '<div class="ss-tb-footer"><i class="fa-brands fa-amazon"></i> Clicking Buy on Amazon takes you to official Amazon India product page.</div>';
    section.innerHTML = bhtml;
    const anchor = document.getElementById('ss-share-section') || document.querySelector('.detail-action-buttons');
    if (anchor) anchor.parentNode.insertBefore(section, anchor.nextSibling);
  },

  init(product) {
    if (product) this.injectProductPageTimer(product);
    const self = this;
    setTimeout(function() { self.addTimerToProductCards(); }, 2000);
    if (product) this.initSocialProof(product.name);
    if (product) setTimeout(function() { self.injectShareButtons(product); }, 400);
    this.addShareToProductCards();
    if (product) setTimeout(function() { self.injectTrustBadges(product); }, 600);
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.indexOf('product-details') === -1) {
      setTimeout(function() { ShopScoutEngagement.addTimerToProductCards(); }, 2000);
      ShopScoutEngagement.addShareToProductCards();
    }
  });
}
