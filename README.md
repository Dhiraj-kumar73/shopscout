# ShopScout — Complete Production-Level Affiliate E-Commerce Platform

> **"Find Better. Buy Smarter."**  
> An independent product discovery and deal platform aggregating real-time offers from Amazon India.

---

## 1. Project Overview

ShopScout is an affiliate-driven product discovery platform. It is **not** a traditional online merchant:
- **No inventory or warehousing**: Products are sourced from legitimate external vendors.
- **No payments on-site**: Checkout, payment processing, fulfillment, and customer support are handled directly by Amazon India.
- **Transparent monetization**: Transparent affiliate disclosure in compliance with FTC and ASCI guidelines. Outbound affiliate redirection includes an interstitial notice confirming that ShopScout may earn a qualifying commission at zero additional cost to the shopper.

---

## 2. Directory Structure

```
shopscout/
├── index.html                           # Landing page with hero, categories, trending & deals
├── pages/
│   ├── products.html                    # Filterable catalog (category, price slider, rating, marketplace)
│   ├── product-details.html             # Multi-angle gallery, multi-store comparison, specs, price alerts
│   ├── categories.html                  # Interactive category cards with product counters
│   ├── deals.html                       # Flash sales, discount tiers, live ticking countdown
│   ├── compare.html                     # 4-slot side-by-side spec and price comparison matrix
│   ├── search.html                      # Real-time search with query highlight and empty states
│   ├── wishlist.html                    # Wishlist manager with stock status & quick actions
│   ├── about.html                       # Brand story, editorial independence & mission
│   ├── contact.html                     # Feedback & partnership inquiries
│   ├── privacy-policy.html              # Privacy compliance
│   ├── terms.html                       # Terms and conditions
│   └── affiliate-disclosure.html        # FTC/ASCI compliant affiliate transparency statement
├── admin/
│   ├── dashboard.html                   # High-level KPIs, recent outbound clicks, quick links
│   ├── products.html                    # Product CRUD table with add/edit modal & status toggles
│   ├── categories.html                  # Category manager with product counts
│   ├── users.html                       # Registered user monitoring
│   ├── deals.html                       # Deal scheduler and discount manager
│   └── analytics.html                   # Clicks by marketplace, CTR, and top categories
├── css/
│   ├── style.css                        # CSS variables, typography, reset & dark mode tokens
│   ├── components.css                   # Reusable buttons, badges, modals, toasts, compare drawer
│   ├── navbar.css                       # Sticky header, search suggestions, drawer, mobile bottom bar
│   ├── product-card.css                 # Single reusable product card with hover animations
│   ├── product-details.css              # Gallery, specs table, store comparison rows
│   ├── admin.css                        # Admin panel layout, stat cards, data tables
│   └── responsive.css                   # Responsive breakpoints (desktop, tablet, mobile)
├── js/
│   ├── main.js                          # Storage manager, dark mode, toasts, affiliate redirect modal
│   ├── navbar.js                        # Header search autocomplete, mobile drawer
│   ├── products.js                      # ProductService data fetcher, unified card renderer
│   ├── product-details.js               # Gallery switcher, multi-store price table, tabs
│   ├── search.js                        # Query parser, quick search pills, empty state
│   ├── filter.js                        # Range slider, checkbox filters, multi-sort
│   ├── compare.js                       # 4-product comparison table, best price badge, spec diffing
│   ├── wishlist.js                      # Wishlist persistence, counter badges, clear all
│   ├── deals.js                         # Deal countdown timer, tier switching
│   └── admin.js                         # Admin CRUD modals, click log viewer, simulated charts
├── data/
│   └── products.json                    # Authentic product dataset with multi-store prices & specs
└── README.md
```

---

## 3. Technology Stack & Design System

- **Frontend**: HTML5, Vanilla CSS3 (Custom Properties & Grid/Flexbox), Modern ES6+ JavaScript.
- **Iconography**: Font Awesome 6.
- **Typography**: Google Fonts (*Outfit* for headings, *Plus Jakarta Sans* for body).
- **Design Highlights**:
  - Full Dark Mode with persistent theme memory.
  - Interstitial Outbound Affiliate Redirect Modal (3-second auto-proceed with transparency notice).
  - Floating Comparison Drawer (auto-activates when 1–4 products are selected for comparison).
  - Responsive Bottom Bar on mobile devices.
  - Zero external CSS frameworks or heavy runtime libraries.

---

## 4. LocalStorage State Management

The frontend prototype is fully functional offline using `localStorage`:

| Key | Description |
|---|---|
| `shopscout_wishlist` | Array of saved product IDs |
| `shopscout_compare` | Array of up to 4 product IDs for comparison |
| `shopscout_alerts` | Map of product ID $\rightarrow$ `{ targetPrice, email, createdAt }` |
| `shopscout_theme` | `'light'` or `'dark'` mode preference |
| `shopscout_clicks` | Outbound affiliate redirect log `{ productName, marketplace, timestamp, url }` |
| `shopscout_custom_products` | Admin-created and edited products |
| `shopscout_user` | Current signed-in user profile |

---

## 5. Future Backend Architecture (Node.js / Express / MongoDB)

When migrating to a full-stack production backend:

### Models (Mongoose)
- `Product`: `name`, `slug`, `category`, `brand`, `price`, `originalPrice`, `marketplacePrices[]`, `affiliateUrl`, `specifications`, `status`
- `Category`: `name`, `icon`, `description`, `productCount`
- `User`: `name`, `email`, `passwordHash`, `wishlist[]`, `priceAlerts[]`, `role` (`user` / `admin`)
- `AffiliateClick`: `userId`, `productId`, `marketplace`, `ipHash`, `userAgent`, `timestamp`

### REST API Endpoints
```http
GET    /api/products               # Filter & paginate products
GET    /api/products/:id           # Single product with live prices
POST   /api/products               # Admin create product
PUT    /api/products/:id           # Admin update product
DELETE /api/products/:id           # Admin delete product

GET    /api/categories             # List categories
GET    /api/deals                  # Active deals & promotions

POST   /api/wishlist               # Toggle wishlist item
POST   /api/alerts                 # Set target price alert
POST   /api/affiliate/redirect     # Log outbound click & return signed affiliate URL
```

---

## 6. How to Run Locally

You can run ShopScout with any local HTTP server:

```bash
# Using Python
python -m http.server 3000

# Or using Node.js npx serve
npx serve .
```

Open `http://localhost:3000` in your web browser.
