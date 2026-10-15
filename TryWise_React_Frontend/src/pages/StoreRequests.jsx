import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchOrders, updateOrderStatus } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * StoreRequests Component:
 * Dedicated dashboard for Store Owners to view customer "Bag It" requests,
 * inspect requested clothing sizes/quantities, and update order statuses.
 */
export default function StoreRequests({ onOpenLogin }) {
  const { user, tokens } = useAuth();
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

  if (!user || user.role !== "store_owner") {
    return (
      <main className="page" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🔒</div>
        <h2>Store Owner Access Only</h2>
        <p style={{ color: "var(--muted)", margin: "12px 0 24px", lineHeight: "1.6" }}>
          This portal is reserved for registered store owners to manage customer trial requests. Please sign in with your store owner credentials.
        </p>
        <button
          className="primary"
          onClick={() => onOpenLogin && onOpenLogin("store_owner")}
        >
          Sign In as Store Owner ↗
        </button>
      </main>
    );
  }

  return (
    <main className="page" style={{ maxWidth: "1040px", margin: "0 auto", padding: "40px 6vw" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <label>STORE OWNER DASHBOARD</label>
          <h1 style={{ margin: "4px 0 10px 0" }}>
            Customer <em>Bag Requests.</em>
          </h1>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Review incoming in-store trial requests and prepare sizes for customers.
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="secondary"
          style={{ padding: "10px 20px" }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <p style={{ color: "var(--muted)", margin: "20px 0" }}>Loading requests...</p>}
      {error && <div className="error-badge">{error}</div>}

      {!loading && orders.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-title">No Bag It requests received yet.</div>
          <div className="empty-text">Customer requests will appear here in real-time.</div>
        </div>
      )}

      {/* ORDERS LIST */}
      <div>
        {orders.map((order) => (
          <article key={order.id} className="order-card">
            {/* ORDER HEADER */}
            <div className="order-card-header">
              <div>
                <h3 className="order-id-title">Request #{order.id}</h3>
                <div className="order-customer-meta">
                  Customer: <strong>{order.customer_name}</strong> ({order.customer_email})
                  {order.customer_phone && ` • Phone: ${order.customer_phone}`}
                </div>
                <div className="order-date-text">
                  Placed on: {new Date(order.created_at).toLocaleString()}
                </div>
              </div>

              {/* STATUS CONTROLLER */}
              <div className="order-status-wrap">
                <span className="order-status-label">Status:</span>
                <select
                  value={order.status}
                  disabled={updatingId === order.id}
                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  className={`status-dropdown status-${order.status.replace(/\s+/g, "-")}`}
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
            <div className="order-items-list">
              {order.items.map((item) => (
                <div key={item.id} className="order-item-row">
                  <div className="order-item-left">
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
                        className="order-item-thumb"
                      />
                    ) : (
                      <div className="order-item-thumb-placeholder">◈</div>
                    )}

                    <div>
                      <div className="order-item-name">{item.product_name}</div>
                      <div className="order-item-cat">
                        Category: {item.product_category}
                      </div>
                    </div>
                  </div>

                  {/* SIZE & QUANTITY SPECIFICATION */}
                  <div className="order-item-right">
                    <span className="order-item-size-badge">
                      Size: {item.size}
                    </span>

                    <span className="order-item-qty">
                      Qty: <strong>{item.quantity}</strong>
                    </span>

                    <span className="order-item-price">
                      ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* TOTAL FOOTER */}
            <div className="order-footer">
              <span>Total Request Value:</span>
              <strong>
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
