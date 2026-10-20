<div align="center">

# OMEN — LINKPULSE
### Next-Generation URL Intelligence, Campaign Telemetry & QR Studio

[![Live Demo](https://img.shields.io/badge/🌐_Live_Application-omenlinkpulse.netlify.app-6366f1?style=for-the-badge)](https://omenlinkpulse.netlify.app)
[![Backend API](https://img.shields.io/badge/⚙️_Production_API-Render_Cloud-10b981?style=for-the-badge)](https://omen-linkpulse.onrender.com/api/health)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)

<p align="center">
  <b>Built with precision by Team OMEN</b><br/>
  <i>Shorten with confidence. Track with clarity. Quarantine threats in real time.</i>
</p>

</div>

---

##  Overview

Most URL shorteners do one thing: turn a long string into a short one, leaving creators and engineering teams blind to what happens after a user clicks. 

**OMEN-LINKPULSE** reimagines link management as a complete telemetry and security suite. Built by **Team OMEN**, LinkPulse pairs sub-millisecond redirection with real-time heuristic threat scanning, campaign-level attribution, print-ready QR poster generation, and an instant **Security Kill-Switch** that lets you freeze compromised or expired links without losing a single row of historical analytics.

<table>
  <tr>
    <td width="50%">
      <h4>Live Deployments</h4>
      <ul>
        <li><b>Frontend Web App:</b> <a href="https://omenlinkpulse.netlify.app">omenlinkpulse.netlify.app</a></li>
        <li><b>Backend API Gateway:</b> <a href="https://omen-linkpulse.onrender.com">omen-linkpulse.onrender.com</a></li>
        <li><b>Health Check Endpoint:</b> <a href="https://omen-linkpulse.onrender.com/api/health"><code>/api/health</code></a></li>
      </ul>
    </td>
    <td width="50%">
      <h4>Documentation Suite</h4>
      <ul>
        <li><a href="./docs/api.md"><b>API Reference (<code>docs/api.md</code>)</b></a></li>
        <li><a href="./docs/architecture.md"><b>System Architecture (<code>docs/architecture.md</code>)</b></a></li>
      </ul>
    </td>
  </tr>
</table>

---

##  Key Capabilities

<details open>
<summary><b>1.  Smart Link Shortening & Custom Aliases</b></summary>
<br/>
Generate ultra-clean short links (<code>/s/{alias}</code>) with real-time alias availability checks, custom tags (<code>#launch</code>, <code>#qr</code>), expiration timestamps, maximum click caps, and optional SHA-256 password protection.
</details>

<details open>
<summary><b>2.  Heuristic URL Safety Scanner & Security Kill-Switch</b></summary>
<br/>
Every destination URL is evaluated against phishing patterns, raw IP masks, and high-risk TLDs before creation. If a link needs to be taken down after distribution, the <b>Security Kill-Switch</b> blocks live redirects immediately while keeping historical click telemetry intact.
</details>

<details open>
<summary><b>3.  Granular Click Telemetry & Bot Filtering</b></summary>
<br/>
Captures timestamped visits across referrers (Instagram, WhatsApp, LinkedIn, Direct), device types (Mobile, Desktop, Tablet), browsers, and countries—while separating human traffic from automated crawlers.Includes a built-in <b>Live Visit Simulator</b> for instant testing during demos.
</details>

<details open>
<summary><b>4.  QR Code & Print Poster Studio</b></summary>
<br/>
Every link automatically generates a crisp, high-contrast QR code. With one click, open the <b>Poster QR Studio</b> to export print-ready promotional flyers or raw PNG/SVG assets.
</details>

<details open>
<summary><b>5. Campaign Grouping & Bulk CSV Importer</b></summary>
<br/>
Organize links into marketing campaigns (e.g., <i>Q4 Product Launch</i>) or upload hundreds of URLs at once via CSV with row-by-row validation and duplicate detection before committing to the database.
</details>

---

## Meet Team OMEN

<table width="100%">
  <thead>
    <tr>
      <th align="left">Member</th>
      <th align="left">Role</th>
      <th align="left">Core Contributions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>Pragalp Joshi</b></td>
      <td>👑 <b>Team Leader & Full-Stack Architect</b></td>
      <td>System architecture, FastAPI backend engine, React 18 dashboard interface, hybrid state resilience, and cloud deployment (Render + Netlify).</td>
    </tr>
    <tr>
      <td><b>Aditya Singh Rana</b></td>
      <td>⚙️ <b>Backend & Telemetry Engineer</b></td>
      <td>Redirect gateway, click-event ingestion pipeline, user-agent & bot-detection heuristics, and analytics aggregation endpoints.</td>
    </tr>
    <tr>
      <td><b>Kamal Bhatt</b></td>
      <td>🎨 <b>Frontend & Data Visualization Lead</b></td>
      <td>MySQL schema & foreign-key design, custom SVG time-series & breakdown charts, responsive dark-mode styling, and QR Poster Studio.</td>
    </tr>
    <tr>
      <td><b>Khushboo Kathayat</b></td>
      <td>🛡️ <b>Security, QA & Bulk Operations</b></td>
      <td>URL safety scanner, password-gated redirect flow, CSV pre-flight parser & validator, and end-to-end API testing.</td>
    </tr>
  </tbody>
</table>

---

## Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Custom Responsive CSS3 Grid/Flexbox, Native SVG Charting |
| **Backend** | Python 3, FastAPI, Uvicorn ASGI Server, Pydantic v2 Validation |
| **Database** | Cloud MySQL 8.0, SQLAlchemy 2.0 ORM, PyMySQL Driver |
| **Utilities & Security** | `qrcode` + `Pillow` (Server QR rendering), SHA-256 Password Hashing, Bearer Session Tokens |
| **Cloud Infrastructure** | **Netlify** (Edge CDN + Reverse Proxy Redirects), **Render** (Web Service), **Cloud MySQL** |

---

##  Project Structure

```text
OMEN-LINKPULSE/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM tables (User, Link, Campaign, ClickEvent, Tag)
│   │   ├── routers/         # FastAPI route controllers (auth, link, analytics, campaigns, imports, qr, redirects)
│   │   ├── schemas/         # Pydantic request/response contracts
│   │   ├── services/        # Business logic (safety_service, analytics_service, redirect_service)
│   │   ├── config.py        # Environment variable loader
│   │   ├── database.py      # SQLAlchemy engine & session lifecycle
│   │   ├── security.py      # Password hashing & token verification
│   │   └── main.py          # FastAPI entrypoint, CORS, and initial database seeder
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Modular React views (Dashboard, CreateLink, LinkAnalytics, Campaigns, BulkImport, Auth)
│   │   ├── services/api.js  # Fault-tolerant API client with automatic local-cache synchronization
│   │   ├── App.jsx          # Root layout & persistent navigation controller
│   │   └── App.css          # Cybernetic dark-mode theme & responsive breakpoints
│   ├── netlify.toml         # Edge proxy rules (/api/*, /s/*, /r/*)
│   └── vite.config.js       # Vite bundler & local proxy configuration
└── docs/
    ├── api.md               # Complete REST API documentation
    └── architecture.md      # System design & data-flow blueprints