# Shareat feature additions and testing guide

## Profile photos
- Donor and administrator accounts can upload a profile photo; NGO accounts can upload an organization logo.
- Supported formats: PNG, JPEG and WebP. Limit: 1 MB. Images are stored as data URLs in MongoDB for this college/demo build. For production, move image storage to S3, Cloudinary or another object store and persist only the returned URL.
- Profile update: `PATCH /api/profile` (authenticated).
- Password change: `PATCH /api/profile/password` (authenticated; current password required; bcrypt hash).

## Complaints and disputes
- `POST /api/complaints`: donor or NGO submits a complaint.
- `GET /api/complaints`: user sees their own complaints; admin sees all.
- `PATCH /api/complaints/:id`: admin updates status (`In review`, `Resolved`, `Closed`) and response.
- A complaint can optionally reference a donation. Ownership/assignment is checked server-side.

## Reports and analytics
- `GET /api/admin/analytics`: admin-only aggregated counts, monthly donations, category totals, status totals, verified NGOs, complaint count and collection rate.

## Pickup tracking and courier integration
- NGO/admin can set pickup window, collection partner, tracking ID and HTTPS courier tracking URL via `PATCH /api/tracking/:donationId`.
- Donor, assigned NGO and admin can view `GET /api/tracking/:donationId` and its timestamped event timeline.
- A courier provider can post updates to `POST /api/webhooks/courier` with `x-courier-secret` and JSON `{ "trackingCode": "...", "status": "picked_up", "note": "...", "location": "..." }`.
- Configure `COURIER_WEBHOOK_SECRET` and register the webhook URL with a courier service to receive automatic events. No courier provider account or live GPS feed is included; those require external credentials and provider-specific integration.

## Automated tests

### Backend unit tests
```powershell
npm test --prefix backend
```

### Backend API integration tests
Use a disposable test database (never production): set `TEST_MONGODB_URI` in your shell, then run:
```powershell
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27017/shareat_test"
npm run test:integration --prefix backend
```
The integration test starts an API process and exercises registration, login, profile update, password change and complaint creation/listing. It skips if `TEST_MONGODB_URI` is not set.

### Browser tests (Playwright)
```powershell
npm install --prefix frontend
npx playwright install chromium --with-deps
npm run test:e2e --prefix frontend
```
The browser test verifies the registration screen, account type selector and NGO organization field. Additional authenticated browser flows can be added using dedicated seeded test accounts.

## Security and production notes
- Keep `.env` files private. The distributed project ZIP should contain `.env.example` only.
- Do not store base64 images in MongoDB for high-volume production; use managed object storage.
- Courier webhook must use HTTPS and a long random secret; use provider signature verification when the provider supports signed webhooks.
- Add an email/OTP service before claiming email verification is supported.
- Use a separate MongoDB database for integration tests.


## Donation categories and item details

The donation form uses this category order: Clothes, Footwear, Food & groceries, Books, Stationery & school supplies, Household items, Blankets & bedding, Toys, Electronics, Other. Each category displays examples. Food donations require the `Sealed / packed` condition and an expiry date that is today or later. Non-food donations use New, Like new, Good, or Usable with a short condition hint. Quantity includes a unit (Pieces, Pairs, Kg, Litres, Packets / boxes, Sets); decimal quantities are accepted only for Kg and Litres. The backend stores `unit` and `expiryDate`, validates these rules, and cards display the quantity with its unit. The maximum quantity is 500.


## Notes & suggestions (added)
- `GET /api/notes`: any authenticated user can read published notes.
- `POST /api/notes`: Admin and NGO only.
- `PATCH /api/notes/:id`: Admin can edit any note; an NGO can edit only its own note.
- `DELETE /api/notes/:id`: Admin can delete any note; an NGO can delete only its own note.
- Donors have read-only access. Authorization is enforced by the Express API, not only by hiding frontend controls.
- Note fields: title, content, category (`Announcement`, `Suggestion`, `Update`, `Guideline`), author and author role.

## Profile consistency fix (added)
- The profile editor refreshes its form values when the authenticated account changes.
- Profile updates are sent using the current JWT session and the API updates only `req.user`; the email address remains read-only.
- Organization name is editable only for NGO accounts. Admin and donor profile forms do not expose that field.
- Existing database address/city values are preserved as entered; verify any inconsistent legacy values from the actual account owner before changing them.


## Admin dashboard improvements

- The admin overview summarizes members, NGO partners, listed donations, pending donations and distributed donations.
- User management searches donor and NGO accounts by name, email, organization or city; filters by account type; and allows admins to verify or revoke NGO verification. Results are capped at the newest 250 matching accounts, with the total match count displayed.
- Donation monitoring shows platform-wide donation records, supports search and status filters, displays donor/NGO assignment, and lets admins update donation status subject to the donation workflow rules.
- Reports include monthly donation volume, category/status breakdowns and collection completion.
- The shared authentication screen supports sign-in and donor/NGO registration, password visibility and matching-password validation. Admin accounts must be created with the backend seed script and cannot be created through public registration.
