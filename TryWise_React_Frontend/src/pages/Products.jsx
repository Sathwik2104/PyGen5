import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchProducts, updateProductStock, deleteProduct } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";

/**
 * Products Page Component:
 * - Customers: Browse collection, pick clothing sizes (with <5 low-stock alert,
 *   hidden exact count when >=5), preview images, and add to "Bag It".
 * - Store Owners: View exact inventory quantities per size (S, M, L, XL),
 *   use inline [+] / [-] buttons to instantly adjust stock, add new products,
 *   or delete items.
 */
export default function Products({ category, setCategory, addToCart, onOpenAddProduct }) {
  const { user, tokens } = useAuth();
  const isStoreOwner = user?.role === "store_owner";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected size per product id for customers (e.g., { 1: 'M', 2: 'S' })
  const [selectedSizes, setSelectedSizes] = useState({});

  // Image modal state
  const [previewImage, setPreviewImage] = useState(null);

  // Stock updating loader indicator per product
  const [stockUpdating, setStockUpdating] = useState({});

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts(category);
      setProducts(data);

      // Initialize default selected size for each product (pick first available in-stock size)
      const initialSizes = {};
      data.forEach((p) => {
        const availableSize =
          p.size_s > 0 ? "S" : p.size_m > 0 ? "M" : p.size_l > 0 ? "L" : p.size_xl > 0 ? "XL" : "S";
        initialSizes[p.id] = availableSize;
      });
      setSelectedSizes(initialSizes);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category]);

  // Handle customer choosing a size
  const handleSelectSize = (productId, size) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [productId]: size,
    }));
  };

  // Store Owner: Quick inline stock adjustment
  const handleStockChange = async (productId, sizeKey, delta) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const currentVal = product[sizeKey] || 0;
    const newVal = Math.max(0, currentVal + delta);
    if (newVal === currentVal) return;

    try {
      setStockUpdating((prev) => ({ ...prev, [`${productId}_${sizeKey}`]: true }));
      await updateProductStock(productId, { [sizeKey]: newVal }, tokens?.access);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, [sizeKey]: newVal } : p))
      );
    } catch (err) {
      alert(err.message || "Failed to update stock.");
    } finally {
      setStockUpdating((prev) => ({ ...prev, [`${productId}_${sizeKey}`]: false }));
    }
  };

  // Store Owner: Delete product
  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}" from the store?`)) {
      return;
    }

    try {
      await deleteProduct(productId, tokens?.access);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      alert(err.message || "Failed to delete product.");
    }
  };

  // Helper to determine customer stock text and availability for selected size
  const getStockInfo = (product, size) => {
    const field = `size_${size.toLowerCase()}`;
    const count = product[field] || 0;

    if (count === 0) {
      return { status: "out_of_stock", text: `Out of Stock in Size ${size}`, isAvailable: false };
    }
    if (count < 5) {
      // Urgency alert: exact count shown when under 5
      return {
        status: "low_stock",
        text: `⚡ Only ${count} left in Size ${size}!`,
        isAvailable: true,
        count,
      };
    }
    // Clean "In Stock" when 5 or more (exact count hidden from customer)
    return { status: "in_stock", text: `In Stock (Size ${size})`, isAvailable: true, count };
  };

  return (
    <main className="page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "0.85rem", letterSpacing: "1px", color: "var(--accent, #e5a93b)" }}>
            TRYWISE COLLECTION
          </label>
          <h1 style={{ margin: "4px 0" }}>
            Products <em>you'll want.</em>
          </h1>
          <p style={{ color: "#888", margin: 0 }}>
            {isStoreOwner
              ? "Manage store inventory, adjust size counts, and add new products."
              : "Browse the collection and Bag It before your store visit."}
          </p>
        </div>

        {/* STORE OWNER ACTION: ADD PRODUCT BUTTON */}
        {isStoreOwner && (
          <button
            className="primary"
            onClick={onOpenAddProduct}
            style={{
              padding: "10px 20px",
              borderRadius: "24px",
              fontWeight: "600",
              boxShadow: "0 4px 14px rgba(229, 169, 59, 0.3)",
            }}
          >
            + Add New Product
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="filters" style={{ margin: "24px 0" }}>
        {["All", "Women", "Men"].map((item) => (
          <button
            key={item}
            className={category === item ? "sel" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "#aaa" }}>Loading collection...</p>}
      {error && <div className="error-badge">{error}</div>}

      {!loading && products.length === 0 && (
        <div className="empty" style={{ padding: "40px 20px", textAlign: "center", background: "#181818", borderRadius: "12px" }}>
          No products found in this category.
          <br />
          <small style={{ color: "#777" }}>
            {isStoreOwner ? "Click '+ Add New Product' above to stock your store!" : "Check back soon for new arrivals."}
          </small>
        </div>
      )}

      {/* PRODUCT GRID */}
      <div className="grid">
        {products.map((product) => {
          const currentSize = selectedSizes[product.id] || "S";
          const stockInfo = getStockInfo(product, currentSize);

          return (
            <article
              className="product"
              key={product.id}
              style={{
                display: "flex",
                flexDirection: "column",
                position: "relative",
                background: "var(--card, #1c1c1c)",
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {/* IMAGE / THUMBNAIL (CLICK TO ZOOM) */}
              <div
                className="pic"
                onClick={() =>
                  product.image &&
                  setPreviewImage({
                    url: product.image,
                    title: product.name,
                  })
                }
                style={{
                  cursor: product.image ? "pointer" : "default",
                  position: "relative",
                  height: "220px",
                  background: "#111",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <b style={{ fontSize: "2.5rem", color: "#444" }}>◈</b>
                )}

                <small
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "rgba(0, 0, 0, 0.75)",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    color: "#fff",
                    textTransform: "uppercase",
                  }}
                >
                  {product.category}
                </small>

                {product.image && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    🔍 Zoom
                  </span>
                )}
              </div>

              {/* CARD DETAILS */}
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: "1.1rem", color: "#fff" }}>
                    {product.name}
                  </h3>
                  <strong style={{ fontSize: "1.15rem", color: "var(--accent, #e5a93b)", whiteSpace: "nowrap" }}>
                    ₹{Number(product.price).toLocaleString("en-IN")}
                  </strong>
                </div>

                {/* ============================================================== */}
                {/* STORE OWNER CONTROLS (FULL INVENTORY TRANSPARENCY & ADJUSTERS) */}
                {/* ============================================================== */}
                {isStoreOwner ? (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px",
                      background: "#141414",
                      borderRadius: "8px",
                      border: "1px solid #333",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#aaa", display: "block", marginBottom: "6px" }}>
                      Manage Size Stock (In Store):
                    </span>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {[
                        { label: "S", key: "size_s" },
                        { label: "M", key: "size_m" },
                        { label: "L", key: "size_l" },
                        { label: "XL", key: "size_xl" },
                      ].map(({ label, key }) => (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            background: "#222",
                            padding: "4px",
                            borderRadius: "6px",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#fff" }}>
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: "600",
                              color: product[key] === 0 ? "#f44336" : product[key] < 5 ? "#ff9800" : "#4caf50",
                            }}
                          >
                            {product[key]}
                          </span>
                          <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
                            <button
                              onClick={() => handleStockChange(product.id, key, -1)}
                              disabled={product[key] <= 0 || stockUpdating[`${product.id}_${key}`]}
                              style={{
                                width: "20px",
                                height: "20px",
                                padding: 0,
                                fontSize: "0.75rem",
                                borderRadius: "3px",
                                background: "#333",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleStockChange(product.id, key, 1)}
                              disabled={stockUpdating[`${product.id}_${key}`]}
                              style={{
                                width: "20px",
                                height: "20px",
                                padding: 0,
                                fontSize: "0.75rem",
                                borderRadius: "3px",
                                background: "#444",
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ff5252",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          padding: "2px 6px",
                        }}
                      >
                        🗑 Delete Product
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ============================================================== */
                  /* CUSTOMER CONTROLS (SIZE SELECTOR & URGENCY STOCK BADGES)      */
                  /* ============================================================== */
                  <div style={{ marginTop: "auto", paddingTop: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#aaa" }}>Select Size:</span>
                      {["S", "M", "L", "XL"].map((size) => {
                        const count = product[`size_${size.toLowerCase()}`] || 0;
                        const isOut = count === 0;
                        const isSelected = currentSize === size;

                        return (
                          <button
                            key={size}
                            onClick={() => !isOut && handleSelectSize(product.id, size)}
                            disabled={isOut}
                            title={isOut ? "Out of Stock" : `Select Size ${size}`}
                            style={{
                              width: "32px",
                              height: "32px",
                              padding: 0,
                              borderRadius: "6px",
                              fontSize: "0.85rem",
                              fontWeight: "600",
                              background: isSelected ? "var(--accent, #e5a93b)" : isOut ? "#222" : "#2e2e2e",
                              color: isSelected ? "#000" : isOut ? "#555" : "#fff",
                              border: isSelected ? "1px solid #fff" : "1px solid #444",
                              textDecoration: isOut ? "line-through" : "none",
                              cursor: isOut ? "not-allowed" : "pointer",
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>

                    {/* DYNAMIC STOCK VISIBILITY BADGE */}
                    <div style={{ minHeight: "22px", marginBottom: "10px" }}>
                      {stockInfo.status === "low_stock" && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "#ff9800",
                            fontWeight: "600",
                            background: "rgba(255, 152, 0, 0.12)",
                            padding: "3px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          {stockInfo.text}
                        </span>
                      )}
                      {stockInfo.status === "in_stock" && (
                        <span style={{ fontSize: "0.8rem", color: "#4caf50", fontWeight: "500" }}>
                          ✓ {stockInfo.text}
                        </span>
                      )}
                      {stockInfo.status === "out_of_stock" && (
                        <span style={{ fontSize: "0.8rem", color: "#f44336", fontWeight: "500" }}>
                          ✕ {stockInfo.text}
                        </span>
                      )}
                    </div>

                    {/* + BAG IT BUTTON */}
                    <button
                      onClick={() =>
                        addToCart({
                          productId: product.id,
                          name: product.name,
                          category: product.category,
                          price: Number(product.price),
                          image: product.image,
                          size: currentSize,
                          availableStock: product[`size_${currentSize.toLowerCase()}`] || 0,
                        })
                      }
                      disabled={!stockInfo.isAvailable}
                      className="primary full"
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        opacity: stockInfo.isAvailable ? 1 : 0.5,
                        cursor: stockInfo.isAvailable ? "pointer" : "not-allowed",
                      }}
                    >
                      {stockInfo.isAvailable ? `+ Bag It (Size ${currentSize})` : "Sold Out"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* FULL IMAGE MODAL */}
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
