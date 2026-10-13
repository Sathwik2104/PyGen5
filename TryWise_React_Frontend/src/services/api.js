// Centralized API Service for communicating with Django REST Framework backend

const API_BASE_URL = "http://127.0.0.1:8000/api";

/**
 * ==============================================================================
 * AUTHENTICATION APIS
 * ==============================================================================
 */

/**
 * Register a new user
 * @param {Object} data - { email, password, confirm_password, full_name, role }
 */
export async function registerUser(data) {
  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(
      resData.detail ||
        (resData.email && resData.email[0]) ||
        (resData.password && resData.password[0]) ||
        "Registration failed. Please check your inputs."
    );
  }
  return resData;
}

/**
 * Login user with email/username and password
 * @param {Object} data - { email_or_username, password }
 */
export async function loginUser(data) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Invalid login credentials.");
  }
  return resData;
}

/**
 * Fetch authenticated user profile using JWT token
 * @param {string} token
 */
export async function fetchUserProfile(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me/`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to fetch user profile.");
  }
  return resData;
}

/**
 * ==============================================================================
 * PRODUCT APIS
 * ==============================================================================
 */

/**
 * Fetch products, optionally filtered by category ('Men', 'Women', 'All')
 * @param {string} category
 */
export async function fetchProducts(category = "All") {
  const cleanCat = category ? category.trim() : "All";
  const url =
    cleanCat && cleanCat !== "All"
      ? `${API_BASE_URL}/products/?category=${encodeURIComponent(cleanCat)}`
      : `${API_BASE_URL}/products/`;

  const response = await fetch(url, {
    method: "GET",
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to fetch products.");
  }
  return resData;
}

/**
 * Create a new product (Store Owner only)
 * Uses FormData to handle product fields and image upload
 * @param {FormData} formData
 * @param {string} token
 */
export async function createProduct(formData, token) {
  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: formData,
  });

  const resData = await response.json();
  if (!response.ok) {
    const errorMsg =
      resData.detail ||
      Object.entries(resData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ") ||
      "Failed to create product.";
    throw new Error(errorMsg);
  }
  return resData;
}

/**
 * Update product fields or stock counts (Store Owner only)
 * @param {number} productId
 * @param {Object} partialData - e.g. { size_m: 12 }
 * @param {string} token
 */
export async function updateProductStock(productId, partialData, token) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(partialData),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to update product stock.");
  }
  return resData;
}

/**
 * Delete a product (Store Owner only)
 * @param {number} productId
 * @param {string} token
 */
export async function deleteProduct(productId, token) {
  const response = await fetch(`${API_BASE_URL}/products/${productId}/`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const resData = await response.json().catch(() => ({}));
    throw new Error(resData.detail || "Failed to delete product.");
  }
  return true;
}

/**
 * ==============================================================================
 * ORDER / BAG IT REQUEST APIS
 * ==============================================================================
 */

/**
 * Customer places a Bag It request
 * @param {Object} orderData - { items: [{ product_id, size, quantity }] }
 * @param {string} token
 */
export async function createOrder(orderData, token) {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to submit Bag It request.");
  }
  return resData;
}

/**
 * Fetch orders:
 * - If Store Owner: fetches all incoming customer Bag It requests
 * - If Customer: fetches user's own Bag It requests
 * @param {string} token
 */
export async function fetchOrders(token) {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to fetch orders.");
  }
  return resData;
}

/**
 * Update order status (Store Owner only: e.g. 'Accepted', 'Ready for Pickup', 'Completed')
 * @param {number} orderId
 * @param {string} status
 * @param {string} token
 */
export async function updateOrderStatus(orderId, status, token) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to update order status.");
  }
  return resData;
}
