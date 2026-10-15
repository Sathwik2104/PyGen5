import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchProducts, updateProductStock, deleteProduct } from "../services/api.js";
import ImageModal from "../components/ImageModal.jsx";
import { recordProductVisit } from "../services/recentHistory.js";

/**
 * Products Page Component:
 * - Customers: Browse collection, pick clothing sizes (with <5 low-stock alert,
 *   hidden exact count when >=5), preview images, and add to "Bag It".
 * - Store Owners: View exact inventory quantities per size (S, M, L, XL),
 *   use inline [+] / [-] buttons to instantly adjust stock, add new products,
 *   or delete items.
 */
export default function Products({ category, setCategory, addToCart, onOpenAddProduct, onOpenLogin }) {
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

  const activeCategory =
    typeof category === "string" && (category === "Women" || category === "Men")
      ? category
      : "All";

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts(activeCategory);
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
    if (user) {
      loadProducts();
    }
  }, [category, user]);

  // Handle customer choosing a size
  const handleSelectSize = (product, size) => {
    setSelectedSizes((prev) => ({
      ...prev,
      [product.id]: size,
    }));
    recordProductVisit(product);
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

  // Guard: unauthenticated guests must sign in to browse collection
  if (!user) {
    return (
      <main className="page" style={{ maxWidth: "600px", margin: "60px auto", textAlign: "center" }}>
        <div className="empty" style={{ padding: "50px 30px" }}>
          <div style={{ fontSize: "2.8rem", marginBottom: "12px" }}>🔒</div>
          <label>MEMBERS EXCLUSIVE</label>
          <h2 style={{ fontSize: "28px", margin: "12px 0 8px" }}>Sign In to Explore Collection</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px", lineHeight: "1.6" }}>
            Log in to view the full TryWise collection, check real-time store inventory, and Bag It for in-store trial.
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
    <main className="page" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 6vw" }}>
      <div className="products-header">
        <div>
          <label>TRYWISE COLLECTION</label>
          <h1>
            Products <em>you'll want.</em>
          </h1>
          <p>
            {isStoreOwner
              ? "Manage store inventory, adjust size counts, and add new products."
              : "Browse the collection and Bag It before your store visit."}
          </p>
        </div>

        {/* STORE OWNER ACTION: ADD PRODUCT BUTTON */}
        {isStoreOwner && (
          <button className="primary" onClick={onOpenAddProduct}>
            + Add New Product
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="filters">
        {["All", "Women", "Men"].map((item) => (
          <button
            key={item}
            className={activeCategory === item ? "sel" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: "var(--muted)", margin: "20px 0" }}>Loading collection...</p>}
      {error && <div className="error-badge">{error}</div>}

      {!loading && products.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🛍</div>
          <div className="empty-title">No products found in this category.</div>
          <div className="empty-text">
            {isStoreOwner
              ? "Click '+ Add New Product' above to stock your store!"
              : "Check back soon for new arrivals."}
          </div>
        </div>
      )}

      {/* PRODUCT GRID */}
      <div className="grid">
        {products.map((product) => {
          const currentSize = selectedSizes[product.id] || "S";
          const stockInfo = getStockInfo(product, currentSize);

          return (
            <article className="product-card" key={product.id}>
              {/* IMAGE / THUMBNAIL (CLICK TO ZOOM) */}
              <div
                className={`product-img-box ${product.image ? "clickable" : ""}`}
                onClick={() => {
                  recordProductVisit(product);
                  if (product.image) {
                    setPreviewImage({
                      url: product.image,
                      title: product.name,
                    });
                  }
                }}
              >
                {product.image ? (
                  <img src={product.image} alt={product.name} />
                ) : (
                  <span className="product-placeholder">◈</span>
                )}

                <span className="badge-category">{product.category}</span>

                {product.image && (
                  <span className="badge-zoom">🔍 Zoom</span>
                )}
              </div>

              {/* CARD DETAILS */}
              <div className="product-info">
                <div className="product-title-row">
                  <h3 className="product-title">{product.name}</h3>
                  <span className="product-price-tag">
                    ₹{Number(product.price).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* STORE OWNER CONTROLS (FULL INVENTORY TRANSPARENCY & ADJUSTERS) */}
                {isStoreOwner ? (
                  <div className="store-inventory-panel">
                    <div className="store-inv-header">
                      <span>Manage Size Stock</span>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="product-delete-btn"
                        title="Delete product"
                      >
                        🗑 Delete
                      </button>
                    </div>

                    <div className="inventory-grid">
                      {[
                        { label: "S", key: "size_s" },
                        { label: "M", key: "size_m" },
                        { label: "L", key: "size_l" },
                        { label: "XL", key: "size_xl" },
                      ].map(({ label, key }) => {
                        const qty = product[key] || 0;
                        const statusClass = qty === 0 ? "zero" : qty < 5 ? "low" : "ok";
                        return (
                          <div key={key} className="inventory-cell">
                            <span className="inv-size-tag">{label}</span>
                            <span className={`inv-qty-num ${statusClass}`}>{qty}</span>
                            <div className="inv-stepper-row">
                              <button
                                className="inv-step-btn"
                                onClick={() => handleStockChange(product.id, key, -1)}
                                disabled={qty <= 0 || stockUpdating[`${product.id}_${key}`]}
                                title="Decrease stock"
                              >
                                -
                              </button>
                              <button
                                className="inv-step-btn"
                                onClick={() => handleStockChange(product.id, key, 1)}
                                disabled={stockUpdating[`${product.id}_${key}`]}
                                title="Increase stock"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* CUSTOMER CONTROLS (SIZE SELECTOR & URGENCY STOCK BADGES) */
                  <div className="size-selector-wrap">
                    <span className="size-selector-label">Select Size:</span>
                    <div className="size-btn-group">
                      {["S", "M", "L", "XL"].map((size) => {
                        const count = product[`size_${size.toLowerCase()}`] || 0;
                        const isOut = count === 0;
                        const isSelected = currentSize === size;

                        return (
                          <button
                            key={size}
                            onClick={() => !isOut && handleSelectSize(product, size)}
                            disabled={isOut}
                            title={isOut ? `Size ${size} Out of Stock` : `Select Size ${size}`}
                            className={`size-picker-btn ${isSelected ? "active" : ""}`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>

                    {/* DYNAMIC STOCK VISIBILITY BADGE */}
                    <div className="stock-badge-container">
                      {stockInfo.status === "low_stock" && (
                        <span className="stock-pill low-stock">
                          {stockInfo.text}
                        </span>
                      )}
                      {stockInfo.status === "in_stock" && (
                        <span className="stock-pill in-stock">
                          ✓ {stockInfo.text}
                        </span>
                      )}
                      {stockInfo.status === "out_of_stock" && (
                        <span className="stock-pill out-of-stock">
                          ✕ {stockInfo.text}
                        </span>
                      )}
                    </div>

                    {/* + BAG IT BUTTON */}
                    <button
                      onClick={() => {
                        recordProductVisit(product);
                        addToCart({
                          productId: product.id,
                          name: product.name,
                          category: product.category,
                          price: Number(product.price),
                          image: product.image,
                          size: currentSize,
                          availableStock: product[`size_${currentSize.toLowerCase()}`] || 0,
                        });
                      }}
                      disabled={!stockInfo.isAvailable}
                      className="btn-bag-it"
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
