import React, { useEffect, useState } from "react";
import { api, buildFullShortUrl, formatCompactShortUrl } from "../services/api";
import { PosterQrModal, QrCodeSvg } from "./QrCodeGraphic";

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,30}$/;

const INITIAL_FORM = {
  destination_url: "",
  custom_alias: "",
  campaign_id: "",
  tags_input: "",
  expires_at: "",
  click_limit: "",
  password: "",
};

export default function CreateLinkView({ campaigns = [], onCreated, onSelectLink }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [aliasStatus, setAliasStatus] = useState(null);
  const [safetyScan, setSafetyScan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  useEffect(() => {
    const alias = form.custom_alias.trim();
    if (!alias) {
      setAliasStatus(null);
      return;
    }
    if (!ALIAS_PATTERN.test(alias)) {
      setAliasStatus({
        available: false,
        reason: "Must be 3–30 chars (letters, numbers, '-' or '_').",
      });
      return;
    }
    const timer = setTimeout(async () => {
      const res = await api.checkAlias(alias);
      setAliasStatus(res);
    }, 260);
    return () => clearTimeout(timer);
  }, [form.custom_alias]);

  useEffect(() => {
    const url = form.destination_url.trim();
    if (url.length < 8) {
      setSafetyScan(null);
      return;
    }
    const timer = setTimeout(async () => {
      const scan = await api.scanUrlSafety(url);
      setSafetyScan(scan);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.destination_url]);

  const validateBeforePublish = () => {
    const nextErrors = {};
    const url = form.destination_url.trim();

    if (!url) {
      nextErrors.destination_url = "Destination URL is required.";
    } else {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          nextErrors.destination_url = "URL must start with http:// or https://.";
        }
      } catch {
        nextErrors.destination_url = "Enter a valid URL (e.g., https://example.com/landing).";
      }
    }

    const alias = form.custom_alias.trim();
    if (alias) {
      if (!ALIAS_PATTERN.test(alias)) {
        nextErrors.custom_alias =
          "Custom alias must be 3–30 characters (letters, numbers, '-' or '_').";
      } else if (aliasStatus && aliasStatus.available === false) {
        nextErrors.custom_alias = aliasStatus.reason || "This custom alias is unavailable.";
      }
    }

    if (form.expires_at) {
      const expDate = new Date(form.expires_at);
      if (isNaN(expDate.getTime()) || expDate <= new Date()) {
        nextErrors.expires_at = "Expiration date/time must be in the future.";
      }
    }

    if (form.click_limit !== "") {
      const limitNum = Number(form.click_limit);
      if (!Number.isInteger(limitNum) || limitNum < 1) {
        nextErrors.click_limit = "Click limit must be a positive whole number (>= 1).";
      }
    }

    if (form.password && form.password.length < 4) {
      nextErrors.password = "Optional password must be at least 4 characters.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateBeforePublish()) return;

    setSubmitting(true);
    try {
      const tags = form.tags_input
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        original_url: form.destination_url.trim(),
        destination_url: form.destination_url.trim(),
        custom_alias: form.custom_alias.trim() || null,
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        click_limit: form.click_limit !== "" ? Number(form.click_limit) : null,
        password: form.password || null,
        tags,
      };
      const result = await api.createLink(payload);
      setCreatedLink(result);

      // Immediately clear all input fields after creating the link!
      setForm(INITIAL_FORM);
      setErrors({});
      setAliasStatus(null);
      setSafetyScan(null);

      if (onCreated) onCreated(result);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const liveCode = form.custom_alias.trim() || "my-link";
  const activeQrTarget = createdLink
    ? createdLink.short_url
    : form.destination_url.trim() || buildFullShortUrl(liveCode);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Create Short Link & QR Code</h2>
          <p className="muted-text">
            Convert long URLs into clean shareable links, assign campaigns, set expiry or click limits, and generate scannable QR codes.
          </p>
        </div>
      </div>

      <div className="two-col-grid">
        <form className="panel form-panel" onSubmit={handleSubmit} noValidate>
          <h3 className="panel-title">Link Configuration</h3>

          {serverError && <div className="error-banner">{serverError}</div>}

          <div className="form-group">
            <label>Destination URL *</label>
            <input
              type="url"
              className={`input-field ${errors.destination_url ? "input-error" : ""}`}
              placeholder="https://example.com/product-page?utm_source=social"
              value={form.destination_url}
              onChange={(e) => handleChange("destination_url", e.target.value)}
            />
            {errors.destination_url && (
              <span className="field-error">{errors.destination_url}</span>
            )}
            {safetyScan && safetyScan.is_flagged && (
              <div className="warning-box">
                ⚠ <strong>Security Heuristic Alert:</strong> {safetyScan.flag_reason}
              </div>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Custom Alias (optional, max 30 chars)</label>
              <input
                type="text"
                maxLength={30}
                className={`input-field ${errors.custom_alias ? "input-error" : ""}`}
                placeholder="e.g. summer-sale"
                value={form.custom_alias}
                onChange={(e) => handleChange("custom_alias", e.target.value)}
              />
              {errors.custom_alias ? (
                <span className="field-error">{errors.custom_alias}</span>
              ) : (
                aliasStatus && (
                  <span
                    className={`field-hint ${
                      aliasStatus.available ? "text-emerald" : "text-danger"
                    }`}
                  >
                    {aliasStatus.reason}
                  </span>
                )
              )}
            </div>

            <div className="form-group">
              <label>Tags (optional, comma-separated)</label>
              <input
                type="text"
                className="input-field"
                placeholder="marketing, promo, qr"
                value={form.tags_input}
                onChange={(e) => handleChange("tags_input", e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Campaign</label>
              <select
                className="input-field"
                value={form.campaign_id}
                onChange={(e) => handleChange("campaign_id", e.target.value)}
              >
                <option value="">— No Campaign —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Click Limit (optional)</label>
              <input
                type="number"
                min="1"
                className={`input-field ${errors.click_limit ? "input-error" : ""}`}
                placeholder="Unlimited if blank"
                value={form.click_limit}
                onChange={(e) => handleChange("click_limit", e.target.value)}
              />
              {errors.click_limit && (
                <span className="field-error">{errors.click_limit}</span>
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Expiry Date & Time (optional)</label>
              <input
                type="datetime-local"
                className={`input-field ${errors.expires_at ? "input-error" : ""}`}
                value={form.expires_at}
                onChange={(e) => handleChange("expires_at", e.target.value)}
              />
              {errors.expires_at && (
                <span className="field-error">{errors.expires_at}</span>
              )}
            </div>

            <div className="form-group">
              <label>Optional Password</label>
              <input
                type="password"
                className={`input-field ${errors.password ? "input-error" : ""}`}
                placeholder="Leave empty for public link"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Short Link"}
          </button>
        </form>

        <div className="panel qr-preview-panel">
          <h3 className="panel-title">Live Short Link & Scannable QR</h3>
          {createdLink ? (
            <div className="published-box">
              <div className="badge badge-success">Link Published & Inputs Reset</div>
              <div className="short-url-display" title={createdLink.short_url}>
                {createdLink.compact_url}
              </div>
              <small className="muted-text" style={{ display: "block", marginTop: 4 }}>
                Redirects to: {createdLink.original_url}
              </small>
              <div
                className="row-actions"
                style={{ justifyContent: "center", marginTop: "0.75rem" }}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(createdLink.short_url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                >
                  {copied ? "Copied!" : "Copy Short Link"}
                </button>
                <a
                  className="btn btn-secondary"
                  href={createdLink.short_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Link ↗
                </a>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPosterModal(true)}
                >
                  🖨 Poster QR
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => onSelectLink(createdLink.id)}
                >
                  Analytics →
                </button>
              </div>
            </div>
          ) : (
            <p className="muted-text">
              Short Link Preview: <code>{formatCompactShortUrl(liveCode)}</code>
            </p>
          )}

          <div className="qr-frame">
            <QrCodeSvg value={activeQrTarget} size={210} />
          </div>
          <small className="muted-text">
            Scan with any phone camera to test
          </small>
        </div>
      </div>

      {showPosterModal && createdLink && (
        <PosterQrModal link={createdLink} onClose={() => setShowPosterModal(false)} />
      )}
    </div>
  );
}