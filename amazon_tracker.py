"""
Amazon India Real-Time Price Tracker & Flask REST API
Author: ShopScout / Dhiraj Kumar
Database: SQLite (Zero configuration needed)
Backend: Python Flask + BeautifulSoup4 + Requests
"""

import re
import time
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

DB_FILE = "price_tracker.db"

# ─────────────────────────────────────────────────────────────────────────────
# 1. DATABASE SETUP (SQLite)
# ─────────────────────────────────────────────────────────────────────────────
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Products table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tracked_products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asin TEXT UNIQUE,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            current_price REAL NOT NULL,
            original_price REAL,
            image_url TEXT,
            last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Price history table (for tracking price drops over time)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            price REAL NOT NULL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES tracked_products(id)
        )
    """)
    conn.commit()
    conn.close()

# ─────────────────────────────────────────────────────────────────────────────
# 2. AMAZON INDIA SCRAPER (BeautifulSoup)
# ─────────────────────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
}

def extract_asin(url):
    match = re.search(r"(?:/dp/|/gp/product/|/)([B0][A-Z0-9]{9})", url)
    return match.group(1).upper() if match else None

def clean_price(text):
    if not text:
        return None
    # Remove currency symbol, commas, whitespace
    cleaned = re.sub(r"[^\d.]", "", text.replace(",", ""))
    try:
        return float(cleaned)
    except ValueError:
        return None

def scrape_amazon_product(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        if response.status_code != 200:
            return None, f"Amazon responded with status: {response.status_code}"

        soup = BeautifulSoup(response.content, "html.parser")

        # 1. Product Title
        title_el = soup.select_one("#productTitle")
        title = title_el.get_text(strip=True) if title_el else "Amazon Product"

        # 2. Current Price (multiple Amazon India selector fallbacks)
        price = None
        selectors = [
            ".priceToPay .a-price-whole",
            ".apexPriceToPay .a-offscreen",
            "#corePrice_desktop .a-price .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-price-whole",
            "#priceblock_dealprice",
            "#priceblock_ourprice",
            ".a-price .a-offscreen",
        ]
        for sel in selectors:
            el = soup.select_one(sel)
            if el:
                val = clean_price(el.get_text(strip=True))
                if val and val > 0:
                    price = val
                    break

        # 3. Original Price (M.R.P.)
        mrp = None
        mrp_el = soup.select_one(
            ".basisPrice .a-offscreen, #corePriceDisplay_desktop_feature_div .a-text-price .a-offscreen"
        )
        if mrp_el:
            mrp = clean_price(mrp_el.get_text(strip=True))

        # 4. Product Image
        image_url = None
        img_el = soup.select_one("#landingImage, #imgBlkFront")
        if img_el:
            image_url = img_el.get("src") or img_el.get("data-old-hires")

        asin = extract_asin(url) or f"ASIN-{int(time.time())}"

        if not price:
            return None, "Could not extract price. Amazon may be presenting a CAPTCHA."

        return {
            "asin": asin,
            "title": title,
            "url": url,
            "current_price": price,
            "original_price": mrp or price,
            "image_url": image_url or "https://via.placeholder.com/300"
        }, None

    except Exception as e:
        return None, str(e)

# ─────────────────────────────────────────────────────────────────────────────
# 3. RELATIVE TIME HELPER ("Updated 5 mins ago")
# ─────────────────────────────────────────────────────────────────────────────
def get_relative_time(timestamp_str):
    try:
        dt = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
        diff = datetime.utcnow() - dt
        seconds = int(diff.total_seconds())

        if seconds < 60:
            return "Updated just now"
        elif seconds < 3600:
            mins = seconds // 60
            return f"Updated {mins} min{'s' if mins > 1 else ''} ago"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"Updated {hours} hour{'s' if hours > 1 else ''} ago"
        else:
            days = seconds // 86400
            return f"Updated {days} day{'s' if days > 1 else ''} ago"
    except Exception:
        return "Updated recently"

# ─────────────────────────────────────────────────────────────────────────────
# 4. FLASK BACKEND SERVER
# ─────────────────────────────────────────────────────────────────────────────
app = Flask(__name__)

# Native CORS middleware without requiring external packages
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "online",
        "service": "ShopScout Amazon Real-Time Price Tracker",
        "endpoints": {
            "GET /api/products": "List all tracked products with prices & relative update times",
            "POST /api/track": "Track a new Amazon India product link { 'url': '...' }",
            "POST /api/refresh": "Refresh and scrape prices for all tracked products"
        }
    })

@app.route("/api/products", methods=["GET"])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tracked_products ORDER BY last_checked DESC")
    rows = cursor.fetchall()

    products = []
    for r in rows:
        # Fetch price history for mini sparkline chart
        cursor.execute(
            "SELECT price, recorded_at FROM price_history WHERE product_id = ? ORDER BY id DESC LIMIT 10",
            (r["id"],)
        )
        history = [dict(h) for h in cursor.fetchall()]

        discount = 0
        if r["original_price"] and r["original_price"] > r["current_price"]:
            discount = round(((r["original_price"] - r["current_price"]) / r["original_price"]) * 100)

        products.append({
            "id": r["id"],
            "asin": r["asin"],
            "title": r["title"],
            "url": r["url"],
            "current_price": r["current_price"],
            "original_price": r["original_price"],
            "discount_percentage": discount,
            "image_url": r["image_url"],
            "last_checked_iso": r["last_checked"],
            "updated_text": get_relative_time(r["last_checked"]),
            "price_history": history
        })

    conn.close()
    return jsonify({"success": True, "count": len(products), "products": products})

@app.route("/api/track", methods=["POST"])
def track_product():
    data = request.get_json() or {}
    url = data.get("url")
    if not url:
        return jsonify({"success": False, "message": "Amazon URL is required"}), 400

    scraped, error = scrape_amazon_product(url)
    if error:
        return jsonify({"success": False, "message": error}), 500

    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    # Upsert product
    cursor.execute("""
        INSERT INTO tracked_products (asin, title, url, current_price, original_price, image_url, last_checked)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(asin) DO UPDATE SET
            current_price = excluded.current_price,
            original_price = excluded.original_price,
            last_checked = excluded.last_checked
    """, (
        scraped["asin"], scraped["title"], scraped["url"],
        scraped["current_price"], scraped["original_price"],
        scraped["image_url"], now_str
    ))

    # Retrieve product ID
    cursor.execute("SELECT id FROM tracked_products WHERE asin = ?", (scraped["asin"],))
    product_id = cursor.fetchone()["id"]

    # Record price history point
    cursor.execute("""
        INSERT INTO price_history (product_id, price, recorded_at)
        VALUES (?, ?, ?)
    """, (product_id, scraped["current_price"], now_str))

    conn.commit()
    conn.close()

    scraped["id"] = product_id
    scraped["updated_text"] = "Updated just now"
    return jsonify({
        "success": True,
        "message": f"Successfully tracking {scraped['title'][:40]}...",
        "product": scraped
    })

@app.route("/api/refresh", methods=["POST"])
def refresh_all():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, url, asin, current_price FROM tracked_products")
    products = cursor.fetchall()

    updated = 0
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    for p in products:
        scraped, _ = scrape_amazon_product(p["url"])
        if scraped and scraped.get("current_price"):
            new_price = scraped["current_price"]
            cursor.execute("""
                UPDATE tracked_products 
                SET current_price = ?, original_price = ?, last_checked = ? 
                WHERE id = ?
            """, (new_price, scraped["original_price"], now_str, p["id"]))

            # Save history if price changed
            if new_price != p["current_price"]:
                cursor.execute("""
                    INSERT INTO price_history (product_id, price, recorded_at)
                    VALUES (?, ?, ?)
                """, (p["id"], new_price, now_str))
                updated += 1

    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": f"Refreshed {len(products)} products, {updated} price drops detected."})

if __name__ == "__main__":
    init_db()
    print("==========================================================")
    print("🐍 ShopScout Amazon Price Tracker & Flask Backend Live!")
    print("🌐 API Server: http://127.0.0.1:5000")
    print("📦 SQLite Database: price_tracker.db")
    print("==========================================================")
    app.run(port=5000, debug=True)
