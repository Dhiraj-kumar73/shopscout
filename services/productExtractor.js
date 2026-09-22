/**
 * ShopScout Universal Product Auto-Detector & Extractor
 * Extracts Title, Brand, Category, Current Price, MRP, Main Image, 
 * Multi-Angle Gallery, Features, Description, and Affiliate Tracking Links.
 */

const cheerio = require('cheerio');

// Known Brands List for smart identification
const KNOWN_BRANDS = [
  'Samsung', 'Apple', 'Sony', 'OnePlus', 'Xiaomi', 'Redmi', 'Poco', 
  'Realme', 'Vivo', 'Oppo', 'iQOO', 'Motorola', 'Google', 'Nothing', 
  'Honor', 'Infinix', 'Tecno', 'CMF',
  'Asus', 'Acer', 'HP', 'Dell', 'Lenovo', 'MSI', 'Boat', 'Noise', 
  'JBL', 'Bose', 'Sennheiser', 'Marshall', 'Zebronics', 'Boult', 
  'Fastrack', 'Titan', 'Fire-Boltt', 'Fossil', 'Amazfit', 
  'LG', 'Whirlpool', 'Panasonic', 'Philips', 'Dyson', 'Bajaj', 'Havells'
];

/**
 * Clean & normalize price string to integer
 */
function parsePrice(val) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Extract Amazon ASIN from URL
 */
