import React from "react";

/**
 * ImageModal Component:
 * Displays an enlarged preview of a product image when clicked
 * in the product list or Bag It cart.
 */
export default function ImageModal({ imageUrl, title, onClose }) {
  if (!imageUrl) return null;

  return (
    <div
      className="back"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "540px",
          width: "100%",
          textAlign: "center",
          padding: "24px",
          background: "#1c1c1c",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          position: "relative",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <button
          className="x"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "16px",
            fontSize: "26px",
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h3 style={{ margin: "0 0 16px 0", color: "#fff", fontSize: "1.2rem" }}>
          {title || "Product Preview"}
        </h3>

        <div
          style={{
            borderRadius: "12px",
            overflow: "hidden",
            maxHeight: "450px",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={imageUrl}
            alt={title || "Product"}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "450px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
}
