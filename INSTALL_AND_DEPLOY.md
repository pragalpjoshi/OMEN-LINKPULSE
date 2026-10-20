# LinkPulse dashboard installation and deployment

## Why `/` shows Not Found
`http://127.0.0.1:8000/` is the API server. A 404 at `/` only means no root route is defined. The React dashboard runs separately at `http://localhost:5173`.

## Install dashboard files
Copy the included `frontend` folder into:
`C:\Users\HP\Desktop\Hackathons\OMEN-LINKPULSE\frontend`
Allow the included files to replace matching frontend files. Do not replace the backend folder with this pack.

## Run locally
Terminal 1 (backend):
```powershell
cd C:\Users\HP\Desktop\Hackathons\OMEN-LINKPULSE\backend
uvicorn app.main:app --reload
```
Terminal 2 (frontend):
```powershell
cd C:\Users\HP\Desktop\Hackathons\OMEN-LINKPULSE\frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Open `http://localhost:5173`. Backend API docs are at `http://127.0.0.1:8000/docs`.

`frontend/.env` should contain:
```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

## Important integration note
The dashboard calls `/auth/register`, `/auth/login`, `/auth/me`, `/api/links`, `/analytics/overview`, `/campaigns/`, and `/api/links/{id}/qr.png`. These endpoints must exist and return the fields expected by the frontend. Verify them in `/docs`; frontend files alone cannot repair a backend route, schema, or database mismatch. Register a new account, sign in, create a test URL, follow the short URL, and confirm analytics change before deployment.

## Deployment outline
1. Provision a managed MySQL database and create the LinkPulse schema. Apply migrations/SQL in dependency order; back up any existing database before altering tables.
2. Deploy the FastAPI `backend` to a Python hosting service. Set `DATABASE_URL`, `JWT_SECRET` (a long random secret), `DEBUG=false`, and `CORS_ORIGINS` to the exact frontend origin. Never upload `.env` or commit secrets.
3. Use a production start command such as `uvicorn app.main:app --host 0.0.0.0 --port $PORT` if supported by your host. Some Windows or host environments use a different port-variable syntax.
4. Deploy `frontend` as a static Vite site. Set `VITE_API_URL` to the deployed HTTPS API URL, then run `npm run build`; publish the `dist` directory.
5. Set backend CORS to the deployed frontend origin, enable HTTPS, configure backups/logging, and rotate any credentials previously committed or shared.
6. Test registration/login, link creation, redirect, disable, QR download, campaigns, CSV import, and analytics using a fresh account.

Do not describe the app as production-ready until these tests pass. The bundle does not contain hosting credentials and does not deploy the service automatically.