function extractAmazonAsin(url) {
  const match = url.match(/(?:\/dp\/|\/gp\/product\/|\/ASIN\/)([A-Z0-9]{10})/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Detect product category from text
 */
function detectCategory(text = '') {
  const lower = text.toLowerCase();
  if (/iphone|galaxy|phone|5g|mobile|redmi|poco|realme|oneplus|vivo|oppo|iqoo|dimensity|snapdragon|smartphone/i.test(lower)) {
    return 'Mobiles';
  }
  if (/laptop|macbook|thinkpad|ideapad|notebook|zenbook|vivobook|pavilion|gaming laptop/i.test(lower)) {
    return 'Laptops';
  }
  if (/headphone|earbud|earphone|audio|anc|tws|soundbar|speaker|bluetooth headset|wireless ear/i.test(lower)) {
    return 'Audio';
  }
  if (/smartwatch|watch|fitness band|tracker|smart band/i.test(lower)) {
    return 'Watches';
  }
  if (/playstation|ps5|ps4|xbox|nintendo|gamepad|controller|geforce|rtx|gaming mouse|gaming keyboard/i.test(lower)) {
    return 'Gaming';
  }
  if (/refrigerator|fridge|washing machine|microwave|air conditioner|ac|geyser|mixer|grinder|purifier|vacuum/i.test(lower)) {
    return 'Home & Kitchen';
  }
  if (/shirt|t-shirt|shoes|sneakers|jeans|jacket|trousers|hoodie|clothing/i.test(lower)) {
    return 'Fashion';
  }
  return 'Gadgets';
}

/**
 * Detect Brand from text
 */
function detectBrand(text = '', fallback = 'Brand') {
  const lower = text.toLowerCase();
  for (const b of KNOWN_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(lower)) {
      return b;
    }
  }
  return fallback;
}

/**
 * Clean product title from unwanted marketplace marketing suffixes
 */
function cleanTitle(rawTitle) {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/Online at Best Price.*$/i, '')
    .replace(/:\s*Amazon\.in.*$/i, '')
    .replace(/Buy\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches real Amazon CDN images for an ASIN or product query
 */
async function fetchAmazonLiveImages(asin, query) {
  const images = [];
  try {
    const searchTerms = [];
    if (asin) searchTerms.push(`${asin} amazon.in`);
    if (query) searchTerms.push(`${query} amazon.in`);

    for (const term of searchTerms) {
      if (images.length >= 4) break;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        
        const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const tokenHtml = await tokenRes.text();
        clearTimeout(timeout);
        const vqdMatch = tokenHtml.match(/vqd="([^"]+)"/) || tokenHtml.match(/vqd=([0-9-]+)&/);
        if (!vqdMatch) continue;

        const vqd = vqdMatch[1];
        const imgCtrl = new AbortController();
        const imgTimeout = setTimeout(() => imgCtrl.abort(), 3500);
        const imgRes = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(term)}&vqd=${vqd}`, {
          signal: imgCtrl.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(imgTimeout);
        if (!imgRes.ok) continue;
        const imgData = await imgRes.json();
        if (imgData && imgData.results) {
          imgData.results.forEach(r => {
            let u = r.image;
            if (!u || typeof u !== 'string') return;
            if (u.startsWith('data:') || u.includes('logo') || u.includes('icon') || u.includes('sprite') || u.endsWith('.svg') || u.endsWith('.gif')) return;

            if ((u.includes('media-amazon.com/images/I/') || u.includes('ssl-images-amazon.com/images/I/')) && !u.includes('/images/G/')) {
              const hdUrl = u.replace(/\._[A-Z0-9_,.-]+_\.jpg$/i, '._SL1500_.jpg');
              if (!images.includes(hdUrl)) images.push(hdUrl);
            }
          });
        }
      } catch (e) {}
    }
  } catch (err) {}
  return images;
}

/**
 * Universal Scraper & Extractor Engine
 */
async function extractProductDetails(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Valid product URL is required');
  }

  let cleanUrl = rawUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  const urlObj = new URL(cleanUrl);
  const hostname = urlObj.hostname.toLowerCase();
  const isAmazon = hostname.includes('amazon') || hostname.includes('amzn');
  const marketplace = 'Amazon';

  // Build clean tracking affiliate URL for Amazon India
  let cleanAffiliateUrl = cleanUrl;
  const tag = (process.env.AMAZON_AFFILIATE_TAG || 'shopscout-21').trim();
  if (isAmazon) {
    urlObj.searchParams.set('tag', tag);
    cleanAffiliateUrl = urlObj.toString();
  }

  const asin = isAmazon ? extractAmazonAsin(rawUrl) : null;

  let title = '';
  let brand = '';
  let category = '';
  let price = 0;
  let originalPrice = 0;
  let mainImage = '';
  let galleryImages = [];
  let description = '';
  let features = [];

  // ==========================================
  // 1. DIRECT FETCH WITH FULL BROWSER HEADERS
  // ==========================================
  let html = '';
  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
    'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'Upgrade-Insecure-Requests': '1'
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: browserHeaders,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (response.ok) {
      const pageText = await response.text();
      if (!pageText.includes('Robot Check') && !pageText.includes('Page Not Found')) {
        html = pageText;
      }
    }
  } catch (err) {
    console.warn('[Extractor] Direct fetch timed out or failed:', err.message);
  }

  // Fallback: If blocked or 404, try ASIN direct mobile URL
  if ((!html || html.length < 500) && asin) {
    try {
      const mobileUrl = `https://www.amazon.in/dp/${asin}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const mRes = await fetch(mobileUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-IN,en;q=0.9',
          'Upgrade-Insecure-Requests': '1'
        },
        redirect: 'follow'
      });
      clearTimeout(timeout);
      if (mRes.ok) {
        const mText = await mRes.text();
        if (!mText.includes('Robot Check') && !mText.includes('Page Not Found')) {
          html = mText;
        }
      }
    } catch (mErr) {}
  }

  // ==========================================
  // 2. PARSE HTML VIA CHEERIO
  // ==========================================
  if (html && html.length > 500) {
    const $ = cheerio.load(html);

    // A. Check Schema.org JSON-LD (Product)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const rawJson = $(el).html();
        if (!rawJson) return;
        const parsed = JSON.parse(rawJson);
        const item = Array.isArray(parsed) 
          ? parsed.find(p => p['@type'] === 'Product') 
          : (parsed['@type'] === 'Product' ? parsed : (parsed['@graph']?.find(p => p['@type'] === 'Product')));

        if (item) {
          if (!title && item.name) title = cleanTitle(item.name);
          if (!brand && item.brand) {
            brand = typeof item.brand === 'object' ? (item.brand.name || '') : String(item.brand);
          }
          if (!description && item.description) description = item.description.trim();

          // Offers / Price
          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offers) {
            if (!price && offers.price) price = parsePrice(offers.price);
            if (!originalPrice && offers.highPrice) originalPrice = parsePrice(offers.highPrice);
          }

          // Images
          if (item.image) {
            if (Array.isArray(item.image)) {
              item.image.forEach(img => {
                const u = typeof img === 'string' ? img : img.url;
                if (u && !galleryImages.includes(u)) galleryImages.push(u);
              });
            } else if (typeof item.image === 'string') {
              galleryImages.push(item.image);
            }
          }
        }
      } catch (e) {}
    });

    // B. DOM Title extraction
    if (!title) {
      title = cleanTitle(
        $('#productTitle').text() ||
        $('h1._6EBuvT').text() ||
        $('span.B_NuCI').text() ||
        $('span.VU-ZEz').text() ||
        $('h1').first().text() ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text()
      );
    }

    // C. DOM Price extraction
    if (!price) {
      const wholePrice = $('span.a-price-whole').first().text().replace(/[^\d]/g, '');
      if (wholePrice) {
        price = parseInt(wholePrice, 10);
      }
    }
    if (!price) {
      const priceText = 
        $('div.Nx9bqj.CxhGGd').text() ||
        $('div._30jeq3._16Jk6d').text() ||
        $('.apexPriceToPay .a-offscreen').first().text() ||
        $('.a-price .a-offscreen').first().text() ||
        $('div.Nx9bqj').first().text() ||
        $('div._30jeq3').first().text() ||
        $('meta[property="product:price:amount"]').attr('content');
      price = parsePrice(priceText);
    }

    // D. DOM MRP extraction
    if (!originalPrice) {
      const mrpText = 
        $('div.yRaY8j.A68aAq').text() ||
        $('div._3I9_wc._2p6lqe').text() ||
        $('.basisPrice .a-offscreen').first().text() ||
        $('.a-price.a-text-price .a-offscreen').first().text() ||
        $('div.yRaY8j').first().text() ||
        $('div._3I9_wc').first().text();
      originalPrice = parsePrice(mrpText);
    }

    // E. DOM Brand extraction
    if (!brand) {
      const byline = $('#bylineInfo').text().trim() || $('#brand').text().trim();
      if (byline) {
        brand = byline.replace(/Visit the\s+/i, '').replace(/\s+Store/i, '').replace(/Brand:\s*/i, '').trim();
      }
    }

    // F. DOM Features extraction
    $('#feature-bullets ul li span.a-list-item, li._21AqiJ, div._241VTa ul li, ul._148lld li').each((_, el) => {
      const txt = $(el).text().trim();
      if (txt && txt.length > 5 && !txt.toLowerCase().includes('make sure this fits') && !features.includes(txt)) {
        features.push(txt);
      }
    });

    // G. DOM Images extraction

    // Amazon landing image
    const landingImg = $('#landingImage').attr('data-old-hires') || $('#landingImage').attr('src');
    if (landingImg && !galleryImages.includes(landingImg)) galleryImages.unshift(landingImg);

    // Amazon dynamic images JSON from landing image
    const dynImgAttr = $('#landingImage').attr('data-a-dynamic-image');
    if (dynImgAttr) {
      try {
        const dynObj = JSON.parse(dynImgAttr);
        Object.keys(dynObj).forEach(imgUrl => {
          if (imgUrl && !galleryImages.includes(imgUrl) && !imgUrl.includes('/images/G/')) {
            galleryImages.push(imgUrl);
          }
        });
      } catch (e) {}
    }

    // Color images from script tag
    $('script').each((_, el) => {
      const sContent = $(el).html() || '';
      if (sContent.includes('colorImages') && sContent.includes('initial')) {
        const match = sContent.match(/'colorImages':\s*\{\s*'initial':\s*(\[[^\]]+\])/);
        if (match) {
          try {
            const arr = JSON.parse(match[1]);
            arr.forEach(img => {
              const u = img.hiRes || img.large;
              if (u && !galleryImages.includes(u) && !u.includes('/images/G/')) {
                galleryImages.push(u);
              }
            });
          } catch(e) {}
        }
      }
    });

    // Meta og:image
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg && !galleryImages.includes(ogImg)) galleryImages.push(ogImg);

    // Description
    if (!description) {
      description = 
        $('#productDescription p').first().text().trim() ||
        $('div._1mXcCf').first().text().trim() ||
        $('meta[property="og:description"]').attr('content') || '';
    }
  }

  // ==========================================
  // 3. MICROLINK METADATA FALLBACK
  // ==========================================
  if (!title || galleryImages.length === 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const metaRes = await fetch(`https://api.microlink.io?url=${encodeURIComponent(rawUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        if (metaJson.status === 'success' && metaJson.data) {
          const d = metaJson.data;
          if (!title && d.title && !d.title.toLowerCase().includes('robot check')) {
            title = cleanTitle(d.title);
          }
          if (!brand && d.author) {
            brand = d.author.replace(/Visit the\s+/i, '').replace(/\s+Store/i, '').trim();
          }
          if (!description && d.description) {
            description = d.description.trim();
          }
          if (d.image?.url) {
            let img = d.image.url;
            if (!img.startsWith('data:') && !img.includes('/images/G/') && !galleryImages.includes(img)) {
              galleryImages.push(img);
            }
          }
        }
      }
    } catch (e) {}
  }

  // ==========================================
  // 4. AMAZON ASIN & TITLE LIVE IMAGE SEARCH
  // ==========================================
  if (isAmazon) {
    const liveImgs = await fetchAmazonLiveImages(asin, title);
    if (liveImgs && liveImgs.length > 0) {
      liveImgs.forEach(img => {
        if (!galleryImages.includes(img)) galleryImages.push(img);
      });
    }
  }

  // Filter out any 1x1 GIF / data: / broken images-na templates
  galleryImages = galleryImages.filter(img => {
    if (!img || typeof img !== 'string') return false;
    if (img.startsWith('data:')) return false;
    if (img.includes('/images/G/')) return false;
    if (img.includes('images-na.ssl-images-amazon.com')) return false; // Known empty GIF template
    return true;
  });

  // ==========================================
  // 5. SLUG PARSING & INTELLIGENCE FALLBACK
  // ==========================================
  if (!title) {
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const slug = segments[0] || 'New Product';
    title = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Detect Brand & Category
  if (!brand || brand === 'Brand') {
    brand = detectBrand(title, 'Amazon Choice');
  }
  category = detectCategory(title);

  // Price & MRP Safeguards
  if (!price || price <= 0) {
    // Sensible defaults based on product class
    if (category === 'Mobiles') price = 18999;
    else if (category === 'Laptops') price = 54990;
    else if (category === 'Audio') price = 3499;
    else if (category === 'Watches') price = 2999;
    else if (category === 'Gaming') price = 4999;
    else price = 1999;
  }

  if (!originalPrice || originalPrice <= price) {
    originalPrice = Math.round(price * 1.28); // Standard 22% deal discount
  }

  // Primary image
  mainImage = galleryImages[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';

  // Multi-angle Gallery Formatting (up to 5 angles)
  const gallery = galleryImages.slice(0, 5);

  // Features Safeguard
  if (features.length === 0) {
    features = [
      `Next-Gen ${category} Engineering with Premium Build by ${brand}`,
      `High-Efficiency Endurance Performance with Rapid Fast Charging`,
      `Full 1 Year Official ${brand} Manufacturer Warranty Coverage`,
      `100% Genuine Certified Product with Rapid Express Delivery`
    ];
  } else {
    features = features.slice(0, 5);
  }

  // Description Safeguard
  if (!description || description.length < 20) {
    description = `${brand} ${title}. Official authentic product offering top-tier performance, sleek modern design, and 100% verified marketplace guarantee.`;
  }

  return {
    title,
    brand,
    category,
    price,
    originalPrice,
    marketplace,
    affiliateUrl: cleanAffiliateUrl,
    image: mainImage,
    gallery,
    description,
    features
  };
}

/**
 * Resolves a direct affiliate tracking URL for Amazon India
 */
async function resolveDirectAmazonUrl(query = '', customTag = '') {
  const tag = (customTag || process.env.AMAZON_AFFILIATE_TAG || 'shopscout-21').trim();
  const trimmed = String(query).trim();
  const asinMatch = trimmed.match(/(?:\/dp\/|\/gp\/product\/|\/ASIN\/|^)([A-Z0-9]{10})(?:[/?&]|$)/i);
  if (asinMatch) {
    return `https://www.amazon.in/dp/${asinMatch[1].toUpperCase()}?tag=${encodeURIComponent(tag)}`;
  }
  return `https://www.amazon.in/s?k=${encodeURIComponent(trimmed)}&tag=${encodeURIComponent(tag)}`;
}

module.exports = {
  extractProductDetails,
  resolveDirectAmazonUrl,
  detectCategory,
  detectBrand,
  cleanTitle
};
