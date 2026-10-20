import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { TimeSeriesChart } from "./Charts";
import { PosterQrModal } from "./QrCodeGraphic";

export default function DashboardView({ onSelectLink, onNavigate }) {
  const [metrics, setMetrics] = useState(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");
  const [posterLink, setPosterLink] = useState(null);

  const fetchMetrics = async (selectedDays = days) => {
    setLoading(true);
    try {
      const data = await api.getDashboard(selectedDays);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(days);
  }, [days]);

  const handleCopy = (shortUrl, code) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1800);
  };

  const handleToggleDisable = async (lnk) => {
    await api.toggleLinkStatus(lnk);
    await fetchMetrics(days);
  };

  if (loading && !metrics) {
    return <div className="loading-card">Loading real-time dashboard metrics...</div>;
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>LinkPulse Command Overview</h2>
          <p className="muted-text">
            Live metrics, TechFest 2026 campaign tracking, poster QR generator, and non-destructive security controls.
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
          <button className="btn btn-secondary" onClick={() => fetchMetrics(days)}>
            ↻ Refresh
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate("create")}>
            + Create Short Link
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Links</span>
          <div className="stat-value">{metrics.total_links}</div>
          <span className="stat-sub">
            {metrics.disabled_links || 0} disabled • {metrics.inactive_links || 0} inactive
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Total Clicks</span>
          <div className="stat-value accent-indigo">{metrics.total_clicks}</div>
          <span className="stat-sub">Avg {metrics.avg_clicks_per_link} clicks / link</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Active Links</span>
          <div className="stat-value accent-emerald">{metrics.active_links}</div>
          <span className="stat-sub">
            {metrics.total_links
              ? `${Math.round((metrics.active_links / metrics.total_links) * 100)}% healthy`
              : "Ready to create links"}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Security Shield</span>
          <div className="stat-value accent-amber">{metrics.flagged_links || 0} Flagged</div>
          <span className="stat-sub">
            {metrics.disabled_links || 0} paused (analytics preserved)
          </span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header-row">
          <h3 className="panel-title" style={{ margin: 0 }}>
            Click Velocity ({days} Days)
          </h3>
          <span className="badge badge-info">Real-Time Feed</span>
        </div>
        <TimeSeriesChart data={metrics.clicks_over_time} height={220} />
      </div>

      <div className="two-col-grid">
        <div className="panel">
          <div className="panel-header-row">
            <h3 className="panel-title" style={{ margin: 0 }}>
              Top-Performing Links
            </h3>
            <button className="btn-xs btn-xs-primary" onClick={() => onNavigate("create")}>
              + New Link
            </button>
          </div>
          {metrics.top_performing_links.length === 0 ? (
            <div className="empty-state">
              No links yet. Click "+ Create Short Link" to create your first link!
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Short Link</th>
                    <th>Campaign</th>
                    <th>Status</th>
                    <th>Clicks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.top_performing_links.map((lnk) => (
                    <tr key={lnk.id} className={lnk.is_flagged ? "row-duplicate" : ""}>
                      <td>
                        <div className="cell-main">
                          /{lnk.short_code}{" "}
                          {lnk.has_password && <span title="Password Protected">🔒</span>}
                          {lnk.is_flagged && (
                            <span
                              className="badge badge-danger"
                              style={{ marginLeft: 6 }}
                              title={lnk.flag_reason}
                            >
                              ⚠ Suspicious
                            </span>
                          )}
                        </div>
                        <div className="cell-sub" title={lnk.original_url}>
                          {lnk.original_url}
                        </div>
                      </td>
                      <td>
                        {lnk.campaign_name ? (
                          <span className="badge badge-purple">{lnk.campaign_name}</span>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            !lnk.is_active
                              ? "badge-danger"
                              : lnk.effective_active
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {!lnk.is_active
                            ? "Disabled (History Kept)"
                            : lnk.effective_active
                            ? "Active"
                            : "Expired / Capped"}
                        </span>
                      </td>
                      <td>
                        <strong className="clicks-pill">
                          {lnk.clicks_count}
                          {lnk.click_limit ? ` / ${lnk.click_limit}` : ""}
                        </strong>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-xs"
                            onClick={() => handleCopy(lnk.short_url, lnk.short_code)}
                          >
                            {copiedCode === lnk.short_code ? "Copied!" : "Copy"}
                          </button>
                          <button className="btn-xs" onClick={() => setPosterLink(lnk)}>
                            QR
                          </button>
                          <button
                            className={`btn-xs ${
                              lnk.is_active ? "btn-xs-danger" : "btn-xs-emerald"
                            }`}
                            onClick={() => handleToggleDisable(lnk)}
                          >
                            {lnk.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="btn-xs btn-xs-primary"
                            onClick={() => onSelectLink(lnk.id)}
                          >
                            Analytics
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header-row">
            <h3 className="panel-title" style={{ margin: 0 }}>
              Recent Click Activity
            </h3>
            <span className="muted-text">{metrics.recent_activity.length} latest events</span>
          </div>
          {metrics.recent_activity.length === 0 ? (
            <div className="empty-state">No click events recorded yet.</div>
          ) : (
            <div className="activity-feed">
              {metrics.recent_activity.map((act) => (
                <div
                  key={act.id}
                  className="activity-item"
                  onClick={() => act.link_id && onSelectLink(act.link_id)}
                >
                  <div className="activity-dot" />
                  <div className="activity-body">
                    <div className="activity-top">
                      <strong>/{act.short_code}</strong>
                      <span className="activity-time">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="activity-meta">
                      <span className="tag">{act.device_type || act.device || "Mobile"}</span>
                      <span className="tag">{act.browser || "Chrome"}</span>
                      <span className="tag">Ref: {act.referrer || "Direct"}</span>
                      {act.country && <span className="tag">{act.country}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {posterLink && (
        <PosterQrModal link={posterLink} onClose={() => setPosterLink(null)} />
      )}
    </div>
  );
}