# Shareat — Donation & Reuse Platform

Responsive MERN application for donating clothes, books, toys and household items, connecting donors with verified NGOs, and managing donation collection and distribution.

## Main features

- Role-based Donor, NGO and Admin accounts with JWT authentication and bcrypt password hashing
- Consistent profile management for all three roles, including donor/admin profile photos and NGO logo upload
- Secure profile editing and current-password-confirmed password changes
- NGO verification and role-restricted NGO donation actions
- Donor-selected verified NGO assignment; NGOs only see requests assigned to their account
- Verified NGO directory, beneficiary profile management, dynamic admin-managed categories and item types
- In-app notifications for assigned donation requests and donation status changes
- Donation creation, lifecycle status updates and pickup event history
- Donor donation history, city filtering, CSV report export, review ratings and additional analytics KPIs
- Structured saved locations with optional latitude/longitude for map-ready integration
- AES-256-GCM encryption for phone and address fields (requires a dedicated PII_ENCRYPTION_KEY)
- Pickup windows, collection partner, tracking ID and HTTPS carrier tracking URL
- Courier webhook endpoint for provider-supplied status updates (requires provider account and webhook secret)
- Notes & suggestions: Admin and NGO publishing; donor read-only access; Admin moderation; NGO edit/delete limited to own notes
- Complaints/disputes: create, list, admin review, resolution and response
- Admin dashboard: platform KPIs, pending donation count, recent activity and quick navigation
- User management: searchable donor/NGO directory, account-type filters and NGO verification controls
- Donation monitoring: platform-wide donation search/status filters, donor/NGO visibility and admin status workflow
- Admin reports: platform totals, verified NGO count, monthly donation volume, collection completion, category and status breakdowns
- Sign-in/create-account experience with password visibility, confirmation validation and role-safe public registration
- MongoDB persistence, REST API, responsive React interface

## Requirements

- Node.js 20 or newer
- npm
- MongoDB local or MongoDB Atlas

## Windows PowerShell setup

1. Extract the ZIP and open the `Donation-Reuse-Platform` folder.
2. Copy environment templates:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

3. Edit `backend/.env`. Set a working MongoDB URI, a unique JWT secret of at least 32 characters, a dedicated 64-character hexadecimal PII_ENCRYPTION_KEY, your frontend origin, and a strong admin email/password. Existing phone/address values are read as legacy plaintext and are encrypted when those fields are next saved; back up the database and keep the encryption key safe. Never use example credentials in a public deployment.
Generate a dedicated PII key in PowerShell with:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Paste the result into `PII_ENCRYPTION_KEY`. Back up this key securely; losing it makes encrypted phone/address fields unreadable.

4. Install dependencies:

```powershell
npm install
npm run install:all
```

5. Create the admin account once:

```powershell
npm run seed:admin --prefix backend
```

The seed script does not reset an existing admin password. Admins sign in through the same sign-in page as other users; public sign-up cannot create an administrator account.
6. Start backend and frontend:

```powershell
npm run dev
```

7. Open `http://localhost:5173`. API health endpoint: `http://localhost:5000/api/health`.

## Typical workflow

1. Register as donor and submit a donation.
2. Register as NGO.
3. Sign in as Admin and open **User management** to find and verify the NGO.
4. Donors select a verified NGO while creating each donation; the request is routed only to that NGO.
5. Sign in as the selected verified NGO and manage assigned requests and beneficiary profiles.
6. Set pickup window, courier/collection partner, tracking ID and optional external tracking URL under **Pickup tracking**.
7. Update the donation through Pickup scheduled, Collected and Distributed. Donors can see the tracking event timeline.
8. Publish announcements, suggestions, updates and guidelines under **Notes & suggestions**. Admins and NGOs can publish; donors can only read. NGOs can edit/delete their own posts, while Admins can manage all posts.
9. Submit and review complaints under **Complaints**. Admins can review and resolve them.
10. Admins can monitor all records under **Donation monitoring**, manage donor and NGO accounts under **User management**, and inspect platform reports under **Reports & analytics**.

## Tests

Backend unit tests:

```powershell
npm test --prefix backend
```

Backend API integration tests require a separate disposable MongoDB database and use the configured PII test key:

```powershell
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/shareat_test"
npm run test:integration --prefix backend
```

A lightweight API latency benchmark can be run against a live backend (it reports p50/p95 and whether the p95 smoke-test target is under 3 seconds):

```powershell
$env:REQUESTS="100"
$env:CONCURRENCY="10"
npm run test:performance --prefix backend
```

This benchmark is a smoke test, not proof of production performance; run it with realistic data, authenticated workflows and expected peak concurrency before claiming an SLA.

Browser tests use Playwright:

```powershell
npm install --prefix frontend
npx playwright install chromium
npm run test:e2e --prefix frontend
```

See `docs/FEATURES-AND-TESTING.md` for endpoint details, test configuration and courier webhook payload. See `docs/IMPLEMENTATION-STATUS.md` for the 13 requested improvements and remaining external integration requirements.

## Courier integration limitation

The app supports pickup metadata, event timelines, external courier tracking links and a secret-protected webhook receiver. It does not include a courier contract/API key or GPS device. Configure `COURIER_WEBHOOK_SECRET` and register `/api/webhooks/courier` with a courier provider to receive its updates. Actual live map/GPS tracking requires a provider that offers location events and a provider-specific adapter.

## Deployment and security

Deploy the React frontend and Express API separately, configure `VITE_API_URL` and `CLIENT_URL`, and use HTTPS. Keep `.env` files out of source control and ZIP distribution. This demo stores profile images as base64 data in MongoDB; for production, use object storage. Use a shared rate-limit store, provider-signed webhook verification, monitoring, audit logs, backups and a privacy/security review before public launch.
