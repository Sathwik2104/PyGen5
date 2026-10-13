import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchOrders, updateOrderStatus } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * StoreRequests Component:
 * Dedicated dashboard for Store Owners to view customer "Bag It" requests,
 * inspect requested clothing sizes/quantities, and update order statuses.
 */
export default function StoreRequests() {
  const { tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrders(tokens?.access);
      setOrders(data);
    } catch (err) {
      setError(err.message || "Failed to load customer requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokens?.access) {
      loadOrders();
    }
  }, [tokens]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      await updateOrderStatus(orderId, newStatus, tokens?.access);
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      alert(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="page" style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <label style={{ fontSize: "0.85rem", letterSpacing: "1px", color: "var(--accent, #e5a93b)" }}>
            STORE OWNER DASHBOARD
          </label>
          <h1 style={{ margin: "4px 0" }}>
            Customer <em>Bag Requests.</em>
          </h1>
          <p style={{ color: "#888", margin: 0 }}>
            Review incoming in-store trial requests and prepare sizes for customers.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="secondary"
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <p style={{ color: "#aaa" }}>Loading requests...</p>}
      {error && <div className="error-badge">{error}</div>}

      {!loading && orders.length === 0 && (
        <div className="empty" style={{ padding: "40px 20px", textAlign: "center", background: "#181818", borderRadius: "12px" }}>
          No Bag It requests received yet.
          <br />
          <small style={{ color: "#777" }}>Customer requests will appear here in real-time.</small>
        </div>
      )}

      {/* ORDERS LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {orders.map((order) => (
          <article
            key={order.id}
            style={{
              background: "var(--card, #1c1c1c)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            {/* ORDER HEADER */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                paddingBottom: "14px",
                marginBottom: "14px",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <strong style={{ fontSize: "1.1rem", color: "#fff" }}>
                  Request #{order.id}
                </strong>
                <div style={{ fontSize: "0.85rem", color: "#aaa", marginTop: "4px" }}>
                  Customer: <span style={{ color: "#fff" }}>{order.customer_name}</span> ({order.customer_email})
                  {order.customer_phone && ` • Phone: ${order.customer_phone}`}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#777", marginTop: "2px" }}>
                  Placed on: {new Date(order.created_at).toLocaleString()}
                </div>
              </div>

              {/* STATUS CONTROLLER */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#aaa" }}>Status:</span>
                <select
                  value={order.status}
                  disabled={updatingId === order.id}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#2a2a2a",
                    color:
                      order.status === "Pending"
                        ? "#f5a623"
                        : order.status === "Accepted"
                        ? "#4caf50"
                        : order.status === "Completed"
                        ? "#2196f3"
                        : "#aaa",
                    border: "1px solid #444",
                    fontWeight: "600",
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Ready for Pickup">Ready for In-Store Try</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* ORDER ITEMS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "#141414",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {/* THUMBNAIL (CLICK TO ENLARGE) */}
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        onClick={() =>
                          setPreviewImage({
                            url: item.product_image,
                            title: item.product_name,
                          })
                        }
                        title="Click to view full image"
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          cursor: "pointer",
                          border: "1px solid #333",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          background: "#222",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#666",
                        }}
                      >
                        ◈
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: "600", color: "#eee" }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#999" }}>
                        Category: {item.product_category}
                      </div>
                    </div>
                  </div>

                  {/* SIZE & QUANTITY SPECIFICATION */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span
                      style={{
                        background: "#2b2b2b",
                        border: "1px solid #444",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        color: "#fff",
                      }}
                    >
                      Size: {item.size}
                    </span>

                    <span style={{ fontSize: "0.9rem", color: "#bbb" }}>
                      Qty: <strong style={{ color: "#fff" }}>{item.quantity}</strong>
                    </span>

                    <strong style={{ fontSize: "1rem", color: "var(--accent, #e5a93b)", minWidth: "80px", textAlign: "right" }}>
                      ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              ))}
            </div>

            {/* TOTAL FOOTER */}
            <div
              style={{
                marginTop: "14px",
                paddingTop: "10px",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ color: "#888", fontSize: "0.9rem" }}>Total Request Value:</span>
              <strong style={{ fontSize: "1.2rem", color: "#fff" }}>
                ₹{Number(order.total_price).toLocaleString("en-IN")}
              </strong>
            </div>
          </article>
        ))}
      </div>

      {/* FULL IMAGE PREVIEW MODAL */}
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
