# E‑Tendering Portal

Production‑ready monorepo for an e‑tendering system. It contains a React (Vite) frontend and a Node.js/Express API backed by PostgreSQL.

- Frontend: Vite + React 19, Redux Toolkit, React Router, React Toastify
- Backend: Express 4, PostgreSQL (pg), JWT auth, Multer uploads, Nodemailer, Winston logging
- Database: PostgreSQL 12+ (tested locally)


Directory layout
- frontend/ – React SPA (Vite dev server on 5173)
- backend/ – Express API (default port 3001)


Prerequisites
- Node.js LTS (v18+ recommended)
- npm (ships with Node)
- PostgreSQL 12+ running locally (default port 5432)
- Git (optional)


Quick start (local development)
1) Clone and open the project
- Windows PowerShell example:
  - cd "C:\\Users\\Talal Khan\\etendering portal"

2) Install dependencies
- Backend: cd backend && npm install
- Frontend: cd ../frontend && npm install

3) Configure environment variables
- Backend: create backend/.env (do not commit). Minimal template:

  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=Bidding
  DB_USER=postgres
  DB_PASSWORD={{DB_PASSWORD}}

  JWT_SECRET={{JWT_SECRET}}
  JWT_EXPIRES_IN=7d

  PORT=3001
  NODE_ENV=development
  CLIENT_URL=http://localhost:5173
  FRONTEND_URL=http://localhost:5173

  # Email (optional for sending credentials / resets)
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER={{GMAIL_ADDRESS}}
  SMTP_PASS={{GMAIL_APP_PASSWORD}}
  FROM_EMAIL={{GMAIL_ADDRESS}}

- Generating a strong JWT secret (PowerShell):
  - $env:JWT_SECRET = [Guid]::NewGuid().ToString() + [Guid]::NewGuid().ToString()
  - Then put {{JWT_SECRET}} into backend/.env

- Frontend: create frontend/.env (optional in dev because Vite proxy is set). For production it is required:

  VITE_API_BASE_URL=http://localhost:3001/api

4) Initialize the database
- Option A – automatic DB existence check and listing tables:
  - From backend/: node setup-db.js
- Option B – create DB manually with psql:
  - psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE \"Bidding\";"

5) Create or update tables (migrations)
- From backend/:
  - npm run migrate              # basic schema (users, categories, tenders, bids)
  - node scripts/enhanced-migrate.js  # richer schema with more columns/tables (optional)

6) Seed sample data (optional)
- From backend/: npm run seed
  - Creates default accounts and sample tenders:
    - Admin: admin@etendering.com / admin123
    - Buyer: buyer@company.com / buyer123
    - Supplier: supplier@vendor.com / supplier123

7) Run the services
- Backend API: from backend/: npm run dev  (http://localhost:3001)
  - Health checks:
    - GET http://localhost:3001/api/health
    - GET http://localhost:3001/api/health/detailed
- Frontend app: from frontend/: npm run dev  (http://localhost:5173)
  - Vite dev proxy forwards /api to http://localhost:3001


Database configuration details
- The API uses a single pg Client managed in backend/config/database.js
- Required backend .env keys
  - DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
  - PORT (default 3001)
- Connectivity checks and helpers
  - node backend/test-connectivity.js – verifies SELECT access to core tables
  - node backend/scripts/db_health_check.js – script used by API health
  - node backend/scripts/fix-database.js – creates DB and basic tables if missing


Email (SMTP) setup
- Optional, only needed to send real emails (welcome, credentials, resets).
- Gmail requires an App Password (not your normal password).
- See backend/docs/EMAIL_SETUP.md for a guided setup:
  - npm run setup:gmail
  - npm run test:email


Environment variables reference
- Backend
  - JWT_SECRET, JWT_EXPIRES_IN
  - CLIENT_URL, FRONTEND_URL (CORS)
  - UPLOAD_PATH (default ./uploads), MAX_FILE_SIZE
  - SMTP_* vars as above; FORCE_SMTP=true in development to send real mail
- Frontend
  - VITE_API_BASE_URL – Base URL to the API (include /api). Example: https://your-domain.com/api


Common tasks
- Run migrations again (safe):
  - npm run migrate
- Inspect/verify tables:
  - node check-tables.js
- Admin tools (examples):
  - node scripts/add-username-migration.js
  - node scripts/send-expiry-notifications.js


Production deployment (outline)
- Backend
  - Set NODE_ENV=production and configure production .env with secure values
  - Start server with a process manager (PM2, systemd, Windows service)
  - Reverse proxy with Nginx or IIS to expose HTTPS and forward /api to port 3001
- Database
  - Use a managed PostgreSQL or a secured VM instance
  - Ensure backups and TLS as appropriate
- Frontend
  - From frontend/: npm run build (outputs to frontend/dist)
  - Serve the dist/ directory from any static file server or CDN
  - Make sure VITE_API_BASE_URL points at the public API URL


API overview (selected)
- Auth: /api/auth/register, /api/auth/login, /api/auth/profile, /api/auth/change-password
- Users (admin): /api/users, /api/users/:id
- Categories: /api/categories
- Tenders: /api/tenders, /api/tenders/:id, /api/tenders/public
- Bids: /api/bids (enhanced endpoints)
- Files: /api/upload/* and /api/files/*


Troubleshooting
- EADDRINUSE when starting backend: another process uses port 3001. Change PORT in backend/.env or stop the other process.
- Cannot connect to PostgreSQL:
  - Ensure service is running and credentials match .env
  - Try node backend/scripts/fix-database.js to create DB and basic tables
- CORS errors: verify CLIENT_URL/FRONTEND_URL in backend/.env matches your frontend origin.
- Frontend cannot reach API in production: set VITE_API_BASE_URL to the public API base (e.g., https://api.example.com/api), rebuild frontend.


Security notes
- Never commit .env files or secrets. Use environment variables in production.
- Use a long random JWT_SECRET. Rotate periodically.
- Validate file upload limits and storage as per your deployment needs.


License
- MIT (see backend/README.md for details)
