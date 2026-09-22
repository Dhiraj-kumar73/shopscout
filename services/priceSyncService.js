/**
 * SHOPSCOUT — AUTOMATED PRICE SYNC SERVICE
 * 
 * Periodically checks products linked to Amazon India.
 * When an offer, price drop, or discount is detected on the original platform:
 *  1. Automatically updates the current price in data/products.json
 *  2. Updates MRP (originalPrice) and recalculates discount percentage
 *  3. Marks product as active deal if discount >= 20%
 *  4. Records lastPriceSync timestamp
 *  5. Provides manual on-demand trigger for Admin panel
 */

const fs = require('fs');
const path = require('path');
const { extractProductDetails } = require('./productExtractor');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

// In-memory sync state
const syncState = {
  isRunning: false,
  lastSyncTime: null,
  schedulerTimer: null,
  intervalHours: 6,
  lastStats: {
    totalChecked: 0,
    totalUpdated: 0,
    errors: 0,
    dealsFound: 0
  },
  recentLogs: []
};

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = `[${timestamp}] ${message}`;
  console.log(`⚡ [PriceSync] ${message}`);
  syncState.recentLogs.unshift(entry);
  if (syncState.recentLogs.length > 50) syncState.recentLogs.pop();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Perform full catalog price synchronization
 */
async function syncAllProductPrices(options = {}) {
  if (syncState.isRunning) {
    return {
      success: false,
      message: 'A price sync is already in progress.',
      stats: syncState.lastStats
    };
  }

  syncState.isRunning = true;
  addLog('Starting automated price synchronization with Amazon India...');

  let products = [];
  try {
    const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    products = JSON.parse(raw);
  } catch (err) {
    syncState.isRunning = false;
    addLog(`Error reading products database: ${err.message}`);
    return { success: false, message: 'Could not read products database' };
  }

  let checkedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;
  let dealsFound = 0;
  const updatedProducts = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const targetUrl = product.affiliateUrl || product.url || product.amazonUrl;

    // Skip items without an outbound marketplace URL
    if (!targetUrl || targetUrl.includes('placeholder') || !targetUrl.startsWith('http')) {
      continue;
    }

    checkedCount++;
    try {
      addLog(`Checking (${checkedCount}/${products.length}): "${product.name.slice(0, 40)}..."`);

      // Extract current live price from marketplace
      const liveData = await extractProductDetails(targetUrl);

      if (liveData && liveData.price && liveData.price > 0 && liveData.priceVerified) {
        const currentPrice = product.price;
        const livePrice = liveData.price;
        const liveMRP = liveData.originalPrice || product.originalPrice || currentPrice;

        // Check if price changed
        if (currentPrice !== livePrice) {
          const isPriceDrop = livePrice < currentPrice;
          const diff = currentPrice - livePrice;

          product.originalPrice = liveMRP > livePrice ? liveMRP : currentPrice;
          product.price = livePrice;
          product.discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

          if (product.discount >= 20 || isPriceDrop) {
            product.isDeal = true;
            dealsFound++;
          }

          product.lastPriceSync = new Date().toISOString();
          updatedCount++;

          if (isPriceDrop) {
            addLog(`🔥 Price Drop Detected on "${product.name.slice(0, 35)}": Old ₹${currentPrice.toLocaleString('en-IN')} ➔ New ₹${livePrice.toLocaleString('en-IN')} (Saved ₹${diff.toLocaleString('en-IN')} • ${product.discount}% OFF)`);
          } else {
            addLog(`ℹ️ Price updated on "${product.name.slice(0, 35)}": ₹${currentPrice.toLocaleString('en-IN')} ➔ ₹${livePrice.toLocaleString('en-IN')}`);
          }

          updatedProducts.push({
            id: product.id,
            name: product.name,
            oldPrice: currentPrice,
            newPrice: livePrice,
            discount: product.discount
          });
        } else {
          // Price unchanged, record sync timestamp
          product.lastPriceSync = new Date().toISOString();
        }
      }
    } catch (err) {
      errorCount++;
      addLog(`Failed to fetch live price for "${product.name.slice(0, 30)}": ${err.message}`);
    }

    // Polite delay between requests to protect IP
    await sleep(1200);
  }

  // Save updated products back to JSON
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
    addLog(`Database updated successfully! ${updatedCount} products updated out of ${checkedCount} checked.`);
  } catch (saveErr) {
    addLog(`Error saving updated products: ${saveErr.message}`);
  }

  syncState.isRunning = false;
  syncState.lastSyncTime = new Date().toISOString();
  syncState.lastStats = {
    totalChecked: checkedCount,
    totalUpdated: updatedCount,
    errors: errorCount,
    dealsFound
  };

  return {
    success: true,
    message: `Price sync completed. Checked ${checkedCount} products, updated ${updatedCount} prices.`,
    stats: syncState.lastStats,
    updatedProducts
  };
}

/**
 * Start the recurring background scheduler (runs every intervalHours)
 */
function startAutoSyncScheduler(intervalHours = 6) {
  syncState.intervalHours = intervalHours;

  if (syncState.schedulerTimer) {
    clearInterval(syncState.schedulerTimer);
  }

  const intervalMs = intervalHours * 60 * 60 * 1000;
  addLog(`Automatic background price sync scheduler initialized (Every ${intervalHours} hours).`);

  syncState.schedulerTimer = setInterval(() => {
    addLog(`Auto-sync trigger fired by scheduled timer.`);
    syncAllProductPrices().catch(err => {
      console.error('[PriceSync Scheduler Error]:', err);
    });
  }, intervalMs);
}

/**
 * Get current sync status
 */
function getSyncStatus() {
  return {
    isRunning: syncState.isRunning,
    lastSyncTime: syncState.lastSyncTime,
    intervalHours: syncState.intervalHours,
    stats: syncState.lastStats,
    recentLogs: syncState.recentLogs.slice(0, 15)
  };
}

module.exports = {
  syncAllProductPrices,
  startAutoSyncScheduler,
  getSyncStatus
};
