import React, { useState, useEffect } from "react";
import { getRecentProducts } from "../services/recentHistory.js";
import { fetchProducts } from "../services/api.js";

export default function Home({
  go,
  user,
  setPage,
  setCategory,
  setLoginModal,
  pendingRequestsCount = 0,
  onOpenAddProduct,
}) {
  const [editItems, setEditItems] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isUserHistory, setIsUserHistory] = useState(false);

  // Load recently viewed products for logged-in customers
  useEffect(() => {
    const loadShowcase = async () => {
      if (user && user.role === "customer") {
        const recent = getRecentProducts();
        if (recent && recent.length > 0) {
          let items = [...recent];
          // If customer has only 1 visited item, fill a second item from catalog for the layered back card
          if (items.length < 2) {
            try {
              const catalog = await fetchProducts("All");
              const remaining = catalog.filter((p) => !items.some((i) => i.id === p.id));
              items = [...items, ...remaining].slice(0, 4);
            } catch (err) {
              // silent fallback
            }
          }
          setEditItems(items.slice(0, 4));
          setIsUserHistory(true);
        } else {
          setEditItems([]);
          setIsUserHistory(false);
        }
      } else {
        setEditItems([]);
        setIsUserHistory(false);
      }
      setCurrentSlide(0);
    };

    loadShowcase();
  }, [user]);

  // Auto-cycle through customer's pieces with a smooth interval
  useEffect(() => {
    if (editItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % editItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [editItems.length]);

  const currentItem = editItems[currentSlide] || null;
  const hasMultipleItems = editItems.length > 1;
  const nextSlide = hasMultipleItems ? (currentSlide + 1) % editItems.length : null;
  const nextItem = nextSlide !== null ? editItems[nextSlide] : null;

  // Handle category tile navigation with auth protection
  const handleCategoryClick = (cat) => {
    if (!user) {
      setLoginModal("customer");
    } else {
      setCategory(cat);
      setPage("products");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const isStoreOwner = user?.role === "store_owner";
  const isCustomer = user?.role === "customer";

  return (
    <main>
      {/* HERO SECTION */}
      <section className="hero">
        <div>
          <label>SMARTER PHYSICAL SHOPPING</label>

          <h1>
            Shop smart.
            <br />
            <em>Try with confidence.</em>
          </h1>

          <p>
            Discover collections from stores before you visit. Browse what you
            love, Bag It, and spend less time searching through racks.
          </p>

          <button className="primary" onClick={() => go("All")}>
            Explore Collection ↗
          </button>

          <button
            className="secondary"
            onClick={() =>
              document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })
            }
          >
            How it works
          </button>
        </div>

        {/* HERO ABSTRACT ART & DYNAMIC HERO ARCH STACK */}
        <div className="art">
          <div className="orb"></div>

          {/* 1. STORE OWNER VIEW */}
          {isStoreOwner && (
            <>
              {/* Back Card Stack Layer */}
              <div
                className="fashion-back-card"
                style={{ cursor: "default", opacity: 0.82 }}
                title="Store Inventory Layer"
              >
                <div
                  className="fashion-fallback"
                  style={{
                    background: "linear-gradient(135deg, #e4d7cc 0%, #d8c8bc 100%)",
                    height: "100%",
                  }}
                >
                  <strong style={{ fontSize: "65px", opacity: 0.35 }}>🏪</strong>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "1.5px",
                      color: "var(--ink)",
                    }}
                  >
                    LIVE CATALOG
                  </span>
                </div>
                <div className="fashion-back-badge">Sync ↗</div>
              </div>

              {/* Front Main Card */}
              <div className="fashion" style={{ cursor: "default" }}>
                <div className="fashion-header">
                  <span className="fashion-badge">STORE OWNER HUB</span>
                  <span className="fashion-tag">Active</span>
                </div>

                <div className="fashion-card-content">
                  <div className="fashion-card-icon">⚡</div>
                  <h3>
                    {pendingRequestsCount > 0
                      ? `${pendingRequestsCount} Active Trial Request${pendingRequestsCount > 1 ? "s" : ""}`
                      : "Store Requests in Sync"}
                  </h3>
                  <p>
                    {pendingRequestsCount > 0
                      ? `You have ${pendingRequestsCount} new customer request${pendingRequestsCount > 1 ? "s" : ""} waiting for in-store preparation.`
                      : "All customer trial requests have been reviewed and prepared."}
                  </p>

                  <div className="fashion-card-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        setPage("store-requests");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      View Store Requests ↗
                    </button>
                    <button
                      className="secondary"
                      onClick={() => onOpenAddProduct && onOpenAddProduct()}
                    >
                      + Add New Product
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="float"
                onClick={() => {
                  setPage("store-requests");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                style={{ cursor: "pointer" }}
                title="View customer requests"
              >
                ✦ <b>Store Hub</b>
                <small>
                  {pendingRequestsCount > 0
                    ? `${pendingRequestsCount} active request(s)`
                    : "Inventory live"}
                </small>
              </div>
            </>
          )}

          {/* 2. GUEST (UNAUTHENTICATED) VIEW */}
          {!user && (
            <>
              {/* Back Card Stack Layer */}
              <div
                className="fashion-back-card"
                onClick={() => setLoginModal("customer")}
                style={{ opacity: 0.85 }}
                title="Sign in to explore curation"
              >
                <div
                  className="fashion-fallback"
                  style={{
                    background: "linear-gradient(135deg, #e4d7cc 0%, #d8c8bc 100%)",
                    height: "100%",
                  }}
                >
                  <strong style={{ fontSize: "65px", opacity: 0.35 }}>✦</strong>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "1.5px",
                      color: "var(--ink)",
                    }}
                  >
                    CURATION STACK
                  </span>
                </div>
                <div className="fashion-back-badge">Preview ↗</div>
              </div>

              {/* Front Main Card */}
              <div
                className="fashion"
                onClick={() => setLoginModal("customer")}
                title="Sign in to personalize your TryWise Edit"
              >
                <div className="fashion-header">
                  <span className="fashion-badge">TRYWISE EDIT</span>
                  <span className="fashion-tag">Preview</span>
                </div>

                <div className="fashion-card-content">
                  <div className="fashion-card-icon">✨</div>
                  <h3>Browse products to get suggestions</h3>
                  <p>
                    Sign in to unlock your personalized TryWise Edit, track visited pieces, and Bag It for seamless in-store fitting.
                  </p>

                  <div className="fashion-card-actions">
                    <button
                      className="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLoginModal("customer");
                      }}
                    >
                      Sign In as Customer ↗
                    </button>
                    <button
                      className="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        go("All");
                      }}
                    >
                      Explore Collection
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="float"
                onClick={() => setLoginModal("customer")}
                style={{ cursor: "pointer" }}
                title="Sign in to unlock personalized suggestions"
              >
                ✦ <b>TryWise Edit</b>
                <small>Browse products to get suggestions</small>
              </div>
            </>
          )}

          {/* 3. LOGGED-IN CUSTOMER VIEW (WITH VISITED PRODUCTS & NEXT PRODUCT ON THE BACK) */}
          {isCustomer && isUserHistory && editItems.length > 0 && (
            <>
              {/* NEXT PRODUCT CARD (VISIBLE AND CLICKABLE BEHIND CURRENT PRODUCT) */}
              {nextItem && (
                <div
                  className="fashion-back-card"
                  onClick={() => setCurrentSlide(nextSlide)}
                  title={`Next piece: ${nextItem.name} (Click to bring forward)`}
                >
                  {nextItem.image ? (
                    <img
                      src={nextItem.image}
                      alt={nextItem.name}
                      className="fashion-back-img"
                    />
                  ) : (
                    <div className="fashion-fallback">
                      <strong>✦</strong>
                      <span>{nextItem.category || "Next Piece"}</span>
                    </div>
                  )}
                  <div className="fashion-back-badge">
                    Next · 0{nextSlide + 1} ↗
                  </div>
                  <div className="fashion-back-info">
                    <strong>{nextItem.name}</strong>
                    <span>
                      ₹{Number(nextItem.price || 1999).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* CURRENT PRODUCT CARD (FOREGROUND) */}
              <div
                className="fashion"
                onClick={() => go(currentItem?.category || "All")}
                title="Click to view piece in collection"
              >
                <div className="fashion-header">
                  <span className="fashion-badge">
                    TRYWISE EDIT · 0{currentSlide + 1}/0{editItems.length}
                  </span>
                  <span className="fashion-tag">Visited</span>
                </div>

                <div className="fashion-img-container">
                  {currentItem?.image ? (
                    <img
                      key={currentSlide}
                      src={currentItem.image}
                      alt={currentItem.name}
                      className="fashion-img fashion-rotate-enter"
                    />
                  ) : (
                    <div className="fashion-fallback">
                      <strong>✦</strong>
                      <span>{currentItem ? currentItem.category : "TryWise"}</span>
                    </div>
                  )}
                </div>

                <div className="fashion-footer">
                  <h4>{currentItem ? currentItem.name : "Curated piece"}</h4>
                  <p>
                    <span>
                      ₹{Number(currentItem?.price || 2499).toLocaleString("en-IN")}
                    </span>
                    <small style={{ color: "#d1c7bd", fontSize: "11px" }}>
                      Explore ↗
                    </small>
                  </p>

                  {/* Slide Navigation Dots */}
                  {editItems.length > 1 && (
                    <div
                      className="fashion-dots"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editItems.map((_, i) => (
                        <button
                          key={i}
                          className={`fashion-dot ${i === currentSlide ? "active" : ""}`}
                          onClick={() => setCurrentSlide(i)}
                          title={`View piece 0${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="float"
                onClick={() => go(currentItem?.category || "All")}
                style={{ cursor: "pointer" }}
                title="Click to view in collection"
              >
                ✦ <b>{currentItem?.name || "Visited Piece"}</b>
                <small>Curated for you</small>
              </div>
            </>
          )}

          {/* 4. LOGGED-IN CUSTOMER WITH NO VISITED HISTORY YET */}
          {isCustomer && (!isUserHistory || editItems.length === 0) && (
            <>
              {/* Back Card Stack Layer */}
              <div
                className="fashion-back-card"
                onClick={() => go("All")}
                style={{ opacity: 0.85 }}
                title="Browse collections"
              >
                <div
                  className="fashion-fallback"
                  style={{
                    background: "linear-gradient(135deg, #e4d7cc 0%, #d8c8bc 100%)",
                    height: "100%",
                  }}
                >
                  <strong style={{ fontSize: "65px", opacity: 0.35 }}>✦</strong>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "1.5px",
                      color: "var(--ink)",
                    }}
                  >
                    TRYWISE EDIT
                  </span>
                </div>
                <div className="fashion-back-badge">Stack ↗</div>
              </div>

              {/* Front Main Card */}
              <div
                className="fashion"
                onClick={() => go("All")}
                title="Click to explore products"
              >
                <div className="fashion-header">
                  <span className="fashion-badge">TRYWISE EDIT</span>
                  <span className="fashion-tag">New</span>
                </div>

                <div className="fashion-card-content">
                  <div className="fashion-card-icon">🛍</div>
                  <h3>Browse products to get suggestions</h3>
                  <p>
                    Explore our collections. Your recently viewed styles will automatically appear here for quick in-store fitting.
                  </p>

                  <div className="fashion-card-actions">
                    <button
                      className="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        go("All");
                      }}
                    >
                      Browse Products ↗
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="float"
                onClick={() => go("All")}
                style={{ cursor: "pointer" }}
                title="Click to browse"
              >
                ✦ <b>Welcome, {user.username || "Shopper"}!</b>
                <small>Browse products to get suggestions</small>
              </div>
            </>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" id="how">
        <label>THE TRYWISE WAY</label>
        <h2>
          Shopping, <em>simplified.</em>
        </h2>

        <div className="steps">
          {[
            ["01", "Discover", "Explore stores and collections."],
            ["02", "Browse", "Find products by category."],
            ["03", "Bag It", "Select the items and sizes you want."],
            ["04", "Try & Shop", "The store prepares them for your visit."],
          ].map((step) => (
            <article key={step[0]}>
              <small>{step[0]}</small>
              <h3>{step[1]}</h3>
              <p>{step[2]}</p>
            </article>
          ))}
        </div>
      </section>

      {/* CATEGORY SECTION */}
      <section className="section beige">
        <label>EXPLORE</label>
        <h2>
          Find your <em>style.</em>
        </h2>

        <div className="tiles">
          <div
            onClick={() => handleCategoryClick("Women")}
            role="button"
            tabIndex={0}
            title="Browse Women's Collection"
          >
            01
            <h3>Women</h3>
            ↗
          </div>
          <div
            onClick={() => handleCategoryClick("Men")}
            role="button"
            tabIndex={0}
            title="Browse Men's Collection"
          >
            02
            <h3>Men</h3>
            ↗
          </div>
        </div>
      </section>

      {/* WHY TRYWISE */}
      <section className="banner">
        <div>
          <label>WHY TRYWISE?</label>
          <h2>
            Your time matters.
            <br />
            <em>Shop accordingly.</em>
          </h2>
        </div>

        <p>
          TryWise brings organized digital discovery to physical shopping — so
          you spend less time looking and more time deciding.
        </p>
      </section>
    </main>
  );
}
