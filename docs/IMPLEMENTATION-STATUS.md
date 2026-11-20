# Shareat improvement implementation status

This update implements the following application-level changes:

1. **Verified NGO directory:** donor-only API and directory view showing verified organizations and map-search links.
2. **Donor-selected NGO:** donation creation requires a verified NGO; requests are assigned to that NGO and city compatibility is checked.
3. **Dynamic categories:** categories and item types are stored in MongoDB and managed by admins; defaults are seeded at API startup.
4. **Notifications:** in-app notifications are created for assigned requests and donation status changes; users can mark notifications read.
5. **Beneficiaries:** verified NGOs can create, list, update and delete their own beneficiary records.
6. **Report export:** admins can export donation data as CSV.
7. **Locations/maps:** a saved Location entity supports structured address, city/state/postal code and coordinates; donation and NGO cards provide Google Maps search links. No paid geocoding API is configured.
8. **Donation history:** donor navigation has a dedicated Donation History entry backed by the donor's own donation records.
9. **NGO-specific requests:** NGOs only receive and update donations assigned to their account.
10. **KPIs:** repeat donor rate, average submitted satisfaction rating and average collection time are calculated from donation/review records.
11. **Personal-data encryption:** phone/address fields on users, beneficiaries and saved locations use AES-256-GCM with a dedicated environment key. Existing plaintext values remain readable and become encrypted when those fields are next saved; run a controlled migration if immediate at-rest conversion is required.
12. **City filtering:** NGO/admin donation lists accept city filters; verified NGO discovery supports city filtering; API lists use pagination limits.
13. **Performance:** a latency smoke benchmark reports average, p50, p95 and maximum health-endpoint latency. It does not establish an SLA; realistic authenticated load testing is still required.

## Integration configuration still required

- Generate and securely store `PII_ENCRYPTION_KEY` (64 hexadecimal characters). Losing the key makes encrypted fields unreadable.
- Configure a Google Maps API/geocoding provider only if address-to-coordinate lookup or embedded maps are required; the current build uses Google Maps search URLs and stores optional coordinates.
- Email/SMS delivery is not configured. In-app notifications are implemented; connect a mail/SMS provider if those channels are required.
- Run MongoDB-backed integration tests and the performance benchmark in the target deployment environment.
