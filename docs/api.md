# LinkPulse API (MVP)

Base URL: `http://localhost:8000`. Interactive OpenAPI docs: `/docs`.

## Authentication
- `POST /auth/register` JSON `{ "name": "Your Name", "email": "you@example.com", "password": "at-least-10-characters" }`
- `POST /auth/login` form fields `username` (email) and `password`; returns a Bearer access token.
- `GET /auth/me` requires `Authorization: Bearer <token>`.

## Links (Bearer token required)
- `POST /api/links` JSON `{ "original_url": "https://example.com", "custom_alias": "optional-alias", "campaign_id": null, "expires_at": null, "click_limit": null }`
- `GET /api/links?skip=0&limit=50`
- `GET /api/links/{link_id}`
- `PATCH /api/links/{link_id}`
- `DELETE /api/links/{link_id}` disables the link.
- `GET /api/links/{link_id}/qr.png` returns a QR image.
- `GET /{short_code}` redirects and records a click.

## Campaigns and analytics
Campaign endpoints: `GET/POST /campaigns/`, `GET/PATCH/DELETE /campaigns/{campaign_id}`.
Analytics endpoints: `GET /analytics/overview`, `GET /analytics/links/{link_id}`.
CSV import: `POST /api/imports/links` multipart form field `file`; CSV must have an `original_url` column. `custom_alias` is optional.

All user-owned resources must be accessed with a valid Bearer token. Do not use or send `X-User-Id` for identity.