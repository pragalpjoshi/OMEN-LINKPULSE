import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { BreakdownList, TimeSeriesChart } from "./Charts";
import { PosterQrModal, QrCodeSvg } from "./QrCodeGraphic";

export default function LinkAnalyticsView({ selectedLinkId, onSelectLink }) {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [simError, setSimError] = useState("");
  const [simForm, setSimForm] = useState({
    referrer: "instagram.com",
    device: "Mobile",
    browser: "Safari",
  });

  const loadLinksList = async () => {
    const list = await api.getLinks({ search, status: statusFilter });
    setLinks(list);
    if (!selectedLinkId && list.length > 0) {
      onSelectLink(list[0].id);
    }
  };

  const loadLinkDetails = async (id, windowDays = days) => {
    if (!id) return;
    setLoading(true);
    setSimError("");
    try {
      const data = await api.getLinkAnalytics(id, windowDays);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinksList();
  }, [search, statusFilter]);

  useEffect(() => {
    if (selectedLinkId) {
      loadLinkDetails(selectedLinkId, days);
    }
  }, [selectedLinkId, days]);

  const handleToggleDisableLink = async () => {
    if (!analytics?.link) return;
    await api.toggleLinkStatus(analytics.link);
    await loadLinkDetails(analytics.link.id, days);
    await loadLinksList();
  };

  const handleSimulateClick = async () => {
    if (!selectedLinkId) return;
    setSimError("");
    try {
      await api.simulateClick(selectedLinkId, simForm);
      await loadLinkDetails(selectedLinkId, days);
      await loadLinksList();
    } catch (err) {
      setSimError(err.message);
    }
  };

  const lnk = analytics?.link;

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Link Details, Security Kill-Switch & MySQL Analytics</h2>
          <p className="muted-text">
            Track visits, timestamps, referrers, devices, browsers, countries, and bot traffic. Disable suspicious links without deleting analytics.
          </p>
        </div>
        <div className="header-actions">
          <select
            className="input-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="master-detail-layout">
        <div className="panel link-list-sidebar">
          <input
            type="text"
            className="input-field"
            placeholder="Search short_code or original_url..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-select"
            style={{ width: "100%", marginTop: "0.5rem" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>

          <div className="sidebar-links-scroll">
            {links.map((item) => (
              <div
                key={item.id}
                className={`sidebar-link-card ${item.id === selectedLinkId ? "active" : ""}`}
                onClick={() => onSelectLink(item.id)}
              >
                <div className="sidebar-link-top">
                  <strong>
                    /{item.short_code} {item.status !== "active" && "⛔"}
                  </strong>
                  <span className="clicks-pill">{item.clicks_count}</span>
                </div>
                <div className="sidebar-link-url">{item.original_url}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-main">
          {!lnk || loading ? (
            <div className="panel">
              {loading ? "Loading link analytics..." : "Select a link from the left to inspect."}
            </div>
          ) : (
            <>
              {lnk.status !== "active" && (
                <div className="quarantine-banner">
                  <div>
                    <strong>⛔ LINK DISABLED (`status = 'disabled'`) — ANALYTICS PRESERVED</strong>
                    <div style={{ fontSize: "0.84rem", marginTop: "0.2rem" }}>
                      Redirects are blocked (`HTTP 410`), while all {analytics.total_recorded_clicks} historical visits remain intact below.
                    </div>
                  </div>
                  <button className="btn btn-secondary" onClick={handleToggleDisableLink}>
                    Re-Enable Link
                  </button>
                </div>
              )}

              <div className="panel detail-hero">
                <div className="detail-hero-info">
                  <div className="row-actions" style={{ marginBottom: "0.5rem" }}>
                    <span className={`badge ${lnk.effective_active ? "badge-success" : "badge-danger"}`}>
                      Status: {lnk.status.toUpperCase()}
                    </span>
                    {lnk.campaign_name && (
                      <span className="badge badge-purple">Campaign: {lnk.campaign_name}</span>
                    )}
                    {(lnk.tags || []).map((t) => (
                      <span key={t} className="badge badge-info">#{t}</span>
                    ))}
                  </div>

                  <h3 style={{ margin: "0.25rem 0", fontSize: "1.35rem", color: "#a5b4fc" }}>
                    {lnk.short_url}
                  </h3>
                  <p className="muted-text" style={{ wordBreak: "break-all" }}>
                    Original URL:{" "}
                    <a href={lnk.original_url} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                      {lnk.original_url}
                    </a>
                  </p>

                  <div className="meta-pills-row">
                    <span>Total Clicks: <strong>{lnk.clicks_count}</strong></span>
                    <span>Human / Bot: <strong>{analytics.human_clicks ?? lnk.clicks_count} / {analytics.bot_clicks ?? 0}</strong></span>
                    <span>Click Limit: <strong>{lnk.click_limit ?? "Unlimited"}</strong></span>
                    <span>
                      Expires: <strong>{lnk.expires_at ? new Date(lnk.expires_at).toLocaleString() : "Never"}</strong>
                    </span>
                  </div>

                  <div className="row-actions" style={{ marginTop: "1rem" }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(lnk.short_url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1800);
                      }}
                    >
                      {copied ? "Copied!" : "Copy Short URL"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowPoster(true)}>
                      🖨 Poster QR Studio
                    </button>
                    <button
                      className={`btn ${lnk.is_active ? "btn-danger-outline" : "btn-emerald-outline"}`}
                      onClick={handleToggleDisableLink}
                    >
                      {lnk.is_active ? "⛔ Disable Suspicious Link" : "✓ Re-Enable Link"}
                    </button>
                  </div>
                </div>

                <div className="detail-qr-box" onClick={() => setShowPoster(true)} style={{ cursor: "pointer" }}>
                  <QrCodeSvg value={lnk.short_url} size={145} />
                </div>
              </div>

              <div className="panel simulator-bar">
                <div>
                  <strong>Simulate Live Visit</strong>
                  {simError && <div className="field-error">{simError}</div>}
                </div>
                <div className="row-actions">
                  <select
                    className="input-select"
                    value={simForm.referrer}
                    onChange={(e) => setSimForm({ ...simForm, referrer: e.target.value })}
                  >
                    <option value="Direct">Direct (Poster QR)</option>
                    <option value="instagram.com">instagram.com</option>
                    <option value="whatsapp.com">whatsapp.com</option>
                    <option value="linkedin.com">linkedin.com</option>
                  </select>
                  <select
                    className="input-select"
                    value={simForm.device}
                    onChange={(e) => setSimForm({ ...simForm, device: e.target.value })}
                  >
                    <option value="Mobile">Mobile</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Tablet">Tablet</option>
                  </select>
                  <select
                    className="input-select"
                    value={simForm.browser}
                    onChange={(e) => setSimForm({ ...simForm, browser: e.target.value })}
                  >
                    <option value="Safari">Safari</option>
                    <option value="Chrome">Chrome</option>
                    <option value="Firefox">Firefox</option>
                  </select>
                  <button className="btn btn-primary" onClick={handleSimulateClick}>
                    + Record Visit
                  </button>
                </div>
              </div>

              <div className="panel">
                <h4 className="panel-title">Clicks Over Time ({days} Days)</h4>
                <TimeSeriesChart data={analytics.time_series} height={210} accentColor="#10b981" />
              </div>

              <div className="three-col-grid">
                <BreakdownList title="Referrers" items={analytics.referrers} color="#6366f1" />
                <BreakdownList title="Devices (`device_type`)" items={analytics.devices} color="#10b981" />
                <BreakdownList title="Browsers (`browser`)" items={analytics.browsers} color="#f59e0b" />
                {analytics.countries && (
                  <BreakdownList title="Countries (`country`)" items={analytics.countries} color="#38bdf8" />
                )}
              </div>

              <div className="panel">
                <h4 className="panel-title">Click History (`click_events`)</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Referrer</th>
                        <th>Device Type</th>
                        <th>Browser</th>
                        <th>Country</th>
                        <th>Traffic Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.click_history.map((ev) => (
                        <tr key={ev.id}>
                          <td>{new Date(ev.clicked_at).toLocaleString()}</td>
                          <td><span className="tag">{ev.referrer}</span></td>
                          <td>{ev.device_type || ev.device}</td>
                          <td>{ev.browser}</td>
                          <td>{ev.country || "India"}</td>
                          <td>
                            <span className={`badge ${ev.is_bot ? "badge-warning" : "badge-success"}`}>
                              {ev.is_bot ? "Bot" : "Human"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showPoster && lnk && <PosterQrModal link={lnk} onClose={() => setShowPoster(false)} />}
    </div>
  );
}