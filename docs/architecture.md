<div align="center">

# OMEN-LINKPULSE — System Architecture
**Engineering Blueprint, Database Schema & Fault-Tolerance Design**  
*Authored by Team OMEN (Pragalp Joshi, Aditya Singh Rana, Kamal Bhatt, Khushboo Kathayat)*

</div>

---

## 1. High-Level Cloud Topology

OMEN-LINKPULSE uses a decoupled, edge-proxied 3-tier architecture designed for zero-CORS friction, clean short links, and high availability.

```mermaid
graph LR
    subgraph Client_Layer ["Client & Edge Layer (Netlify)"]
        Browser["React 18 SPA<br/>(omenlinkpulse.netlify.app)"]
        EdgeProxy["Netlify Edge Proxy<br/>(netlify.toml)"]
    end

    subgraph Compute_Layer ["Application Layer (Render)"]
        FastAPI["FastAPI + Uvicorn<br/>(omen-linkpulse.onrender.com)"]
        Safety["Heuristic Safety Scanner"]
        QR["QR Studio Engine<br/>(qrcode + Pillow)"]
    end

    subgraph Storage_Layer ["Persistence Layer"]
        MySQL[("Cloud MySQL 8.0<br/>Relational Database")]
        LocalCache[("Browser LocalStorage<br/>Hybrid Sync Cache")]
    end

    Browser <-->|"HTTPS / JSON"| EdgeProxy
    Browser <-->|"Instant Failover Sync"| LocalCache
    EdgeProxy -->|"/api/* & /s/*"| FastAPI
    FastAPI --> Safety
    FastAPI --> QR
    FastAPI <-->|"SQLAlchemy 2.0 + PyMySQL"| MySQL