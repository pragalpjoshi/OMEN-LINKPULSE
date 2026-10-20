import React, { useEffect, useState } from "react";
import { api, getStoredUser } from "./services/api";
import AuthView from "./components/AuthView";
import DashboardView from "./components/DashboardView";
import CreateLinkView from "./components/CreateLinkView";
import LinkAnalyticsView from "./components/LinkAnalyticsView";
import CampaignsView from "./components/CampaignsView";
import BulkImportView from "./components/BulkImportView";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("linkpulse_active_tab") || "dashboard"
  );
  const [selectedLinkId, setSelectedLinkId] = useState(() => {
    const saved = sessionStorage.getItem("linkpulse_selected_link");
    return saved ? Number(saved) : null;
  });
  const [campaigns, setCampaigns] = useState([]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("linkpulse_active_tab", tab);
  };

  const handleSelectLink = (linkId) => {
    setSelectedLinkId(linkId);
    if (linkId) sessionStorage.setItem("linkpulse_selected_link", String(linkId));
  };

  const handleOpenLinkAnalytics = (linkId) => {
    handleSelectLink(linkId);
    changeTab("analytics");
  };

  const refreshCampaigns = async () => {
    const list = await api.getCampaigns();
    setCampaigns(list);
  };

  useEffect(() => {
    if (user) {
      refreshCampaigns();
    }
  }, [user]);

  if (!user) {
    return <AuthView onAuthenticated={(loggedInUser) => setUser(loggedInUser)} />;
  }

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-Orb" />
          <div>
            <h1>OMEN</h1>
            <span>LINKPULSE</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            className={`nav-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => changeTab("dashboard")}
          >
            <span>◈</span> Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => changeTab("create")}
          >
            <span>＋</span> Create Link
          </button>
          <button
            className={`nav-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => changeTab("analytics")}
          >
            <span>◎</span> Link Analytics
          </button>
          <button
            className={`nav-btn ${activeTab === "campaigns" ? "active" : ""}`}
            onClick={() => changeTab("campaigns")}
          >
            <span>❖</span> Campaigns
          </button>
          <button
            className={`nav-btn ${activeTab === "import" ? "active" : ""}`}
            onClick={() => changeTab("import")}
          >
            <span>⇧</span> Bulk CSV Import
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-row">
            <div className="user-info-text">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
            <button className="btn-xs btn-xs-danger" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
          <div className="connection-pill">
            <span className="status-dot" /> Live Sync Active
          </div>
        </div>
      </aside>

      <main className="main-content">
        {activeTab === "dashboard" && (
          <DashboardView
            onSelectLink={handleOpenLinkAnalytics}
            onNavigate={changeTab}
          />
        )}

        {activeTab === "create" && (
          <CreateLinkView
            campaigns={campaigns}
            onCreated={() => refreshCampaigns()}
            onSelectLink={handleOpenLinkAnalytics}
          />
        )}

        {activeTab === "analytics" && (
          <LinkAnalyticsView
            selectedLinkId={selectedLinkId}
            onSelectLink={handleSelectLink}
          />
        )}

        {activeTab === "campaigns" && (
          <CampaignsView
            onSelectLink={handleOpenLinkAnalytics}
            onCampaignsChanged={refreshCampaigns}
          />
        )}

        {activeTab === "import" && (
          <BulkImportView onImportSuccess={() => changeTab("dashboard")} />
        )}
      </main>
    </div>
  );
}