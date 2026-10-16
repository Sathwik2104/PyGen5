// Helper service for tracking recently visited / searched products in localStorage

const RECENT_KEY = "trywise_recent_views";
const MAX_RECENT_ITEMS = 10;

/**
 * Record a product visit in client-side storage
 * @param {Object} product - { id, name, price, category, image }
 */
export function recordProductVisit(product) {
  if (!product || !product.id) return;

  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const existing = raw ? JSON.parse(raw) : [];

    // Filter out existing occurrence to move it to the front (deduplicate)
    const filtered = existing.filter((p) => p.id !== product.id);

    const snapshot = {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.image,
      visitedAt: Date.now(),
    };

    const updated = [snapshot, ...filtered].slice(0, MAX_RECENT_ITEMS);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not save recent product visit:", err);
  }
}

/**
 * Retrieve the list of recently visited products
 * @returns {Array} List of product snapshots
 */
export function getRecentProducts() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Could not read recent products:", err);
    return [];
  }
}
