import React, { useState } from "react";
import { api } from "../services/api";

export function QrCodeSvg({ value, size = 200 }) {
  const [useFallbackApi, setUseFallbackApi] = useState(false);
  const target = value || "https://example.com";

  // Primary: your FastAPI /api/qr endpoint (with `qrcode` library installed)
  // Secondary fallback: standards-compliant QR generator so QR is ALWAYS 100% scannable by any phone camera
  const src = useFallbackApi
    ? `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
        target
      )}`
    : api.getQrImageUrl(target, size);

  return (
    <img
      src={src}
      alt="Scannable QR Code"
      width={size}
      height={size}
      onError={() => {
        if (!useFallbackApi) setUseFallbackApi(true);
      }}
      style={{
        background: "#ffffff",
        borderRadius: "10px",
        padding: "6px",
        display: "block",
      }}
    />
  );
}

export function PosterQrModal({ link, onClose }) {
  const [qrMode, setQrMode] = useState("short"); // 'short' | 'direct'
  const [downloading, setDownloading] = useState(false);

  if (!link) return null;

  const isLocalhost =
    link.short_url.includes("localhost") || link.short_url.includes("127.0.0.1");
  const encodedValue = qrMode === "direct" ? link.original_url : link.short_url;

  const handleDownloadPosterPng = async () => {
    setDownloading(true);
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&data=${encodeURIComponent(
        encodedValue
      )}`;
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = qrUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 600, 760);

      ctx.fillStyle = "#6366f1";
      ctx.fillRect(0, 0, 600, 16);

      ctx.fillStyle = "#1e293b";
      ctx.fillRect(60, 48, 480, 44);
      ctx.fillStyle = "#a5b4fc";
      ctx.font = "bold 18px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        (link.campaign_name || "OMEN LINKPULSE CAMPAIGN").toUpperCase(),
        300,
        76
      );

      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 26px Inter, system-ui, sans-serif";
      ctx.fillText(`/${link.short_code}`, 300, 140);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(120, 175, 360, 360);
      ctx.drawImage(img, 130, 185, 340, 340);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 21px monospace";
      ctx.fillText(link.compact_url || link.short_url, 300, 605);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "15px Inter, system-ui, sans-serif";
      ctx.fillText("Scan QR code with your phone camera to open link", 300, 650);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `qr-poster-${link.short_code}.png`;
      a.click();
    } catch {
      window.open(api.getQrImageUrl(encodedValue, 500), "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header-row">
          <h3 className="panel-title" style={{ margin: 0 }}>
            🖨 Print-Ready QR Code Studio
          </h3>
          <button className="btn-xs" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="row-actions" style={{ justifyContent: "center", marginBottom: "0.75rem" }}>
          <button
            type="button"
            className={`btn-xs ${qrMode === "short" ? "btn-xs-primary" : ""}`}
            onClick={() => setQrMode("short")}
          >
            Trackable Short URL
          </button>
          <button
            type="button"
            className={`btn-xs ${qrMode === "direct" ? "btn-xs-primary" : ""}`}
            onClick={() => setQrMode("direct")}
          >
            Direct Destination URL
          </button>
        </div>

        {isLocalhost && qrMode === "short" && (
          <div className="warning-box" style={{ marginBottom: "0.75rem", fontSize: "0.76rem" }}>
            💡 <strong>Tip for scanning on your phone right now:</strong> You opened this app on <code>localhost</code>. To scan the Short URL from a phone, open your PC's Wi-Fi IP (e.g. <code>http://192.168.x.x:5173</code>) or switch to <strong>Direct Destination URL</strong> above!
          </div>
        )}

        <div className="poster-preview">
          <div className="poster-campaign-tag">
            {link.campaign_name || "General Campaign"}
          </div>
          <h4 style={{ margin: "0.6rem 0" }}>/{link.short_code}</h4>
          <div className="poster-qr-frame">
            <QrCodeSvg value={encodedValue} size={210} />
          </div>
          <div className="poster-short-url">{link.compact_url || link.short_url}</div>
          <small className="muted-text" style={{ wordBreak: "break-all" }}>
            {link.original_url}
          </small>
        </div>

        <div className="row-actions" style={{ justifyContent: "center", marginTop: "1.25rem" }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadPosterPng}
            disabled={downloading}
          >
            {downloading ? "Generating..." : "⬇ Download Printable Poster (PNG)"}
          </button>
        </div>
      </div>
    </div>
  );
}