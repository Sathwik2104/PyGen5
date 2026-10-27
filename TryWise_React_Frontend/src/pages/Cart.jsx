import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { createOrder, fetchOrders } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * Cart ("Bag It") Page Component:
 * - Customers review selected clothing items before store visit.
 * - View image thumbnails (clickable for high-res zoom).
 * - Edit quantities with [+] and [-] (capped by in-stock limits).
 * - Remove unwanted items.
 * - Submit the Bag It request to the Django backend (atomically reserves stock).
 */
/**
 * Formats hold duration dynamically (e.g. "2-minute", "30-minute", "24-hour")
 */
const getTrialTimeframeLabel = (ord) => {
  if (ord?.expires_at) {
    const start = ord.ready_at ? new Date(ord.ready_at).getTime() : new Date(ord.created_at).getTime();
    const end = new Date(ord.expires_at).getTime();
    const diffSec = Math.max(0, Math.round((end - start) / 1000));
    if (diffSec < 3600) {
      const mins = Math.max(1, Math.round(diffSec / 60));
      return `${mins}-minute`;
    } else {
      const hrs = Math.max(1, Math.round(diffSec / 3600));
      return `${hrs}-hour`;
    }
  }
  return "trial";
};

export default function Cart({ cart, setCart, setPage, goProducts, onOpenLogin }) {
  const { user, tokens } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successOrder, setSuccessOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);

  useEffect(() => {
    if (user && tokens?.access) {
      fetchOrders(tokens.access)
        .then((data) => setCustomerOrders(data))
        .catch((err) => console.error("Error loading orders:", err));
    }
  }, [user, tokens, successOrder]);

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

  if (!user) {
    return (
      <main className="page" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
        <div className="empty" style={{ padding: "50px 30px" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>🛍</div>
          <label>YOUR BAG</label>
          <h2 style={{ fontSize: "28px", margin: "12px 0 8px" }}>Sign In to View Bag It</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            Log in to manage your in-store selection, adjust sizes, and send requests.
          </p>
          <button
            className="primary"
            onClick={() => onOpenLogin && onOpenLogin("customer")}
            style={{ padding: "12px 28px", borderRadius: "25px" }}
          >
            Log In as Customer ↗
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page" style={{ maxWidth: "880px", margin: "0 auto", padding: "40px 6vw" }}>
      <label>YOUR IN-STORE SELECTION</label>

      <h1 style={{ margin: "4px 0 14px 0" }}>
        My <em>Bag It.</em>
      </h1>

      <p style={{ color: "var(--muted)", marginBottom: "28px" }}>
        Review your clothing sizes and quantities. Once submitted, the store owner prepares your items for trial.
      </p>

      {/* SUCCESS CONFIRMATION SCREEN */}
      {successOrder && (
        <div className="success-banner">
          <div className="success-banner-icon">🎉</div>
          <h2>Bag It Request Submitted!</h2>
          <p>
            Request <strong>#{successOrder.id}</strong> has been sent to the store. Your selected sizes have been safely reserved for your visit.
          </p>
          <button
            className="primary"
            onClick={() => {
              setSuccessOrder(null);
              if (goProducts) goProducts("All");
              else setPage("products");
            }}
          >
            Explore More Products
          </button>
        </div>
      )}

      {error && <div className="error-badge">{error}</div>}

      {/* EMPTY CART */}
      {!cart.length && !successOrder ? (
        <div className="empty">
          <div className="empty-icon">🛍</div>
          <div className="empty-title">Your Bag It is empty.</div>
          <div className="empty-text">
            Explore the collection to add your favorite picks before visiting the store.
          </div>
          <button
            className="primary"
            onClick={() => {
              if (goProducts) goProducts("All");
              else setPage("products");
            }}
            style={{ marginTop: "20px" }}
          >
            Browse Products
          </button>
        </div>
      ) : null}

      {/* CART ITEMS LIST */}
      {cart.length > 0 && (
        <div className="cart-items-container">
          {cart.map((item, index) => (
            <div
              key={`${item.productId}_${item.size}_${index}`}
              className="cart-item-card"
            >
              {/* IMAGE & DETAILS */}
              <div className="cart-item-info">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="cart-item-img"
                    onClick={() =>
                      setPreviewImage({
                        url: item.image,
                        title: item.name,
                      })
                    }
                    title="Click to zoom image"
                  />
                ) : (
                  <div className="cart-item-placeholder">◈</div>
                )}

                <div>
                  <b className="cart-item-name">{item.name}</b>
                  <div className="cart-item-meta">
                    <span className="cart-size-pill">Size: {item.size}</span>
                    <span className="cart-unit-price">
                      ₹{item.price.toLocaleString("en-IN")} each
                    </span>
                  </div>
                </div>
              </div>

              {/* QUANTITY CONTROLS & ITEM TOTAL */}
              <div className="cart-item-controls">
                {/* QUANTITY STEPPER */}
                <div className="cart-stepper">
                  <button
                    onClick={() => handleQuantityChange(index, -1)}
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(index, 1)}
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* LINE TOTAL */}
                <span className="cart-line-total">
                  ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                </span>

                {/* REMOVE BUTTON */}
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="cart-remove-btn"
                  title="Remove item from bag"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* ORDER SUMMARY & SUBMISSION */}
          <div className="cart-summary-box">
            <div className="summary-row">
              <span className="summary-label">Total Estimated Value:</span>
              <strong className="summary-total">
                ₹{totalPrice.toLocaleString("en-IN")}
              </strong>
            </div>

            <button
              className="primary full"
              onClick={handleSubmitOrder}
              disabled={loading}
            >
              {loading ? "Submitting Bag It Request..." : "Send Bag It Request ↗"}
            </button>
          </div>
        </div>
      )}

      {/* CUSTOMER ACTIVE & PAST TRIAL REQUESTS */}
      {customerOrders.length > 0 && (
        <section style={{ marginTop: "48px", borderTop: "1px solid var(--line)", paddingTop: "32px" }}>
          <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "var(--muted)", textTransform: "uppercase" }}>
            TRIAL QUEUE STATUS
          </label>
          <h2 style={{ fontSize: "22px", margin: "6px 0 20px 0" }}>
            My Bag It <em>Requests.</em>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {customerOrders.map((ord) => {
              const isReady = ord.status === "Ready for Pickup";
              const isExpired = ord.status === "Cancelled" && ord.expires_at && new Date(ord.expires_at) <= new Date(ord.updated_at);

              return (
                <div
                  key={ord.id}
                  style={{
                    background: isReady ? "#f0fdf4" : "var(--white)",
                    border: isReady ? "1.5px solid #86efac" : "1px solid var(--line)",
                    borderRadius: "14px",
                    padding: "20px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "16px" }}>Request #{ord.id}</strong>
                      <span style={{ fontSize: "13px", color: "var(--muted)", marginLeft: "10px" }}>
                        {new Date(ord.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background:
                          ord.status === "Ready for Pickup"
                            ? "#dcfce7"
                            : ord.status === "Accepted"
                              ? "#ede9fe"
                              : ord.status === "Completed"
                                ? "#f1f5f9"
                                : ord.status === "Cancelled"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                        color:
                          ord.status === "Ready for Pickup"
                            ? "#15803d"
                            : ord.status === "Accepted"
                              ? "#6d28d9"
                              : ord.status === "Completed"
                                ? "#334155"
                                : ord.status === "Cancelled"
                                  ? "#b91c1c"
                                  : "#b45309",
                      }}
                    >
                      {ord.status === "Ready for Pickup" ? "✨ Ready to Try On!" : ord.status}
                    </span>
                  </div>

                  {/* READY NOTIFICATION BANNER WITH STORE TIMING */}
                  {isReady && ord.expires_at && (
                    <div
                      style={{
                        background: ord.is_deadline_updated ? "#f0fdf4" : "#ffffff",
                        border: ord.is_deadline_updated ? "1.5px solid #22c55e" : "1px dashed #22c55e",
                        borderRadius: "10px",
                        padding: "12px 14px",
                        margin: "10px 0 14px",
                        fontSize: "13px",
                        color: "#166534",
                        lineHeight: "1.5",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "4px" }}>
                        <strong>🎉 Your pieces are waiting in the fitting room!</strong>
                        {ord.is_deadline_updated && (
                          <span
                            style={{
                              background: "#dcfce7",
                              color: "#15803d",
                              fontSize: "11px",
                              fontWeight: "700",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            ⏱️ Reservation Updated
                          </span>
                        )}
                      </div>
                      ⏰ <strong>Hold Deadline:</strong> Reserved for {getTrialTimeframeLabel(ord)} (Valid until {new Date(ord.expires_at).toLocaleString()}) (Store Hours: 10:00 AM – 9:00 PM).
                      <br />
                      Visit the fitting room, mention Order #{ord.id}, try on, and pay only for what you take!
                    </div>
                  )}

                  {/* AUTO-CANCELLED EXPIRED BADGE */}
                  {isExpired && (
                    <div
                      style={{
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        margin: "10px 0 14px",
                        fontSize: "13px",
                        color: "#9f1239",
                      }}
                    >
                      ⚠️ <strong>Trial Window Expired:</strong> The {getTrialTimeframeLabel(ord)} reservation ended (held until {new Date(ord.expires_at).toLocaleString()}), and your request has been cancelled.
                    </div>
                  )}

                  {/* ITEMS LIST */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                    {ord.items?.map((it) => (
                      <span
                        key={it.id}
                        style={{
                          background: "var(--paper)",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          fontSize: "12px",
                        }}
                      >
                        {it.product_name || "Piece"} (Size {it.size}) × {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
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
