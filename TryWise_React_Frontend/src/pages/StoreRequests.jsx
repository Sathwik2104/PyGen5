import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchOrders, updateOrderStatusWithItems, fetchStoreRevenue } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * StoreRequests Component:
 * Dedicated dashboard for Store Owners featuring:
 * 1. Revenue & Performance Analytics:
 *    - Total Revenue, Completed Trials, Items Sold, Items Restocked.
 *    - Period filters: This Month, This Week, All Time, or Custom Month.
 * 2. In-Store Trial Fulfillment & Restocking:
 *    - Per-item toggles: [Purchased] vs [Restock to Rack].
 *    - Automatic restocking of unpurchased items upon completion.
 *    - Total order cancellation automatically restocks all reserved items.
 */
export default function StoreRequests({ onOpenLogin }) {
  const { user, tokens } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Per-order, per-item checkout decisions: { [orderId]: { [itemId]: 'purchased' | 'restocked' } }
  const [itemDecisions, setItemDecisions] = useState({});

  // Revenue analytics state
  const [revenueData, setRevenueData] = useState(null);
  const [revenuePeriod, setRevenuePeriod] = useState("this_month");
  const [customYear, setCustomYear] = useState(new Date().getFullYear());
  const [customMonth, setCustomMonth] = useState(new Date().getMonth() + 1);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchOrders(tokens?.access);
      setOrders(data);

      // Initialize default decisions for active orders:
      // If item was already restocked, set 'restocked'; otherwise default to 'purchased'
      const initialDecisions = {};
      data.forEach((order) => {
        initialDecisions[order.id] = {};
        order.items.forEach((item) => {
          initialDecisions[order.id][item.id] = item.is_restocked || item.status === "restocked" ? "restocked" : "purchased";
        });
      });
      setItemDecisions(initialDecisions);
    } catch (err) {
      setError(err.message || "Failed to load customer requests.");
    } finally {
      setLoading(false);
    }
  };

  const loadRevenue = async () => {
    if (!tokens?.access) return;
    try {
      setRevenueLoading(true);
      const data = await fetchStoreRevenue(
        revenuePeriod,
        tokens.access,
        revenuePeriod === "custom" ? customYear : null,
        revenuePeriod === "custom" ? customMonth : null
      );
      setRevenueData(data);
    } catch (err) {
      console.error("Revenue fetch error:", err);
    } finally {
      setRevenueLoading(false);
    }
  };

  useEffect(() => {
    if (tokens?.access) {
      loadOrders();
      loadRevenue();
    }
  }, [tokens, revenuePeriod, customYear, customMonth]);

  // Toggle item action (purchased vs restocked)
  const handleToggleItemAction = (orderId, itemId, action) => {
    setItemDecisions((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemId]: action,
      },
    }));
  };

  // Submit status update with item actions
  const handleStatusChange = async (orderId, newStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (newStatus === "Cancelled") {
      if (
        !window.confirm(
          `Are you sure you want to cancel Request #${orderId}? All reserved items will be automatically restocked into store inventory.`
        )
      ) {
        return;
      }
    }

    try {
      setUpdatingId(orderId);

      // Build item actions payload with robust database fallback
      const orderDecisions = itemDecisions[orderId] || {};
      const item_actions = order.items.map((item) => {
        const decision =
          orderDecisions[item.id] !== undefined
            ? orderDecisions[item.id]
            : item.is_restocked || item.status === "restocked"
            ? "restocked"
            : "purchased";
        return {
          item_id: item.id,
          action: decision,
        };
      });

      const payload = {
        status: newStatus,
        item_actions: newStatus === "Completed" ? item_actions : [],
      };

      const updated = await updateOrderStatusWithItems(orderId, payload, tokens?.access);

      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, ...updated } : ord))
      );

      // Re-synchronize item decisions from the updated order items
      if (updated?.items) {
        setItemDecisions((prev) => {
          const updatedOrderDecs = { ...(prev[orderId] || {}) };
          updated.items.forEach((it) => {
            updatedOrderDecs[it.id] =
              it.is_restocked || it.status === "restocked" ? "restocked" : "purchased";
          });
          return {
            ...prev,
            [orderId]: updatedOrderDecs,
          };
        });
      }

      // Refresh revenue if completing or cancelling
      if (newStatus === "Completed" || newStatus === "Cancelled") {
        loadRevenue();
      }
    } catch (err) {
      alert(err.message || "Failed to update order status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user || user.role !== "store_owner") {
    return (
      <main className="page store-guard-panel">
        <div className="store-guard-icon">🔒</div>
        <h2>Store Owner Access Only</h2>
        <p className="store-guard-text">
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
    <main className="page store-page-wrap">
      {/* HEADER */}
      <div className="store-header-row">
        <div>
          <label>STORE OWNER PORTAL</label>
          <h1 className="store-header-title">
            Store Management & <em>Bag Requests.</em>
          </h1>
          <p className="store-header-sub">
            Inspect in-store trial requests, mark purchased items, restock unpurchased picks, and monitor total revenue.
          </p>
        </div>
        <button
          onClick={() => {
            loadOrders();
            loadRevenue();
          }}
          className="secondary"
          style={{ padding: "10px 20px" }}
        >
          ↻ Refresh All
        </button>
      </div>

      {/* REVENUE & ANALYTICS DASHBOARD */}
      <section className="revenue-dashboard-panel">
        <div className="revenue-panel-header">
          <div>
            <h3 className="revenue-panel-title">
              Store Revenue & In-Store Trial <em>Performance.</em>
            </h3>
            <span className="revenue-panel-sub">
              Financial metrics from finalized trial purchases & active fitting queue
            </span>
          </div>

          {/* PERIOD FILTERS */}
          <div className="revenue-filters-row">
            {[
              { label: "This Month", key: "this_month" },
              { label: "This Week", key: "this_week" },
              { label: "All Time", key: "all" },
              { label: "Select Month", key: "custom" },
            ].map(({ label, key }) => (
              <button
                key={key}
                onClick={() => setRevenuePeriod(key)}
                className={`pill-filter-btn ${revenuePeriod === key ? "active" : ""}`}
                style={{
                  padding: "8px 18px",
                  borderRadius: "25px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "1px solid var(--line)",
                  background: revenuePeriod === key ? "var(--ink)" : "var(--paper-tint)",
                  color: revenuePeriod === key ? "#ffffff" : "var(--ink)",
                  transition: "all 0.2s ease",
                }}
              >
                {label}
              </button>
            ))}

            {/* CUSTOM MONTH/YEAR PICKER */}
            {revenuePeriod === "custom" && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginLeft: "6px" }}>
                <select
                  value={customMonth}
                  onChange={(e) => setCustomMonth(Number(e.target.value))}
                  className="revenue-select"
                >
                  {[
                    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                  ].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={customYear}
                  onChange={(e) => setCustomYear(Number(e.target.value))}
                  className="revenue-select"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="revenue-grid">
          {/* TOTAL REALIZED REVENUE */}
          <div className="revenue-metric-card">
            <span className="revenue-metric-label">
              Realized Revenue
            </span>
            <div className="revenue-metric-val">
              ₹{revenueLoading ? "..." : (revenueData?.total_revenue || 0).toLocaleString("en-IN")}
            </div>
            <span className="revenue-metric-sub" style={{ color: "#15803d", fontWeight: "600" }}>✓ Finalized purchases</span>
          </div>

          {/* ACTIVE TRIAL QUEUE VALUE */}
          <div className="revenue-metric-card">
            <span className="revenue-metric-label">
              Active Queue Value
            </span>
            <div className="revenue-metric-val">
              ₹{orders
                .filter((o) => o.status === "Pending" || o.status === "Accepted" || o.status === "Ready for Pickup")
                .reduce((sum, o) => sum + Number(o.total_price), 0)
                .toLocaleString("en-IN")}
            </div>
            <span className="revenue-metric-sub">In-store prospective trials</span>
          </div>

          {/* COMPLETED ORDERS */}
          <div className="revenue-metric-card">
            <span className="revenue-metric-label">
              Completed Visits
            </span>
            <div className="revenue-metric-val">
              {revenueLoading ? "..." : (revenueData?.completed_orders_count || 0)}
            </div>
            <span className="revenue-metric-sub" style={{ color: "var(--accent)", fontWeight: "600" }}>Fulfilled trial orders</span>
          </div>

          {/* ITEMS SOLD & RESTOCKED */}
          <div className="revenue-metric-card">
            <span className="revenue-metric-label">
              Inventory Balance
            </span>
            <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "var(--ink)", marginTop: "8px" }}>
              <span style={{ color: "#15803d" }}>+{revenueLoading ? "..." : (revenueData?.items_sold_count || 0)}</span>
              <span style={{ color: "var(--muted)", margin: "0 6px", fontSize: "1rem" }}>/</span>
              <span style={{ color: "#b45309" }}>{revenueLoading ? "..." : (revenueData?.items_restocked_count || 0)} restocked</span>
            </div>
            <span className="revenue-metric-sub">Sold vs returned to rack</span>
          </div>
        </div>
      </section>


      {/* FEEDBACK BADGES */}
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
        {orders.map((order) => {
          const isFinished = order.status === "Completed" || order.status === "Cancelled";
          const orderDecs = itemDecisions[order.id] || {};

          // Calculate live estimated bill for items marked as purchased with robust fallback
          const calculatedBill = order.items.reduce((sum, item) => {
            const decision =
              orderDecs[item.id] !== undefined
                ? orderDecs[item.id]
                : item.is_restocked || item.status === "restocked"
                ? "restocked"
                : "purchased";
            if (decision === "purchased") {
              return sum + Number(item.price) * item.quantity;
            }
            return sum;
          }, 0);

          const purchasedCount = order.items.filter((it) => {
            const decision =
              orderDecs[it.id] !== undefined
                ? orderDecs[it.id]
                : it.is_restocked || it.status === "restocked"
                ? "restocked"
                : "purchased";
            return decision === "purchased";
          }).length;

          const restockedCount = order.items.filter((it) => {
            const decision =
              orderDecs[it.id] !== undefined
                ? orderDecs[it.id]
                : it.is_restocked || it.status === "restocked"
                ? "restocked"
                : "purchased";
            return decision === "restocked";
          }).length;

          return (
            <article key={order.id} className="order-card" style={{ marginBottom: "28px" }}>
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
                  {order.status === "Ready for Pickup" && order.expires_at && (
                    <div className="trial-timer-badge">
                      ⏰ Trial Deadline: Reserved until {new Date(order.expires_at).toLocaleString()}
                    </div>
                  )}
                  {order.status === "Cancelled" && order.expires_at && new Date(order.expires_at) <= new Date(order.updated_at) && (
                    <div className="trial-timer-badge expired">
                      ✕ Cancelled (Trial Window Expired)
                    </div>
                  )}
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

              {/* IN-STORE TRIAL CHECKLIST GUIDE (IF READY/ACCEPTED) */}
              {!isFinished && (
                <div className="trial-checkout-guide">
                  <span>
                    🛍️ <strong>Trial Checkout:</strong> Check off items customer buys vs items to restock back to the rack.
                  </span>
                  <span style={{ fontWeight: "700" }}>
                    Purchased: {purchasedCount} | To Restock: {restockedCount}
                  </span>
                </div>
              )}

              {/* ORDER ITEMS */}
              <div className="order-items-list">
                {order.items.map((item) => {
                  const currentDecision =
                    orderDecs[item.id] !== undefined
                      ? orderDecs[item.id]
                      : item.is_restocked || item.status === "restocked"
                      ? "restocked"
                      : "purchased";

                  return (
                    <div key={item.id} className="order-item-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                      <div className="order-item-left">
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

                      {/* SIZE, QUANTITY & RESTOCK CONTROLS */}
                      <div className="order-item-right" style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span className="order-item-size-badge">
                          Size: {item.size}
                        </span>

                        <span className="order-item-qty">
                          Qty: <strong>{item.quantity}</strong>
                        </span>

                        <span className="order-item-price">
                          ₹{(Number(item.price) * item.quantity).toLocaleString("en-IN")}
                        </span>

                        {/* FULFILLMENT / RESTOCK TOGGLE */}
                        {isFinished ? (
                          <span
                            className={`order-item-decision-pill ${
                              item.is_restocked || item.status === "restocked" ? "restocked" : "purchased"
                            }`}
                          >
                            {item.is_restocked || item.status === "restocked" ? "⟲ Restocked to Rack" : "✓ Purchased"}
                          </span>
                        ) : (
                          <div className="order-item-decision-toggle">
                            <button
                              type="button"
                              onClick={() => handleToggleItemAction(order.id, item.id, "purchased")}
                              className={`decision-toggle-btn ${
                                currentDecision === "purchased" ? "bought-active" : "bought-inactive"
                              }`}
                            >
                              ✓ Bought
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleItemAction(order.id, item.id, "restocked")}
                              className={`decision-toggle-btn ${
                                currentDecision === "restocked" ? "restock-active" : "restock-inactive"
                              }`}
                            >
                              ⟲ Restock
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FOOTER & TOTAL BILL SUMMARY */}
              <div className="order-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Original Bag Total: </span>
                  <strong style={{ textDecoration: order.final_price != null && Number(order.final_price) !== Number(order.total_price) ? "line-through" : "none", color: "#64748b" }}>
                    ₹{Number(order.total_price).toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* FINAL PAID BILL */}
                {order.final_price != null ? (
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.9rem", color: "#10b981", fontWeight: "700" }}>Final Bill Paid: </span>
                    <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>
                      ₹{Number(order.final_price).toLocaleString("en-IN")}
                    </strong>
                  </div>
                ) : !isFinished ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Calculated Trial Bill: </span>
                      <strong style={{ fontSize: "1.15rem", color: "#0f172a" }}>
                        ₹{calculatedBill.toLocaleString("en-IN")}
                      </strong>
                    </div>

                    <button
                      className="primary"
                      disabled={updatingId === order.id}
                      onClick={() => handleStatusChange(order.id, "Completed")}
                      style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                    >
                      {updatingId === order.id ? "Processing..." : "✓ Complete & Restock Others"}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
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
