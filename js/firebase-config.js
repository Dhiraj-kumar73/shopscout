/**
 * SHOPSCOUT — FIREBASE CLOUD DATABASE SERVICE
 * Connects ShopScout Store directly to Cloud Firestore.
 * Provides instant real-time sync across mobile and web without git pushes!
 */

const firebaseConfig = {
  apiKey: "AIzaSyCHtzW32Mk2NWN4mM9jRv5yF1lsZDH0Sjk",
  authDomain: "shopscout-store.firebaseapp.com",
  projectId: "shopscout-store",
  storageBucket: "shopscout-store.firebasestorage.app",
  messagingSenderId: "568855932209",
  appId: "1:568855932209:web:58e262b4f4807645889410"
};

let _firestoreDb = null;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    _firestoreDb = firebase.firestore();
    console.log('⚡ [ShopScout] Firebase Cloud Database Connected!');
  }
} catch (err) {
  console.warn('⚠️ [ShopScout] Firebase initialization notice:', err.message);
}

const ShopScoutFirebase = {
  get db() {
    if (!_firestoreDb && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        _firestoreDb = firebase.firestore();
      } catch (e) {}
    }
    return _firestoreDb;
  },

  isReady() {
    return !!this.db;
  },

  /**
   * Fetches all products from Cloud Firestore
   */
  async getAllProducts() {
    const database = this.db;
    if (!database) return null;
    try {
      const snapshot = await database.collection('products').get();
      if (snapshot.empty) return [];
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.warn('[Firebase] Failed to fetch products from cloud:', err.message);
      return null;
    }
  },

  /**
   * Saves or updates a product in Cloud Firestore
   */
  async saveProduct(product) {
    const database = this.db;
    if (!database || !product) return false;
    try {
      const prodId = String(product.id || `prod-${Date.now()}`);
      const cleanData = { ...product, id: prodId, updatedAt: new Date().toISOString() };
      await database.collection('products').doc(prodId).set(cleanData, { merge: true });
      console.log(`☁️ [Firebase] Product "${product.name}" successfully secured in Cloud Firestore!`);
      return true;
    } catch (err) {
      console.error('[Firebase] Save error:', err.message);
      return false;
    }
  },

  /**
   * Deletes a product from Cloud Firestore
   */
  async deleteProduct(productId) {
    const database = this.db;
    if (!database || !productId) return false;
    try {
      await database.collection('products').doc(String(productId)).delete();
      console.log(`🗑️ [Firebase] Product "${productId}" removed from Cloud Firestore.`);
      return true;
    } catch (err) {
      console.error('[Firebase] Delete error:', err.message);
      return false;
    }
  },

  /**
   * Seeds initial products into Cloud Firestore if collection is empty
   */
  async seedInitialProducts(initialList = []) {
    const database = this.db;
    if (!database || !Array.isArray(initialList) || initialList.length === 0) return;
    try {
      const snapshot = await database.collection('products').limit(1).get();
      if (snapshot.empty) {
        console.log('🌱 [Firebase] Seeding authentic products to Cloud Firestore...');
        const batch = database.batch();
        initialList.forEach(p => {
          if (p && p.id) {
            const ref = database.collection('products').doc(String(p.id));
            batch.set(ref, p);
          }
        });
        await batch.commit();
        console.log(`✅ [Firebase] Seeded ${initialList.length} products to Cloud Firestore!`);
      }
    } catch (e) {
      console.warn('[Firebase] Seed notice:', e.message);
    }
  }
};

if (typeof window !== 'undefined') {
  window.ShopScoutFirebase = ShopScoutFirebase;
}
