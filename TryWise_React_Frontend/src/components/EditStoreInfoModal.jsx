import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { updateStoreConfig } from "../services/api.js";

/**
 * EditStoreInfoModal Component:
 * Allows Store Owners to customize public store information:
 * - Store Name
 * - Street Address (automatically syncs the interactive Google Map & directions!)
 * - Landmark
 * - Operating Hours (e.g. 10:00 AM – 9:00 PM)
 * - Phone Helpline
 * - Customer Support Email
 */
export default function EditStoreInfoModal({ storeInfo, close, onStoreUpdated }) {
  const { tokens } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    store_name: storeInfo?.store_name || "",
    address: storeInfo?.address || "",
    landmark: storeInfo?.landmark || "",
    hours: storeInfo?.hours || "",
    phone: storeInfo?.phone || "",
    email: storeInfo?.email || "",
    trial_duration_value: storeInfo?.trial_duration_value || 24,
    trial_duration_unit: storeInfo?.trial_duration_unit || "hours",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.address.trim()) {
        throw new Error("Store address cannot be empty.");
      }
      if (!formData.hours.trim()) {
        throw new Error("Store hours cannot be empty.");
      }
      if (!formData.phone.trim()) {
        throw new Error("Phone number cannot be empty.");
      }
      if (!formData.email.trim()) {
        throw new Error("Email address cannot be empty.");
      }

      const updated = await updateStoreConfig(formData, tokens?.access);
      if (onStoreUpdated) {
        onStoreUpdated(updated);
      }
      showToast("Store information updated successfully!", "success");
      close();
    } catch (err) {
      setError(err.message || "Failed to update store details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="back" onClick={close}>
      <div
        className="modal edit-store-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <button className="x" onClick={close} title="Close">
          ×
        </button>

        <label>STORE OWNER SETTINGS</label>
        <h2>Edit Store Details & Location</h2>
        <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.9rem" }}>
          Changes here update the live interactive map, customer directions, and helpline details.
        </p>

        {error && <div className="error-badge">{error}</div>}

        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            padding: "10px 14px",
            borderRadius: "10px",
            marginBottom: "18px",
            fontSize: "0.85rem",
            color: "#166534",
            lineHeight: "1.5",
          }}
        >
          📍 <strong>Instant Map Sync:</strong> Entering a new address automatically re-centers the Google Maps embed and updates GPS navigation links for customers.
        </div>

        <form onSubmit={handleSubmit}>
          {/* STORE NAME */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="store-name">Store Name *</label>
            <input
              id="store-name"
              type="text"
              name="store_name"
              value={formData.store_name}
              onChange={handleChange}
              placeholder="e.g. TryWise Fashion Studio & Trial Store"
              required
            />
          </div>

          {/* STORE ADDRESS */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="store-address">Full Street Address *</label>
            <textarea
              id="store-address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: "1px solid var(--line)",
                fontFamily: "inherit",
                fontSize: "14px",
                resize: "vertical",
              }}
            />
          </div>

          {/* LANDMARK */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="store-landmark">Landmark / Transit Info</label>
            <input
              id="store-landmark"
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="e.g. Near Indiranagar Metro Station (Metro Pillar 84)"
            />
          </div>

          {/* OPERATING HOURS */}
          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label htmlFor="store-hours">Operating Hours *</label>
            <input
              id="store-hours"
              type="text"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              placeholder="e.g. Monday – Sunday: 10:00 AM – 9:00 PM (Daily)"
              required
            />
          </div>

          {/* PHONE & EMAIL IN A 2-COLUMN GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
            <div className="form-group">
              <label htmlFor="store-phone">Helpline / Phone *</label>
              <input
                id="store-phone"
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="store-email">Contact Email *</label>
              <input
                id="store-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. support@trywise.shop"
                required
              />
            </div>
          </div>

          {/* RESERVATION HOLD WINDOW (SYNCED WITH REQUESTS TAB) */}
          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="trial-hold-val">Default Trial Reservation Hold Window *</label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                id="trial-hold-val"
                type="number"
                min="1"
                max={formData.trial_duration_unit === "minutes" ? 1440 : 168}
                name="trial_duration_value"
                value={formData.trial_duration_value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trial_duration_value: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                style={{ width: "120px" }}
                required
              />
              <select
                name="trial_duration_unit"
                value={formData.trial_duration_unit}
                onChange={handleChange}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--line)",
                  background: "var(--white)",
                  fontSize: "14px",
                }}
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
              <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                (Syncs with Requests Tab policy)
              </span>
            </div>
          </div>

          {/* ACTIONS */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={close}
              disabled={loading}
              style={{
                padding: "10px 20px",
                borderRadius: "20px",
                border: "1px solid var(--line)",
                background: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={loading}
              style={{
                padding: "10px 24px",
                borderRadius: "20px",
              }}
            >
              {loading ? "Saving Details..." : "Save Store Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

