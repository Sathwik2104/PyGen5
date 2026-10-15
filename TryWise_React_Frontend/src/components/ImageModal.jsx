import React from "react";

/**
 * ImageModal Component:
 * Displays an enlarged preview of a product image when clicked
 * in the product list or Bag It cart.
 */
export default function ImageModal({ imageUrl, title, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="back" onClick={onClose} style={{ backdropFilter: "blur(8px)" }}>
      <div
        className="modal image-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="x"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "18px",
            fontSize: "24px",
            background: "none",
            border: "none",
            color: "var(--ink)",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h3>{title || "Product Preview"}</h3>

        <div className="image-modal-frame">
          <img
            src={imageUrl}
            alt={title || "Product"}
          />
        </div>
      </div>
    </div>
  );
}
