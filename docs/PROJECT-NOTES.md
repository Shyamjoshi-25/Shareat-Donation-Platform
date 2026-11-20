# Project implementation notes

## Roles
- Donor: creates, views and withdraws own pending donations; manages own profile and profile photo; views pickup events; submits complaints.
- NGO: requires administrator verification; manages organization profile/logo; browses pending donations, accepts available requests, updates pickup details and status; submits complaints.
- Admin: manages own profile/photo, verifies NGOs, reviews all donation records and complaints, resolves disputes and views analytics.

## Donation lifecycle
Pending → Accepted → Pickup scheduled → Collected → Distributed. A pending request may also be Rejected. Donors may withdraw only Pending donations. NGO acceptance is guarded by an atomic database update.

## New data entities and APIs
- User: role, contact details, organization, verification state and profile image.
- Donation: core item and pickup data, courier metadata and timestamped tracking events.
- Complaint: reporter, optional donation reference, subject, category, description, status and admin response.
- Profile: `PATCH /api/profile`, `PATCH /api/profile/password`.
- Complaints: `POST/GET /api/complaints`, admin `PATCH /api/complaints/:id`.
- Analytics: admin-only `GET /api/admin/analytics`.
- Tracking: `GET/PATCH /api/tracking/:donationId`; courier webhook `POST /api/webhooks/courier`.

## Security
Passwords are bcrypt hashed; protected routes use JWT; roles and donation ownership are checked server-side; profile image type/size and text fields are validated; courier webhooks require a timing-safe shared secret; courier URLs must use HTTPS. Configure a strong unique webhook secret for production.

## Boundaries
Courier webhook integration is provider-ready but requires an external courier account and provider-side webhook configuration. No live GPS map is claimed. Profile images are stored as base64 in MongoDB for this demo; production should use object storage. Email verification, password reset and email/SMS notifications still require an email/SMS provider integration.
