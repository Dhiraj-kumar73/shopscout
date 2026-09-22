require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ─── PRODUCT AUTO-DETECTOR & EXTRACTOR API ───
const { extractProductDetails, resolveDirectAmazonUrl } = require('./services/productExtractor');

/**
 * POST /api/products/auto-detect
 * Body: { url, amazonUrl }
 * Scrapes & auto-extracts complete product specs, prices, images, features, description from Amazon India
 */
app.post('/api/products/auto-detect', async (req, res) => {
  try {
    delete require.cache[require.resolve('./services/productExtractor')];
    const { extractProductDetails } = require('./services/productExtractor');
    const { url, amazonUrl } = req.body;
    const targetUrl = url || amazonUrl;

    if (!targetUrl) {
      return res.status(400).json({ success: false, message: 'Please provide a valid product URL.' });
    }

    const data = await extractProductDetails(targetUrl);
    return res.status(200).json({
      success: true,
      message: 'Product details extracted successfully!',
      data
    });
  } catch (error) {
    console.error('Auto-detect error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-detect product details'
    });
  }
});

/**
 * GET /api/products/auto-detect?url=...
 */
app.all('/api/products/auto-detect', async (req, res) => {
  try {
    delete require.cache[require.resolve('./services/productExtractor')];
    const { extractProductDetails } = require('./services/productExtractor');
    const url = req.body?.url || req.query?.url;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Please provide a url.' });
    }

    const data = await extractProductDetails(url);
    return res.status(200).json({
      success: true,
      message: 'Product details extracted successfully!',
      data
    });
  } catch (error) {
    console.error('Auto-detect error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to auto-detect product details'
    });
  }
});

/**
 * POST /api/products/bulk-import-links
 * Takes an array of Amazon URLs, auto-extracts each and saves them in bulk
 */
