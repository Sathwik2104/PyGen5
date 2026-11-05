import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { fetchStoreConfig } from "../services/api.js";
import EditStoreInfoModal from "../components/EditStoreInfoModal.jsx";

const DEFAULT_STORE_INFO = {
  store_name: "TryWise Fashion Studio & Trial Store",
  address: "100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
  landmark: "Near Indiranagar Metro Station (Metro Pillar 84)",
  hours: "Monday – Sunday: 10:00 AM – 9:00 PM (Daily)",
  phone: "+91 98765 43210",
  email: "support@trywise.shop",
  trial_duration_value: 24,
  trial_duration_unit: "hours",
};

export default function Info({ title, text, goProducts, setPage }) {
  const { user, tokens } = useAuth();
  const { showToast } = useToast();
  const isStoreOwner = user?.role === "store_owner";

  const [storeInfo, setStoreInfo] = useState(DEFAULT_STORE_INFO);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load latest persisted store configuration from backend
  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const data = await fetchStoreConfig(tokens?.access);
        if (isMounted && data) {
          setStoreInfo((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch (err) {
        // Fallback silently to default store info on network blip
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, [tokens]);

  const handleCopyAddress = () => {
    const fullText = `${storeInfo.store_name}, ${storeInfo.address}`;
    navigator.clipboard
      .writeText(fullText)
      .then(() => {
        setCopied(true);
        showToast("Store address copied to clipboard!", "success");
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        showToast("Failed to copy address.", "error");
      });
  };

  // Dynamically generated Google Maps Embed and GPS Directions URLs from active address
  const activeAddress = storeInfo.address || DEFAULT_STORE_INFO.address;
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(activeAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeAddress)}`;

  return (
    <main className="page about-page-container">
      {/* HERO SECTION */}
      <div className="about-hero">
        <label>VISIT OUR STUDIO</label>
        <h1>
          About TryWise <em>& Store Location</em>
        </h1>
        <p>
          {text ||
            "TryWise bridges digital browsing and physical shopping. Discover collections online, Bag It to reserve your preferred sizes, and visit our store to try them on in dedicated fitting rooms before purchasing."}
        </p>
      </div>

      {/* INTERACTIVE STORE MAP CARD */}
      <div className="store-visit-card">
        {/* CARD HEADER */}
        <div className="store-map-header">
          <div className="store-title-wrap">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <span className="store-status-pill">
                <span style={{ fontSize: "9px" }}>●</span> Open Today ({storeInfo.hours})
              </span>
              <span
                className="store-status-pill"
                style={{
                  background: "#ede9fe",
                  color: "#6d28d9",
                  border: "1px solid #ddd6fe",
                }}
              >
                ⏱️ Trial Hold Window: <strong>{storeInfo.trial_duration_value} {storeInfo.trial_duration_unit}</strong>
              </span>
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: "22px", color: "var(--ink)" }}>
              {storeInfo.store_name}
            </h2>
          </div>

          <div className="store-map-actions">
            {/* STORE OWNER ACTION: EDIT STORE DETAILS */}
            {isStoreOwner && (
              <button
                className="btn-copy-address"
                onClick={() => setIsEditingStore(true)}
                title="Edit store location, timings, phone, or email"
                style={{ background: "#f5f3ff", borderColor: "#c4b5fd", color: "var(--accent-hover)" }}
              >
                ✏️ Edit Store Info
              </button>
            )}

            <button
              className="btn-copy-address"
              onClick={handleCopyAddress}
              title="Copy store address to clipboard"
            >
              {copied ? "✓ Address Copied!" : "📋 Copy Address"}
            </button>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-get-directions"
              title="Open turn-by-turn navigation in Google Maps"
            >
              Get Directions 🚗 ↗
            </a>
          </div>
        </div>

        {/* INTERACTIVE GOOGLE MAPS EMBED */}
        <div className="map-embed-wrapper">
          <iframe
            key={activeAddress}
            title="TryWise Store Location Map"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* MAP FOOTER DIRECTIONS OVERLAY BAR */}
        <div className="map-directions-bar">
          <div>
            <strong>📍 {storeInfo.address}</strong>
            {storeInfo.landmark && (
              <span style={{ display: "block", fontSize: "12.5px", color: "var(--muted)", marginTop: "2px" }}>
                {storeInfo.landmark}
              </span>
            )}
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Click to open turn-by-turn GPS navigation"
          >
            Start GPS Navigation in Google Maps ↗
          </a>
        </div>
      </div>

      {/* STORE DETAILS & AMENITIES GRID */}
      <div className="store-details-grid">
        {/* HOURS */}
        <div className="store-detail-box">
          <div className="detail-box-icon">⏰</div>
          <h3>Store Hours & Hold Policy</h3>
          <p>
            <strong>Hours:</strong> {storeInfo.hours}
          </p>
          <div
            style={{
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#5b21b6",
              marginTop: "8px",
              lineHeight: "1.5",
            }}
          >
            ⏱️ <strong>Reservation Window:</strong> In-store trial requests are held for{" "}
            <strong>
              {storeInfo.trial_duration_value} {storeInfo.trial_duration_unit}
            </strong>{" "}
            once marked ready by the store.
          </div>
        </div>

        {/* CONTACT */}
        <div className="store-detail-box">
          <div className="detail-box-icon">📞</div>
          <h3>Helpline & Contact</h3>
          <p>
            Phone:{" "}
            <a href={`tel:${storeInfo.phone}`} style={{ color: "var(--ink)", fontWeight: "600" }}>
              {storeInfo.phone}
            </a>
          </p>
          <p>
            Email:{" "}
            <a href={`mailto:${storeInfo.email}`} style={{ color: "var(--muted)" }}>
              {storeInfo.email}
            </a>
          </p>
        </div>

        {/* FITTING ROOM EXPERIENCE */}
        <div className="store-detail-box">
          <div className="detail-box-icon">✨</div>
          <h3>In-Store Experience</h3>
          <p>
            • Dedicated fitting rooms held for{" "}
            <strong>
              {storeInfo.trial_duration_value} {storeInfo.trial_duration_unit}
            </strong>{" "}
            per Bag It request.
            <br />
            • Try on in private; pay only for what you love.
            <br />
            • UPI, Credit/Debit cards & Cash accepted.
          </p>
        </div>
      </div>

      {/* CALL TO ACTION CARD */}
      <div className="about-cta-card">
        <div>
          <h2>Ready to try before you buy?</h2>
          <p>
            Select your preferred clothing styles and sizes online, Bag It in seconds, and have everything waiting in your fitting room when you arrive.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            className="primary"
            onClick={() => (goProducts ? goProducts("All") : setPage && setPage("products"))}
            style={{ padding: "12px 26px", borderRadius: "25px", fontSize: "14px" }}
          >
            Browse Collection ↗
          </button>
          <button
            onClick={() => {
              if (setPage) {
                setPage("home");
                setTimeout(() => {
                  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                }, 150);
              }
            }}
            style={{
              padding: "12px 22px",
              borderRadius: "25px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              fontSize: "14px",
            }}
          >
            How It Works
          </button>
        </div>
      </div>

      {/* STORE OWNER: EDIT STORE INFO MODAL */}
      {isEditingStore && (
        <EditStoreInfoModal
          storeInfo={storeInfo}
          close={() => setIsEditingStore(false)}
          onStoreUpdated={(updated) => {
            setStoreInfo((prev) => ({
              ...prev,
              ...updated,
            }));
          }}
        />
      )}
    </main>
  );
}
