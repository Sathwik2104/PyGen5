import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createOrder } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * Cart ("Bag It") Page Component:
 * - Customers review selected clothing items before store visit.
 * - View image thumbnails (clickable for high-res zoom).
 * - Edit quantities with [+] and [-] (capped by in-stock limits).
 * - Remove unwanted items.
 * - Submit the Bag It request to the Django backend (atomically reserves stock).
 */
export default function Cart({ cart, setCart, setPage }) {
  const { tokens } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Update quantity of an item
  const handleQuantityChange = (index, delta) => {
    setCart((prevCart) => {
      const nextCart = [...prevCart];
      const item = nextCart[index];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        // Remove item if quantity reached 0
        return nextCart.filter((_, i) => i !== index);
      }

      // Cap at available stock
      if (item.availableStock && newQty > item.availableStock) {
        alert(`Only ${item.availableStock} available in stock for Size ${item.size}.`);
        return prevCart;
      }

      nextCart[index] = { ...item, quantity: newQty };
      return nextCart;
    });
  };

  // Remove single item
  const handleRemoveItem = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Bag It request to Django backend
  const handleSubmitOrder = async () => {
    if (!cart.length) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.productId,
          size: item.size,
          quantity: item.quantity,
        })),
      };

      const res = await createOrder(payload, tokens?.access);
      setSuccessOrder(res.order);
      setCart([]); // Clear cart upon successful request
    } catch (err) {
      setError(err.message || "Failed to submit Bag It request.");
    } finally {
      setLoading(false);
    }
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );

  return (
    <main className="page" style={{ maxWidth: "800px", margin: "0 auto", padding: "24px 16px" }}>
      <label style={{ fontSize: "0.85rem", letterSpacing: "1px", color: "var(--accent, #e5a93b)" }}>
        YOUR IN-STORE SELECTION
      </label>

      <h1 style={{ margin: "4px 0 16px 0" }}>
        My <em>Bag It.</em>
      </h1>

      <p style={{ color: "#888", marginBottom: "24px" }}>
        Review your clothing sizes and quantities. Once submitted, the store owner prepares your items for trial.
      </p>

      {/* SUCCESS CONFIRMATION SCREEN */}
      {successOrder && (
        <div
          style={{
            background: "rgba(76, 175, 80, 0.12)",
            border: "1px solid rgba(76, 175, 80, 0.4)",
            borderRadius: "14px",
            padding: "24px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>
          <h2 style={{ color: "#4caf50", margin: "0 0 8px 0" }}>
            Bag It Request Submitted!
          </h2>
          <p style={{ color: "#ccc", margin: "0 0 16px 0" }}>
            Request <strong>#{successOrder.id}</strong> has been sent to the store. Your selected sizes have been safely reserved for your visit.
          </p>
          <button
            className="primary"
            onClick={() => {
              setSuccessOrder(null);
              setPage("products");
            }}
            style={{ padding: "10px 24px", borderRadius: "20px" }}
          >
            Explore More Products
          </button>
        </div>
      )}

      {error && <div className="error-badge" style={{ marginBottom: "16px" }}>{error}</div>}

      {/* EMPTY CART */}
      {!cart.length && !successOrder ? (
        <div
          className="empty"
          style={{
            padding: "48px 20px",
            textAlign: "center",
            background: "#181818",
            borderRadius: "14px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "12px", opacity: 0.6 }}>🛍</div>
          Your Bag It is empty.
          <br />
          <small style={{ color: "#777", display: "block", marginTop: "6px" }}>
            Explore the collection to add your favorite picks.
          </small>
          <button
            className="secondary"
            onClick={() => setPage("products")}
            style={{ marginTop: "16px", padding: "8px 20px", borderRadius: "20px" }}
          >
            Browse Products
          </button>
        </div>
      ) : null}

      {/* CART ITEMS LIST */}
      {cart.length > 0 && (
        <div className="cart" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {cart.map((item, index) => (
            <div
              key={`${item.productId}_${item.size}_${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--card, #1c1c1c)",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                flexWrap: "wrap",
                gap: "14px",
              }}
            >
              {/* IMAGE & DETAILS */}
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    onClick={() =>
                      setPreviewImage({
                        url: item.image,
                        title: item.name,
                      })
                    }
                    title="Click to zoom image"
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: "1px solid #333",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      background: "#252525",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#777",
                      fontSize: "1.2rem",
                    }}
                  >
                    ◈
                  </div>
                )}

                <div>
                  <b style={{ fontSize: "1.05rem", color: "#fff", display: "block" }}>
                    {item.name}
                  </b>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span
                      style={{
                        background: "#2b2b2b",
                        border: "1px solid #444",
                        padding: "2px 8px",
                        borderRadius: "14px",
                        fontSize: "0.8rem",
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      Size: {item.size}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "#888" }}>
                      ₹{item.price.toLocaleString("en-IN")} each
                    </span>
                  </div>
                </div>
              </div>

              {/* QUANTITY CONTROLS & ITEM TOTAL */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {/* QUANTITY STEPPER */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#141414",
                    borderRadius: "6px",
                    border: "1px solid #333",
                  }}
                >
                  <button
                    onClick={() => handleQuantityChange(index, -1)}
                    style={{
                      padding: "6px 12px",
                      background: "none",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "1rem",
                    }}
                  >
                    -
                  </button>
                  <span style={{ padding: "0 8px", fontWeight: "600", color: "#fff" }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(index, 1)}
                    style={{
                      padding: "6px 12px",
                      background: "none",
                      border: "none",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "1rem",
                    }}
                  >
                    +
                  </button>
                </div>

                {/* LINE TOTAL */}
                <strong style={{ minWidth: "90px", textAlign: "right", color: "var(--accent, #e5a93b)", fontSize: "1.1rem" }}>
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </strong>

                {/* REMOVE BUTTON */}
                <button
                  onClick={() => handleRemoveItem(index)}
                  title="Remove item"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#777",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    padding: "4px 8px",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* ORDER SUMMARY & SUBMISSION */}
          <div
            style={{
              marginTop: "16px",
              padding: "20px",
              background: "#141414",
              borderRadius: "14px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "1.1rem", color: "#aaa" }}>Total Estimated Value:</span>
              <strong style={{ fontSize: "1.5rem", color: "#fff" }}>
                ₹{totalPrice.toLocaleString("en-IN")}
              </strong>
            </div>

            <button
              className="primary full"
              onClick={handleSubmitOrder}
              disabled={loading}
              style={{
                padding: "14px",
                borderRadius: "10px",
                fontSize: "1.05rem",
                fontWeight: "600",
                letterSpacing: "0.5px",
                boxShadow: "0 4px 18px rgba(229, 169, 59, 0.35)",
              }}
            >
              {loading ? "Submitting Bag It Request..." : "Send Bag It Request ↗"}
            </button>
          </div>
        </div>
      )}

      {/* FULL IMAGE ZOOM MODAL */}
      {previewImage && (
        <ImageModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </main>
  );
}
