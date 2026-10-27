import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { updateProduct } from "../services/api.js";

/**
 * EditProductModal Component:
 * Allows Store Owners to update product details:
 * - Name, Category
 * - Price & Original/MRP Price (for sale discounts)
 * - Replacement Photo upload with instant preview
 * - Note explaining that price changes will automatically sync to active requests in queue!
 */
export default function EditProductModal({ product, close, onProductUpdated }) {
  const { tokens } = useAuth();

  const [formData, setFormData] = useState({
    name: product.name || "",
    category: product.category || "Men",
    price: product.price || "",
    original_price: product.original_price || "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product.image || null);
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
        throw new Error("Product name is required.");
      }
      if (!formData.price || Number(formData.price) <= 0) {
        throw new Error("Please enter a valid price greater than zero.");
      }
      if (formData.original_price && Number(formData.original_price) < Number(formData.price)) {
        throw new Error("Original / MRP price cannot be lower than the selling price.");
      }

      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("category", formData.category);
      data.append("price", formData.price);

      if (formData.original_price && Number(formData.original_price) > 0) {
        data.append("original_price", formData.original_price);
      } else {
        data.append("original_price", "");
      }

      if (imageFile) {
        data.append("image", imageFile);
      }

      const updated = await updateProduct(product.id, data, tokens?.access);
      if (onProductUpdated) {
        onProductUpdated(updated);
      }
      close();
    } catch (err) {
      setError(err.message || "Failed to update product.");
    } finally {
      setLoading(false);
    }
  };

  const numPrice = Number(formData.price) || 0;
  const numOrig = Number(formData.original_price) || 0;
  const isOnSale = numOrig > numPrice && numPrice > 0;
  const discountPercent = isOnSale ? Math.round(((numOrig - numPrice) / numOrig) * 100) : 0;

  return (
    <div className="back" onClick={close}>
      <div
        className="modal edit-product-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button className="x" onClick={close}>
          ×
        </button>

        <label>STORE OWNER CONTROL</label>
        <h2>Edit Product & Pricing</h2>
        <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Update collection details, sales pricing, or replace photo.
        </p>

        {error && <div className="error-badge">{error}</div>}

        <div className="notice-box" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.85rem", color: "#475569" }}>
          💡 <strong>Live Price Sync:</strong> Changing this price will automatically update all active Bag It requests in the queue to reflect the new price.
        </div>

        <form onSubmit={handleSubmit}>
          {/* PRODUCT NAME */}
          <div className="form-group">
            <label htmlFor="edit-name">Product Name *</label>
            <input
              id="edit-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* CATEGORY & SELLING PRICE */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label htmlFor="edit-category">Category *</label>
              <select
                id="edit-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="edit-price">Selling Price (₹) *</label>
              <input
                id="edit-price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="1"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* ORIGINAL / MRP PRICE FOR SALES */}
          <div className="form-group" style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="edit-original-price">Original / MRP Price (₹)</label>
              {isOnSale && (
                <span className="badge-sale-preview" style={{ background: "#ecfdf5", color: "#065f46", fontSize: "12px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px" }}>
                  🎉 {discountPercent}% OFF SALE
                </span>
              )}
            </div>
            <input
              id="edit-original-price"
              type="number"
              name="original_price"
              value={formData.original_price}
              onChange={handleChange}
              placeholder="Leave empty if not on sale (e.g. 2999)"
              min="1"
              step="0.01"
            />
            <small style={{ color: "var(--muted)", fontSize: "0.8rem", display: "block", marginTop: "4px" }}>
              Set higher than selling price to display strike-through price and SALE tag for customers.
            </small>
          </div>

          {/* IMAGE UPLOAD WITH PREVIEW */}
          <div className="form-group" style={{ marginTop: "14px" }}>
            <label htmlFor="edit-image">Product Image (Upload new to replace)</label>
            <input
              id="edit-image"
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
            {loading ? "Saving Changes..." : "Save Product Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
