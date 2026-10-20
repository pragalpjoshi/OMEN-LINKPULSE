<div align="center">

# OMEN-LINKPULSE — REST API Reference
**Base Production URL:** `https://omen-linkpulse.onrender.com`  
**Local Development URL:** `http://127.0.0.1:8000`  
**API Version:** `v4.0.0`

</div>

---

## Authentication & Headers

OMEN-LINKPULSE uses Bearer tokens for session authentication. Public redirect endpoints (`/s/{short_code}`) and QR rendering (`/api/qr`) do not require authentication.

```http
Content-Type: application/json
Authorization: Bearer <access_token>