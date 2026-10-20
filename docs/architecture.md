# LinkPulse architecture

- **Frontend:** React + Vite single-page dashboard.
- **API:** FastAPI REST endpoints, Pydantic request/response validation.
- **Persistence:** SQLAlchemy ORM with MySQL/PyMySQL.
- **Identity:** Password hashes via Argon2 (pwdlib) and signed JWT bearer tokens.
- **Core services:** link creation and URL validation, redirect/click recording, analytics aggregations.
- **Auxiliary features:** campaign organization, CSV link import, QR code generation.

## Production considerations
Use HTTPS, a strong randomly generated `JWT_SECRET`, a least-privilege database user, restrictive CORS origins, database migrations, backups, monitoring, request rate limiting, and a deployment-specific `PUBLIC_BASE_URL`. Never expose `.env` or commit credentials. URL validation rejects obvious local/private IP targets, but it is not a phishing classifier. Bot detection is heuristic and analytics should be interpreted accordingly.