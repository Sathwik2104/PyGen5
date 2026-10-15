import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createProduct } from "../services/api.js";

/**
 * AddProductModal Component:
 * Allows Store Owners to add new clothing items with:
 * - Product Name, Category, Price
 * - Size Inventory Counts (S, M, L, XL) as dedicated columns
 * - Image Upload (validated by Pillow on Django backend)
 */
export default function AddProductModal({ close, onProductAdded }) {
  const { tokens } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    category: "Men",
    price: "",
    size_s: "0",
    size_m: "0",
    size_l: "0",
    size_xl: "0",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error("Please enter a product name.");
      }
      if (!formData.price || Number(formData.price) <= 0) {
        throw new Error("Please enter a valid product price.");
      }

      // Build multipart/form-data payload
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("category", formData.category);
      data.append("price", formData.price);
      data.append("size_s", parseInt(formData.size_s) || 0);
      data.append("size_m", parseInt(formData.size_m) || 0);
      data.append("size_l", parseInt(formData.size_l) || 0);
      data.append("size_xl", parseInt(formData.size_xl) || 0);

      if (imageFile) {
        data.append("image", imageFile);
      }

      const created = await createProduct(data, tokens?.access);
      if (onProductAdded) {
        onProductAdded(created);
      }
      close();
    } catch (err) {
      setError(err.message || "Failed to add product.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="back" onClick={close}>
      <div
        className="modal add-product-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button className="x" onClick={close}>
          ×
        </button>

        <label>STORE OWNER PORTAL</label>
        <h2>Add New Product</h2>
        <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Provide collection details, size stocks, and a product photo.
        </p>

        {error && <div className="error-badge">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* PRODUCT NAME */}
          <div className="form-group">
            <label htmlFor="name">Product Name *</label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Satin Evening Dress"
              required
            />
          </div>

          {/* CATEGORY & PRICE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="price">Price (₹) *</label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="2499"
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* SIZE QUANTITIES */}
          <div className="form-group" style={{ marginTop: "12px" }}>
            <label style={{ display: "block", marginBottom: "8px" }}>
              Initial Size Stock Counts (Units in Store)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              <div className="size-input-box">
                <span>Size S</span>
                <input
                  type="number"
                  name="size_s"
                  value={formData.size_s}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="size-input-box">
                <span>Size M</span>
                <input
                  type="number"
                  name="size_m"
                  value={formData.size_m}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="size-input-box">
                <span>Size L</span>
                <input
                  type="number"
                  name="size_l"
                  value={formData.size_l}
                  onChange={handleChange}
                  min="0"
                />
              </div>
              <div className="size-input-box">
                <span>Size XL</span>
                <input
                  type="number"
                  name="size_xl"
                  value={formData.size_xl}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* IMAGE UPLOAD WITH PREVIEW */}
          <div className="form-group" style={{ marginTop: "14px" }}>
            <label htmlFor="image">Product Image (Saved via Pillow)</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{
                display: "block",
                padding: "8px 0",
                fontSize: "0.9rem",
                color: "var(--ink)",
              }}
            />

            {imagePreview && (
              <div
                style={{
                  marginTop: "8px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  width: "100%",
                  maxHeight: "150px",
                  border: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "center",
                  background: "var(--paper)",
                }}
              >
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ maxHeight: "150px", objectFit: "contain" }}
                />
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="primary full"
            disabled={loading}
            style={{ marginTop: "20px" }}
          >
            {loading ? "Adding Product..." : "+ Add Product to Store"}
          </button>
        </form>
      </div>
    </div>
  );
}
