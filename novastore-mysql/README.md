# NovaStore — single-seller e-commerce starter

A full-stack learning project with **React (frontend)**, **Express (backend API)**, and **MySQL (database)**. The frontend contains UI and HTTP API calls; backend owns authentication, validation, pricing, orders, and SQL.

## Requirements
- Windows 10/11, terminal (PowerShell or VS Code)
- Node.js 22 LTS or later compatible with Vite
- MySQL Server 8.0+ running and MySQL Workbench (Workbench alone is not the database server)

## Setup on Windows

1. Extract the zip and open `novastore` in VS Code.
2. In MySQL Workbench, connect to a running MySQL Server. The provided schema script will create `novastore` automatically.
3. In MySQL Workbench, open `backend/sql/schema.sql` and click the lightning bolt to execute the full script. This creates tables and inserts six demo products (only if products table is empty).
4. In the `backend` folder, copy `.env.example` as `.env`. Set your MySQL username, password, and host in `DB_USER`, `DB_PASSWORD`, and `DB_HOST` and replace `JWT_SECRET` with a random 32+ character string. Do not commit this file.
5. Open terminal A:
   ```powershell
   cd backend
   npm install
   npm run dev
   ```
6. Open terminal B:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
7. Visit **http://localhost:5173**. The frontend dev server proxies `/api` to `http://127.0.0.1:4000`. Check backend health at `http://localhost:4000/api/health`.

## Become store admin

1. Open the app and register a user normally (public signup always creates `buyer`).
2. In MySQL Workbench, run (replace sample email with your actual registered email):
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'YOUR_EMAIL_HERE';
   ```
3. Log out and log back in. You can now access **Admin dashboard** to add/edit/archive products and view orders. There is deliberately **no public admin registration endpoint**.

## Project layout

```
frontend/src/main.jsx   UI, components, page states
frontend/src/api.js     HTTP request helper ONLY
frontend/src/style.css  CSS styling
backend/src/server.js   REST routes, auth, business logic, transactional checkout
backend/src/db.js       MySQL connection pool
backend/sql/schema.sql  Tables and demo data
```

## Features
- Search/browse seeded products; add to cart and change quantities (cart lasts until refresh)
- Register/login/logout; signed HTTP-only session cookie
- Place a **demo order**; prices and stock are verified on the server in a DB transaction
- View order history
- Admin add/edit/archive products, inspect recent orders
- Responsive desktop and mobile UI

## APIs

| Verb | Endpoint | Access |
|--|--|--|
| GET | `/api/health` | public |
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public |
| GET | `/api/auth/me` | public |
| GET | `/api/products?search=...` | public |
| GET | `/api/orders` | buyer or admin |
| POST | `/api/orders` | buyer or admin |
| GET | `/api/admin/products` | admin |
| POST | `/api/admin/products` | admin |
| PUT | `/api/admin/products/:id` | admin |
| DELETE | `/api/admin/products/:id` | admin (soft delete) |
| GET | `/api/admin/orders` | admin |

## Scope and safety notes
- **Demo app, not production-ready.** No real payments, shipments, refunds, delivery fee, taxes, password resets, email verification, CSRF protection, request rate limiting, monitoring or automated tests.
- Checkout deliberately does not request credit card details. Orders use `placed` status even though payment is not collected.
- Keep `.env` private; use HTTPS, same-origin backend proxy, a long random secret, rate limits, CSRF defenses, validated image URLs, and secure hosting before deployment.
- Cart is in React state, not persisted across refresh. Server computes total from database prices, ignoring any client total.
- Product images currently use external image URLs and may fail without internet; replace with an image hosting service when deploying.
- `JWT_SECRET` encodes the user role at login; a role change requires logging in again. For production, always re-check authorization against DB on protected admin actions.
- The backend uses parameterized SQL (`mysql2`) rather than putting DB queries in the browser.

## MySQL-specific troubleshooting
- MySQL Workbench is a GUI. Confirm **MySQL Server** is installed and running: Windows `services.msc` → `MySQL80` (or similar) → Running.
- MySQL Server generally listens on port `3306`. Check your server connection details in Workbench and set matching values in `backend/.env`.
- `ER_ACCESS_DENIED_ERROR`: check DB_USER / DB_PASSWORD and that the account can access novastore.
- `ECONNREFUSED`: start MySQL Server, verify DB_HOST / DB_PORT. Workbench alone is not enough.
- `ER_BAD_DB_ERROR`: run the SQL schema in Workbench to create the database.
- Verify MySQL separately: in Workbench execute `USE novastore; SELECT COUNT(*) AS products FROM products;` (expected 6 for a new DB).
- For health test, use `http://localhost:4000/api/health`; a successful response is `{"ok":true}`.
- Never paste your real `.env` password or JWT_SECRET into chat or screenshots.
