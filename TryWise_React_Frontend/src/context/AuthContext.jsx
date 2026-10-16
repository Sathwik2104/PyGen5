import React, { createContext, useState, useEffect, useContext } from "react";
import { loginUser, registerUser, fetchUserProfile } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(() => {
    const saved = localStorage.getItem("trywise_tokens");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Initialize and verify authentication on app load
  useEffect(() => {
    async function initAuth() {
      if (tokens && tokens.access) {
        try {
          const profile = await fetchUserProfile(tokens.access);
          setUser(profile);
        } catch (err) {
          console.error("Token verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (credentials) => {
    const data = await loginUser(credentials);
    setUser(data.user);
    setTokens(data.tokens);
    localStorage.setItem("trywise_tokens", JSON.stringify(data.tokens));
    localStorage.setItem("trywise_user", JSON.stringify(data.user));
    return data;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    setUser(data.user);
    setTokens(data.tokens);
    localStorage.setItem("trywise_tokens", JSON.stringify(data.tokens));
    localStorage.setItem("trywise_user", JSON.stringify(data.user));
    return data;
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem("trywise_tokens");
    localStorage.removeItem("trywise_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
