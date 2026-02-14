import React, { useState } from "react";

function getTrackingLink(trk) {
  if (!trk) return null;

  const t = trk.trim();

  if (t.toUpperCase().startsWith("TBA")) {
    return { label: "Amazon (TBA) – open Amazon orders", url: "https://www.amazon.com/gp/your-account/order-history" };
  }
  if (t.startsWith("1Z")) {
    return { label: "UPS", url: `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}` };
  }
  if (/^\d{12,15}$/.test(t)) {
    return { label: "FedEx", url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}` };
  }
  return { label: "Other carrier (ParcelsApp)", url: `https://parcelsapp.com/en/tracking/${encodeURIComponent(t)}` };
}

export default function Tracker() {
  const [tracking, setTracking] = useState("");
  const link = getTrackingLink(tracking);

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 20, fontFamily: "Arial" }}>
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>📦 Package Tracker</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Paste a tracking number (TBA, UPS 1Z…, etc.) and click Track.
      </p>

      <input
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        placeholder="Enter tracking number (ex: TBA..., 1Z..., 12-15 digits)"
        style={{ width: "100%", padding: 12, fontSize: 16, borderRadius: 10, border: "1px solid #ccc" }}
      />

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => {
            if (link?.url) window.open(link.url, "_blank");
          }}
          disabled={!link}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            fontSize: 16,
            cursor: link ? "pointer" : "not-allowed",
          }}
        >
          Track
        </button>
      </div>

      {link && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>
            Detected: <b>{link.label}</b>
          </div>
          <a href={link.url} target="_blank" rel="noreferrer">
            Open tracking link
          </a>
        </div>
      )}
    </div>
  );
}
