// Centralized API Service for communicating with Django REST Framework backend

const API_BASE_URL = "http://127.0.0.1:8000/api";

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
