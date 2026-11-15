/**
 * Helper service for tracking recently visited / searched products in localStorage.
 * Partitioned per customer account so each user's history and carousel are completely isolated.
 */

const BASE_RECENT_KEY = "trywise_recent_views";
const MAX_RECENT_ITEMS = 10;

/**
 * Determine the account-scoped localStorage key.
 * If userIdentifier is not passed, falls back to the current logged-in user in localStorage.
 * Guests use a dedicated guest key.
 * @param {string|number|null} userIdentifier - User ID or email
 */
function resolveStorageKey(userIdentifier = null) {
  let uid = userIdentifier;

  if (!uid) {
    try {
      const savedUser = localStorage.getItem("trywise_user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        uid = u?.id || u?.email || null;
      }
    } catch (e) {
      // ignore parse error
    }
  }

  return uid ? `${BASE_RECENT_KEY}_user_${uid}` : `${BASE_RECENT_KEY}_guest`;
}

/**
 * Record a product visit in client-side storage, scoped to the user account
 * @param {Object} product - { id, name, price, category, image }
 * @param {string|number|null} userIdentifier - optional account ID/email
 */
export function recordProductVisit(product, userIdentifier = null) {
  if (!product || !product.id) return;

  const key = resolveStorageKey(userIdentifier);

  try {
    const raw = localStorage.getItem(key);
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
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Could not save recent product visit:", err);
  }
}

/**
 * Retrieve the list of recently visited products for the given account
 * @param {string|number|null} userIdentifier - optional account ID/email
 * @returns {Array} List of product snapshots
 */
export function getRecentProducts(userIdentifier = null) {
  const key = resolveStorageKey(userIdentifier);
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Could not read recent products:", err);
    return [];
  }
}

/**
 * Clear recent products for a specific user (or guest)
 * @param {string|number|null} userIdentifier
 */
export function clearRecentProducts(userIdentifier = null) {
  const key = resolveStorageKey(userIdentifier);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("Could not clear recent products:", err);
  }
}
