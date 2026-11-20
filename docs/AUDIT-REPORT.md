# Shareat source review and feature update report

## Reviewed project areas
- React/Vite frontend entry point, role navigation, registration/login forms, donation list and admin NGO verification UI.
- Express server, JWT middleware, authentication, donation and admin routes.
- Mongoose User and Donation models, donation lifecycle domain and existing unit tests.

## Added in this update
- Donor and Admin profile photo upload; NGO organization logo upload.
- Shared profile editor for all roles, plus secure current-password-confirmed password changes.
- Complaints/dispute submission, personal complaint history and admin review/resolution.
- Admin analytics API and dashboard with monthly, category and status breakdowns.
- Pickup tracking details, timestamped event timeline and a shared-secret courier webhook receiver.
- Playwright browser test and a MongoDB-backed API integration test.

## Security boundaries
- Profile image input accepts PNG/JPEG/WebP data URLs up to 1 MB; API JSON limit is 2 MB.
- Passwords remain bcrypt hashes and are never returned in profile responses.
- Complaint donation references are checked against donor ownership or NGO assignment.
- Tracking access is restricted to the donor, assigned NGO or admin.
- Courier webhook uses a timing-safe shared-secret comparison; configure a long random `COURIER_WEBHOOK_SECRET` and HTTPS.

## Verification performed in this review environment
- Backend JavaScript syntax checks: passed.
- Frontend JSX parse check: passed.
- Backend unit tests: 4 passed.
- MongoDB-backed API integration test: skipped because `TEST_MONGODB_URI` was not configured.
- Frontend production build and Playwright browser execution: not run. The uploaded `node_modules` contained Windows-only native optional binaries, while this review environment is Linux. Reinstall dependencies on the target Windows machine (`npm install` / `npm run install:all`) before building or running Playwright.

## Existing limitations / external setup
- Actual courier GPS/live map tracking is not included. The webhook and external tracking URL are integration points; a courier provider account, provider-specific payload adapter and API/webhook credentials are required.
- Email/OTP verification, password recovery, and email/SMS notifications still need an email/SMS provider.
- Base64 profile images are suitable for a small demonstration only; production should use object storage.