app.post('/api/products/bulk-import-links', async (req, res) => {
  try {
    delete require.cache[require.resolve('./services/productExtractor')];
    const { extractProductDetails } = require('./services/productExtractor');
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of URLs.' });
    }

    const cleanUrls = urls.map(u => String(u).trim()).filter(u => u.length > 5);
    if (cleanUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid URLs found.' });
    }

    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try { products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8')); } catch (e) { products = []; }
    }
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try { permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8')); } catch (e) { permanentProducts = []; }
    }

    const importedProducts = [];

    for (const url of cleanUrls) {
      try {
        const details = await extractProductDetails(url);
        if (details && details.title) {
          const prodId = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const discount = Math.round(((details.originalPrice - details.price) / details.originalPrice) * 100);
          
          const newProd = {
            id: prodId,
            name: details.title,
            brand: details.brand || 'Amazon Brand',
            category: details.category || 'Gadgets',
            price: details.price,
            originalPrice: details.originalPrice,
            discount: Math.max(0, discount),
            marketplace: 'Amazon',
            affiliateUrl: details.affiliateUrl,
            amazonPrice: details.price,
            amazonUrl: details.affiliateUrl,
            image: details.image,
            gallery: details.gallery && details.gallery.length > 0 ? details.gallery : [details.image],
            rating: 4.6,
            reviewsCount: Math.floor(Math.random() * 300) + 85,
            badge: discount >= 20 ? 'Hot Deal' : 'Popular',
            isDeal: true,
            dealEndsInHours: 24,
            isTrending: true,
            status: 'Active',
            description: details.description,
            features: details.features,
            specifications: {
              "Brand": details.brand,
              "Model": details.title,
              "Category": details.category,
              "Warranty": "1 Year Official Warranty",
              "Marketplace Availability": "Amazon India Verified Store",
              "Condition": "Brand New, Factory Sealed"
            },
            marketplacePrices: details.marketplacePrices || [
              { store: 'Amazon Prime', price: details.price, originalPrice: details.originalPrice, url: details.affiliateUrl, inStock: true, badge: 'Best Deal' },
              { store: 'Amazon Standard', price: details.price, originalPrice: details.originalPrice, url: details.affiliateUrl, inStock: true, badge: 'Verified' }
            ],
            stores: details.stores || [
              { name: 'Amazon India', price: details.price, affiliateUrl: details.affiliateUrl, inStock: true }
            ],
            isUserCreated: true,
            isPermanent: true,
            author: 'Dhiraj Kumar (Founder)',
            savedAt: new Date().toISOString()
          };

          const existingIdx = products.findIndex(p => p.name.toLowerCase().trim() === newProd.name.toLowerCase().trim());
          if (existingIdx > -1) {
            products[existingIdx] = { ...products[existingIdx], ...newProd, id: products[existingIdx].id };
          } else {
            products.unshift(newProd);
          }

          const permIdx = permanentProducts.findIndex(p => p.name.toLowerCase().trim() === newProd.name.toLowerCase().trim());
          if (permIdx > -1) {
            permanentProducts[permIdx] = { ...permanentProducts[permIdx], ...newProd, id: permanentProducts[permIdx].id };
          } else {
            permanentProducts.unshift(newProd);
          }

          importedProducts.push(newProd);
        }
      } catch (err) {
        console.warn(`[BulkImport] Error importing URL "${url}":`, err.message);
      }
    }

    if (importedProducts.length > 0) {
      fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf8');
      fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
      fs.writeFile(PRODUCTS_BACKUP_PATH, JSON.stringify(products, null, 2), 'utf8', () => {});
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported and live-added ${importedProducts.length} products to store!`,
      importedCount: importedProducts.length,
      products: importedProducts,
      totalCatalogCount: products.length
    });
  } catch (error) {
    console.error('Bulk import links error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/products/bulk-import-category
 * 1-Click imports bestselling Amazon products by category or keyword
 */
app.post('/api/products/bulk-import-category', async (req, res) => {
  try {
    delete require.cache[require.resolve('./services/productExtractor')];
    const { getCategoryPresets, searchAmazonProducts, extractProductDetails } = require('./services/productExtractor');
    const { category = 'Mobiles', count = 6, keyword = '' } = req.body;

    const limit = Math.min(Math.max(Number(count) || 6, 1), 15);
    let urlsToFetch = [];

    if (keyword && keyword.trim()) {
      urlsToFetch = await searchAmazonProducts(keyword.trim(), limit);
    } else {
      urlsToFetch = getCategoryPresets(category, limit) || [];
    }

    if (urlsToFetch.length === 0) {
      urlsToFetch = getCategoryPresets('Mobiles', limit);
    }

    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try { products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8')); } catch (e) { products = []; }
    }
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try { permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8')); } catch (e) { permanentProducts = []; }
    }

    const importedProducts = [];

    for (const url of urlsToFetch) {
      try {
        const details = await extractProductDetails(url);
        if (details && details.title) {
          const prodId = `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const discount = Math.round(((details.originalPrice - details.price) / details.originalPrice) * 100);

          const newProd = {
            id: prodId,
            name: details.title,
            brand: details.brand || 'Amazon Brand',
            category: details.category || category,
            price: details.price,
            originalPrice: details.originalPrice,
            discount: Math.max(0, discount),
            marketplace: 'Amazon',
            affiliateUrl: details.affiliateUrl,
            amazonPrice: details.price,
            amazonUrl: details.affiliateUrl,
            image: details.image,
            gallery: details.gallery && details.gallery.length > 0 ? details.gallery : [details.image],
            rating: 4.6,
            reviewsCount: Math.floor(Math.random() * 300) + 120,
            badge: discount >= 20 ? 'Hot Deal' : 'Popular',
            isDeal: true,
            dealEndsInHours: 24,
            isTrending: true,
            status: 'Active',
            description: details.description,
            features: details.features,
            specifications: {
              "Brand": details.brand,
              "Model": details.title,
              "Category": details.category || category,
              "Warranty": "1 Year Official Warranty",
              "Marketplace Availability": "Amazon India Verified Store",
              "Condition": "Brand New, Factory Sealed"
            },
            marketplacePrices: details.marketplacePrices || [
              { store: 'Amazon Prime', price: details.price, originalPrice: details.originalPrice, url: details.affiliateUrl, inStock: true, badge: 'Best Deal' },
              { store: 'Amazon Standard', price: details.price, originalPrice: details.originalPrice, url: details.affiliateUrl, inStock: true, badge: 'Verified' }
            ],
            stores: details.stores || [
              { name: 'Amazon India', price: details.price, affiliateUrl: details.affiliateUrl, inStock: true }
            ],
            isUserCreated: true,
            isPermanent: true,
            author: 'Dhiraj Kumar (Founder)',
            savedAt: new Date().toISOString()
          };

          const existingIdx = products.findIndex(p => p.name.toLowerCase().trim() === newProd.name.toLowerCase().trim());
          if (existingIdx > -1) {
            products[existingIdx] = { ...products[existingIdx], ...newProd, id: products[existingIdx].id };
          } else {
            products.unshift(newProd);
          }

          const permIdx = permanentProducts.findIndex(p => p.name.toLowerCase().trim() === newProd.name.toLowerCase().trim());
          if (permIdx > -1) {
            permanentProducts[permIdx] = { ...permanentProducts[permIdx], ...newProd, id: permanentProducts[permIdx].id };
          } else {
            permanentProducts.unshift(newProd);
          }

          importedProducts.push(newProd);
        }
      } catch (err) {
        console.warn(`[CategoryImport] Error fetching "${url}":`, err.message);
      }
    }

    if (importedProducts.length > 0) {
      fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf8');
      fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
      fs.writeFile(PRODUCTS_BACKUP_PATH, JSON.stringify(products, null, 2), 'utf8', () => {});
    }

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${importedProducts.length} top Amazon products in "${category}"!`,
      importedCount: importedProducts.length,
      products: importedProducts,
      totalCatalogCount: products.length
    });
  } catch (error) {
    console.error('Category bulk import error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ─── AFFILIATE CONFIGURATION & MANAGEMENT ───
let currentAmazonTag = process.env.AMAZON_AFFILIATE_TAG || 'shopscout-21';

/**
 * GET /api/config/affiliate
 * Returns currently active affiliate tracking tags
 */
app.get('/api/config/affiliate', (req, res) => {
  return res.status(200).json({
    success: true,
    amazonTag: currentAmazonTag
  });
});

/**
 * POST /api/config/affiliate
 * Saves and updates live affiliate tracking tags & persists to .env
 */
app.post('/api/config/affiliate', (req, res) => {
  try {
    const { amazonTag } = req.body;
    if (amazonTag && amazonTag.trim()) currentAmazonTag = amazonTag.trim();

    process.env.AMAZON_AFFILIATE_TAG = currentAmazonTag;

    // Persist to .env
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    if (envContent.includes('AMAZON_AFFILIATE_TAG=')) {
      envContent = envContent.replace(/AMAZON_AFFILIATE_TAG=.*/, `AMAZON_AFFILIATE_TAG=${currentAmazonTag}`);
    } else {
      envContent += `\nAMAZON_AFFILIATE_TAG=${currentAmazonTag}`;
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');

    console.log(`🔑 [Affiliate Config] Updated tag: Amazon="${currentAmazonTag}"`);

    return res.status(200).json({
      success: true,
      message: 'Amazon Tag successfully updated and saved to system!',
      amazonTag: currentAmazonTag
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/products/direct-link
 * Query: { query: string }
 * Resolves the exact direct product buy page URL on Amazon
 */
app.get('/api/products/direct-link', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }
    const directUrl = await resolveDirectAmazonUrl(query, currentAmazonTag);

    return res.status(200).json({
      success: true,
      store: 'Amazon',
      directUrl
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── AUTOMATED PRICE SYNC SERVICE ───
const { syncAllProductPrices, startAutoSyncScheduler, getSyncStatus } = require('./services/priceSyncService');

/**
 * POST /api/products/sync-prices
 * Trigger immediate live price check against Amazon India
 */
app.post('/api/products/sync-prices', async (req, res) => {
  try {
    const result = await syncAllProductPrices();
    return res.status(200).json(result);
  } catch (error) {
    console.error('Price sync error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Price sync failed' });
  }
});

/**
 * GET /api/products/sync-status
 * Get current sync state, last checked time, and stats
 */
app.get('/api/products/sync-status', (req, res) => {
  return res.status(200).json({
    success: true,
    data: getSyncStatus()
  });
});

// ─── PERMANENT PRODUCT STORAGE VAULT (DHIRAJ KUMAR FOUNDER SUITE) ───
const PRODUCTS_JSON_PATH = path.join(__dirname, 'data', 'products.json');
const USER_PERMANENT_PATH = path.join(__dirname, 'data', 'user_products_permanent.json');
const PRODUCTS_BACKUP_PATH = path.join(__dirname, 'data', 'products.backup.json');

function isCleanAuthenticProduct(p) {
  if (!p || !p.name || typeof p.name !== 'string') return false;
  const n = p.name.toLowerCase();
  if (n.includes('<') || n.includes('>') || n.includes('onerror=') || n.includes('javascript:')) return false;
  return true;
}

/**
 * Ensures all products in user_products_permanent.json are safely injected into products.json
 */
function syncPermanentVault() {
  try {
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8'));
    }

    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
    }

    permanentProducts = permanentProducts.filter(isCleanAuthenticProduct);
    products = products.filter(isCleanAuthenticProduct);

    // Save immediate backup before modifying
    if (products.length > 0) {
      fs.writeFileSync(PRODUCTS_BACKUP_PATH, JSON.stringify(products, null, 2), 'utf8');
    }

    let mergedCount = 0;
    permanentProducts.forEach(pp => {
      const idx = products.findIndex(p => String(p.id) === String(pp.id));
      if (idx > -1) {
        products[idx] = { ...products[idx], ...pp, isUserCreated: true, isPermanent: true, author: 'Dhiraj Kumar (Founder)' };
      } else {
        products.unshift({ ...pp, isUserCreated: true, isPermanent: true, author: 'Dhiraj Kumar (Founder)' });
        mergedCount++;
      }
    });

    fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
    fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf8');
    console.log(`🛡️ [Vault] Catalog secured with ${products.length} authentic products.`);
  } catch (err) {
    console.error('Vault sync error:', err);
  }
}

/**
 * GET /api/products
 * Returns the active products catalog JSON
 */
app.get('/api/products', (req, res) => {
  try {
    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
    }
    return res.status(200).json(products);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load products' });
  }
});

/**
 * POST /api/products/save
 * Permanently saves/updates product directly into data/user_products_permanent.json AND data/products.json
 */
app.post('/api/products/save', (req, res) => {
  try {
    const productData = req.body;
    if (!productData || !productData.name) {
      return res.status(400).json({ success: false, message: 'Valid product data is required' });
    }

    const prodId = productData.id || `prod-${Date.now()}`;
    const productToSave = {
      ...productData,
      id: prodId,
      isUserCreated: true,
      isPermanent: true,
      author: 'Dhiraj Kumar (Founder)',
      savedAt: new Date().toISOString()
    };

    // 1. Save into Permanent Vault
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try {
        permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8'));
      } catch (e) { permanentProducts = []; }
    }
    const permIdx = permanentProducts.findIndex(p => String(p.id) === String(prodId));
    if (permIdx > -1) {
      permanentProducts[permIdx] = { ...permanentProducts[permIdx], ...productToSave };
    } else {
      permanentProducts.unshift(productToSave);
    }
    try {
      fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
    } catch (err) {
      console.warn('File write skipped on read-only serverless environment:', err.message);
    }

    // 2. Save into Main Products Catalog
    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try {
        products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
      } catch (e) { products = []; }
    }
    const existingIdx = products.findIndex(p => String(p.id) === String(prodId));
    if (existingIdx > -1) {
      products[existingIdx] = { ...products[existingIdx], ...productToSave };
    } else {
      products.unshift(productToSave);
    }
    try {
      fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf8');
      fs.writeFile(PRODUCTS_BACKUP_PATH, JSON.stringify(products, null, 2), 'utf8', () => {});
    } catch (err) {
      console.warn('File write skipped on read-only serverless environment:', err.message);
    }

    console.log(`✅ [Product Saved] Permanently stored "${productToSave.name}" in Vault & Disk Catalog.`);

    return res.status(200).json({
      success: true,
      message: 'Product permanently saved to Database & Permanent Vault! Never will be lost.',
      product: productToSave,
      totalCount: products.length,
      permanentCount: permanentProducts.length
    });
  } catch (error) {
    console.error('Save product error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save product' });
  }
});

/**
 * POST /api/products/sync-custom-products
 * Bulk persists any products from browser localStorage into Permanent Vault and products.json
 */
app.post('/api/products/sync-custom-products', (req, res) => {
  try {
    const { customProducts } = req.body;
    if (!Array.isArray(customProducts) || customProducts.length === 0) {
      return res.status(200).json({ success: true, message: 'No custom products to sync' });
    }
    const validProducts = customProducts.filter(isCleanAuthenticProduct);
    if (validProducts.length === 0) {
      return res.status(200).json({ success: true, message: 'All products already up to date' });
    }

    // 1. Update Permanent Vault
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try {
        permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8'));
      } catch (e) { permanentProducts = []; }
    }

    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try {
        products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
      } catch (e) { products = []; }
    }

    let addedCount = 0;
    validProducts.forEach(cp => {
      const securedProduct = {
        ...cp,
        isUserCreated: true,
        isPermanent: true,
        author: 'Dhiraj Kumar (Founder)',
        syncedAt: new Date().toISOString()
      };

      // In Vault
      const vIdx = permanentProducts.findIndex(p => String(p.id) === String(cp.id));
      if (vIdx > -1) {
        permanentProducts[vIdx] = { ...permanentProducts[vIdx], ...securedProduct };
      } else {
        permanentProducts.unshift(securedProduct);
      }

      // In Main Catalog
      const idx = products.findIndex(p => String(p.id) === String(cp.id));
      if (idx > -1) {
        products[idx] = { ...products[idx], ...securedProduct };
      } else {
        products.unshift(securedProduct);
        addedCount++;
      }
    });

    const existingProductsStr = fs.existsSync(PRODUCTS_JSON_PATH) ? fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8') : '';
    const newProductsStr = JSON.stringify(products, null, 2);

    if (addedCount > 0 || existingProductsStr !== newProductsStr) {
      fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
      fs.writeFileSync(PRODUCTS_JSON_PATH, newProductsStr, 'utf8');
      fs.writeFile(PRODUCTS_BACKUP_PATH, newProductsStr, 'utf8', () => {});
      console.log(`🛡️ [Vault] Synced and secured ${validProducts.length} products.`);
    }

    return res.status(200).json({
      success: true,
      message: `Permanently secured ${customProducts.length} products to Permanent Vault & Database!`,
      addedCount,
      permanentCount: permanentProducts.length,
      totalCount: products.length
    });
  } catch (error) {
    console.error('Sync custom products error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/products/permanent-status
 * Returns stats on permanent vault products vs total products
 */
app.get('/api/products/permanent-status', (req, res) => {
  try {
    let permanentProducts = [];
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try {
        permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8'));
      } catch (e) { permanentProducts = []; }
    }
    let products = [];
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try {
        products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
      } catch (e) { products = []; }
    }
    return res.status(200).json({
      success: true,
      permanentCount: permanentProducts.length,
      totalCount: products.length
    });
  } catch (err) {
    return res.status(200).json({ success: false, permanentCount: 0, totalCount: 0 });
  }
});

/**
 * DELETE & POST /api/products/:id or /api/products/delete
 * Delete a product from products.json and vault
 */
function handleProductDeletion(rawId, res) {
  try {
    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }
    const prodId = decodeURIComponent(String(rawId)).trim();

    // 1. Remove from Permanent Vault
    if (fs.existsSync(USER_PERMANENT_PATH)) {
      try {
        let permanentProducts = JSON.parse(fs.readFileSync(USER_PERMANENT_PATH, 'utf8'));
        permanentProducts = permanentProducts.filter(p => String(p.id).trim() !== prodId);
        fs.writeFileSync(USER_PERMANENT_PATH, JSON.stringify(permanentProducts, null, 2), 'utf8');
      } catch (e) {}
    }

    // 2. Remove from Main Products Catalog
    if (fs.existsSync(PRODUCTS_JSON_PATH)) {
      try {
        let products = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'));
        products = products.filter(p => String(p.id).trim() !== prodId);
        fs.writeFileSync(PRODUCTS_JSON_PATH, JSON.stringify(products, null, 2), 'utf8');
        fs.writeFileSync(PRODUCTS_BACKUP_PATH, JSON.stringify(products, null, 2), 'utf8');
      } catch (e) {}
    }

    console.log(`🗑️ [Product Deleted] Product ID: ${prodId}`);
    return res.json({ success: true, message: 'Product deleted successfully', prodId });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

app.delete('/api/products/:id', (req, res) => {
  return handleProductDeletion(req.params.id, res);
});

app.post('/api/products/delete', (req, res) => {
  return handleProductDeletion(req.body?.id, res);
});

/**
 * GET /api/config/affiliate
 * Returns active affiliate tags from .env
 */


// ─── Serve Static Frontend Files ───
app.use(express.static(__dirname));

// Fallback for clean URLs or root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server locally
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🚀 ShopScout Express Backend & Price Sync Server Live!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`🔐 APIs:`);
    console.log(`   - POST http://localhost:${PORT}/api/products/auto-detect`);
    console.log(`   - POST http://localhost:${PORT}/api/products/sync-prices`);
    console.log(`   - GET  http://localhost:${PORT}/api/products/sync-status`);
    console.log(`==================================================\n`);

    // Start automatic recurring background price sync (Every 6 hours)
    startAutoSyncScheduler(6);
  });
}

module.exports = app;
