# LinkPulse

URL shortener and click analytics MVP built with FastAPI, SQLAlchemy, MySQL, React, and Vite.

## Backend (Windows PowerShell)
1. Create a MySQL database named `Linkpulse` and a dedicated database user.
2. From `backend`, create and activate a virtual environment, then install dependencies:
   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   Copy-Item .env.example .env
   ```
3. Edit `.env`: set `DATABASE_URL` and a long random `JWT_SECRET`. Ensure the tables match the ORM models. For a clean development database only, you may create tables with `Base.metadata.create_all`; for an existing database, use proper migrations instead.
4. Start API from the project root with `uvicorn app.main:app --app-dir backend --reload` or from `backend` with `uvicorn app.main:app --reload`.
5. Open `http://localhost:8000/docs` and test `/health/database`.

## Frontend
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Open `http://localhost:5173`.