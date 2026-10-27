const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/**
 * ==============================================================================
 * AUTHENTICATION & OTP APIS
 * ==============================================================================
 */

/**
 * Register a new user (Customer or Store Owner).
 * Returns { verification_required: true, email, temp_token }
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
    const errorMsg =
      resData.detail ||
      (Array.isArray(resData.role) ? resData.role[0] : resData.role) ||
      (Array.isArray(resData.email) ? resData.email[0] : resData.email) ||
      (Array.isArray(resData.password) ? resData.password[0] : resData.password) ||
      (typeof resData === "object" ? Object.values(resData).flat()[0] : null) ||
      "Registration failed. Please check your inputs.";
    throw new Error(errorMsg);
  }
  return resData;
}

/**
 * Verify 6-digit registration OTP to activate user account and receive JWT tokens.
 * @param {string} tempToken
 * @param {string} otp
 */
export async function verifyRegistrationOtp(tempToken, otp) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-registration-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ temp_token: tempToken, otp }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Invalid or expired verification code.");
  }
  return resData;
}

/**
 * Resend registration verification OTP
 * @param {string} tempToken
 */
export async function resendRegistrationOtp(tempToken) {
  const response = await fetch(`${API_BASE_URL}/auth/resend-registration-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ temp_token: tempToken }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to resend verification code.");
  }
  return resData;
}

/**
 * Login user with email/username and password.
 * - Customer: returns { user, tokens }
 * - Store Owner: returns { otp_required: true, temp_token, email_hint }
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
    const error = new Error(resData.detail || "Invalid login credentials.");
    error.data = resData;
    throw error;
  }
  return resData;
}

/**
 * Verify Store Owner 2FA login OTP
 * @param {string} tempToken
 * @param {string} otp
 */
export async function verifyLoginOtp(tempToken, otp) {
  const response = await fetch(`${API_BASE_URL}/auth/verify-login-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ temp_token: tempToken, otp }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Invalid or expired 2FA code.");
  }
  return resData;
}

/**
 * Resend Store Owner 2FA login OTP
 * @param {string} tempToken
 */
export async function resendLoginOtp(tempToken) {
  const response = await fetch(`${API_BASE_URL}/auth/resend-login-otp/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ temp_token: tempToken }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to resend login code.");
  }
  return resData;
}

/**
 * Request password reset code to be emailed
 * @param {string} email
 */
export async function forgotPassword(email) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to initiate password reset.");
  }
  return resData;
}

/**
 * Submit password reset with OTP and new password
 * @param {Object} data - { email, otp, new_password, confirm_password }
 */
export async function resetPassword(data) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || resData.confirm_password?.[0] || resData.new_password?.[0] || "Password reset failed.");
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
 * Update product details, image, price, original_price (Store Owner only).
 * Can accept FormData (for image upload) or standard JSON object.
 * When price is updated, active requests automatically sync.
 * @param {number} productId
 * @param {FormData|Object} data
 * @param {string} token
 */
export async function updateProduct(productId, data, token) {
  const isFormData = data instanceof FormData;
  const headers = {
    "Authorization": `Bearer ${token}`,
  };
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}/products/${productId}/`, {
    method: "PATCH",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    const errorMsg =
      resData.detail ||
      Object.entries(resData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ") ||
      "Failed to update product.";
    throw new Error(errorMsg);
  }
  return resData;
}

/**
 * Update product stock counts (Store Owner only)
 * @param {number} productId
 * @param {Object} partialData - e.g. { size_m: 12 }
 * @param {string} token
 */
export async function updateProductStock(productId, partialData, token) {
  return updateProduct(productId, partialData, token);
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
 * Update order status (Store Owner only: e.g. 'Accepted', 'Ready for Pickup', 'Completed', 'Cancelled')
 * @param {number} orderId
 * @param {string} status
 * @param {string} token
 */
export async function updateOrderStatus(orderId, status, token) {
  return updateOrderStatusWithItems(orderId, { status }, token);
}

/**
 * Update order status with per-item partial purchase & restock actions
 * @param {number} orderId
 * @param {Object} payload - { status: 'Completed', item_actions: [{ item_id, action: 'purchased'|'restocked' }] }
 * @param {string} token
 */
export async function updateOrderStatusWithItems(orderId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to update order status.");
  }
  return resData;
}

/**
 * ==============================================================================
 * STORE OWNER REVENUE & ANALYTICS API
 * ==============================================================================
 */

/**
 * Fetch store revenue metrics and completed trial counts
 * @param {string} period - 'all' | 'this_week' | 'this_month' | 'custom'
 * @param {string} token
 * @param {number} [year]
 * @param {number} [month]
 */
export async function fetchStoreRevenue(period = "all", token, year = null, month = null) {
  let url = `${API_BASE_URL}/store/revenue/?period=${encodeURIComponent(period)}`;
  if (year && month) {
    url += `&year=${year}&month=${month}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to fetch store revenue analytics.");
  }
  return resData;
}

/**
 * ==============================================================================
 * STORE OWNER TRIAL POLICY & CONFIGURATION API
 * ==============================================================================
 */

/**
 * Fetch dynamic trial reservation policy for the Store Owner
 * @param {string} token
 */
export async function fetchStoreConfig(token) {
  const response = await fetch(`${API_BASE_URL}/store/config/`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.detail || "Failed to fetch store configuration.");
  }
  return resData;
}

/**
 * Update dynamic trial reservation policy for the Store Owner
 * @param {Object} data - { trial_duration_value: number, trial_duration_unit: 'minutes' | 'hours' }
 * @param {string} token
 */
export async function updateStoreConfig(data, token) {
  const response = await fetch(`${API_BASE_URL}/store/config/`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const resData = await response.json();
  if (!response.ok) {
    const errorMsg =
      resData.detail ||
      Object.entries(resData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ") ||
      "Failed to update store configuration.";
    throw new Error(errorMsg);
  }
  return resData;
}
