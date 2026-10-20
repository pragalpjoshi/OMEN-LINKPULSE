import React, { useEffect, useState } from "react";
import { api } from "../services/api";

export default function CampaignsView({ onSelectLink, onCampaignsChanged }) {
  const [campaigns, setCampaigns] = useState([]);
  const [allLinks, setAllLinks] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [selectedLinkIds, setSelectedLinkIds] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    utm_source: "",
    utm_medium: "",
    status: "active",
  });
  const [error, setError] = useState("");

  const fetchAll = async () => {
    const [campData, linksData] = await Promise.all([
      api.getCampaigns({ status: filterStatus, search }),
      api.getLinks(),
    ]);
    setCampaigns(campData);
    setAllLinks(linksData);
    if (!selectedCampaignId && campData.length > 0) {
      setSelectedCampaignId(campData[0].id);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [filterStatus, search]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setError("");
    if (!newCampaign.name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    try {
      const created = await api.createCampaign(newCampaign);
      setNewCampaign({
        name: "",
        description: "",
        utm_source: "",
        utm_medium: "",
        status: "active",
      });
      await fetchAll();
      setSelectedCampaignId(created.id);
      if (onCampaignsChanged) onCampaignsChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAssignLinks = async () => {
    if (!selectedCampaignId || selectedLinkIds.length === 0) return;
    await api.assignLinksToCampaign(selectedCampaignId, selectedLinkIds);
    setSelectedLinkIds([]);
    await fetchAll();
  };

  const maxCampaignClicks = Math.max(...campaigns.map((c) => c.total_clicks), 1);
  const activeCampaignLinks = allLinks.filter((l) => l.campaign_id === selectedCampaignId);

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <h2>Campaign Management & Performance Comparison</h2>
          <p className="muted-text">
            Create campaigns, assign short links, filter results, and benchmark performance across campaigns.
          </p>
        </div>
        <div className="header-actions">
          <input
            type="text"
            className="input-field"
            placeholder="Filter campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Create Campaign + Assign Links */}
      <div className="two-col-grid">
        <form className="panel" onSubmit={handleCreateCampaign}>
          <h3 className="panel-title">Create New Campaign</h3>
          {error && <div className="error-banner">{error}</div>}
          <div className="form-row-2">
            <div className="form-group">
              <label>Campaign Name *</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Black Friday Promo"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                className="input-field"
                value={newCampaign.status}
                onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label>UTM Source</label>
              <input
                type="text"
                className="input-field"
                placeholder="newsletter, twitter..."
                value={newCampaign.utm_source}
                onChange={(e) => setNewCampaign({ ...newCampaign, utm_source: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>UTM Medium</label>
              <input
                type="text"
                className="input-field"
                placeholder="cpc, social, email..."
                value={newCampaign.utm_medium}
                onChange={(e) => setNewCampaign({ ...newCampaign, utm_medium: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              className="input-field"
              placeholder="Campaign objective..."
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            + Create Campaign
          </button>
        </form>

        {/* Assign Links to Campaign */}
        <div className="panel">
          <h3 className="panel-title">Assign Links to Campaign</h3>
          <div className="form-group">
            <label>Target Campaign</label>
            <select
              className="input-field"
              value={selectedCampaignId || ""}
              onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
            >
              <option value="" disabled>
                Select Campaign
              </option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.total_links} links)
                </option>
              ))}
            </select>
          </div>

          <div className="assign-links-box">
            {allLinks.map((lnk) => {
              const checked = selectedLinkIds.includes(lnk.id);
              return (
                <label key={lnk.id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLinkIds([...selectedLinkIds, lnk.id]);
                      } else {
                        setSelectedLinkIds(selectedLinkIds.filter((id) => id !== lnk.id));
                      }
                    }}
                  />
                  <span>
                    <strong>/{lnk.short_code}</strong>{" "}
                    <small className="muted-text">
                      ({lnk.campaign_name || "Unassigned"} • {lnk.clicks_count} clicks)
                    </small>
                  </span>
                </label>
              );
            })}
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: "0.75rem" }}
            disabled={!selectedCampaignId || selectedLinkIds.length === 0}
            onClick={handleAssignLinks}
          >
            Assign {selectedLinkIds.length} Selected Link(s)
          </button>
        </div>
      </div>

      {/* Campaign Performance Comparison Table */}
      <div className="panel">
        <h3 className="panel-title">Campaign Performance Comparison</h3>
        {campaigns.length === 0 ? (
          <div className="empty-state">No campaigns match your current filter.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Total Links</th>
                  <th>Active Links</th>
                  <th>Total Clicks</th>
                  <th>Avg Clicks / Link</th>
                  <th>Top Link</th>
                  <th>Relative Volume</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const pct = Math.round((c.total_clicks / maxCampaignClicks) * 100);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCampaignId(c.id)}
                      style={{
                        cursor: "pointer",
                        background: c.id === selectedCampaignId ? "rgba(99,102,241,0.12)" : "",
                      }}
                    >
                      <td>
                        <div className="cell-main">{c.name}</div>
                        <div className="cell-sub">{c.description || "No description"}</div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === "active" ? "badge-success" : "badge-warning"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>{c.total_links}</td>
                      <td>{c.active_links}</td>
                      <td>
                        <strong className="clicks-pill">{c.total_clicks}</strong>
                      </td>
                      <td>{c.avg_clicks_per_link}</td>
                      <td>
                        {c.top_link_code ? (
                          <code>/{c.top_link_code} ({c.top_link_clicks})</code>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ minWidth: "160px" }}>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${Math.max(pct, 4)}%`, background: "#6366f1" }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filtered Links Inside Selected Campaign */}
      {selectedCampaignId && (
        <div className="panel">
          <h3 className="panel-title">
            Links in Selected Campaign ({activeCampaignLinks.length})
          </h3>
          {activeCampaignLinks.length === 0 ? (
            <div className="empty-state">No links assigned to this campaign yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Short Code</th>
                    <th>Destination</th>
                    <th>Clicks</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCampaignLinks.map((l) => (
                    <tr key={l.id}>
                      <td><strong>/{l.short_code}</strong></td>
                      <td>{l.destination_url}</td>
                      <td><strong className="clicks-pill">{l.clicks_count}</strong></td>
                      <td>
                        <span className={`badge ${l.effective_active ? "badge-success" : "badge-danger"}`}>
                          {l.effective_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button className="btn-xs btn-xs-primary" onClick={() => onSelectLink(l.id)}>
                          View Analytics
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}