# Royal Cuts — Luxury Hair & Grooming Studio

Royal Cuts is a responsive, multi-page website with an Express REST API and MongoDB persistence. It includes customer accounts, appointment availability and booking, contact messages, an image gallery, and a protected studio dashboard.

## Requirements

- Node.js 18 or newer
- npm
- A MongoDB Atlas cluster with a database user and network access configured

## Install

From the project root:

```powershell
npm.cmd install
```

## Configure MongoDB Atlas and environment

The server loads configuration from `backend\.env`. A local file is generated for this checkout; if you need to create it again, copy the example and replace its placeholders:

```powershell
Copy-Item backend\.env.example backend\.env
```

In MongoDB Atlas:

1. Create a cluster and a database user under **Database Access**.
2. Add your current IP address under **Network Access**.
3. Choose **Connect → Drivers → Node.js** and copy the connection string.
4. Paste it as the value of `MONGODB_URI` in `backend\.env`, replacing `<db_username>`, `<db_password>` and the cluster host with values supplied by Atlas. URL-encode special characters in the database username or password.

`backend\.env.example` contains an Atlas URI template, not working credentials. The server will not start until `MONGODB_URI` is populated with your real Atlas connection string, Atlas allows this machine's IP, and the database user has access. A unique `JWT_SECRET` of at least 32 characters is generated for the local environment. Keep `.env` private and never put database credentials or signing secrets in frontend files. Set `NODE_ENV=production` in production. The bundled frontend calls relative `/api` URLs and should be served from the same origin as the API (for example, through a reverse proxy). `CORS_ORIGIN` is an optional exact-origin allowlist for cross-origin API clients; it does not change the bundled frontend's API base URL.

The server creates the studio schedule on first start and inserts a starter service menu and gallery if those collections are empty. Starter service prices are zero and are presented as “Price set by studio”; set the real prices in the admin dashboard before publishing the site.

## Create the first administrator securely

Set `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, and a unique `ADMIN_PASSWORD` (at least 14 characters) in `backend\.env`. Do not use sample/default credentials. After MongoDB is configured, run once:

```powershell
npm.cmd run create-admin
```

This hashes the password with bcrypt before storing it. The script refuses to replace an existing account. Remove the `ADMIN_*` values from the server environment after the account is created, or keep them in a protected secret manager. Do not register an admin through the public customer signup form.

## Start the application

```powershell
npm.cmd start
```

The application serves both the frontend and API from `http://localhost:3000`. Open the site at `http://localhost:3000`; use `/admin/` for the dashboard. For development with automatic server restarts, use `npm.cmd run dev`.

The static frontend is served by Express, so no separate frontend build or local-storage backend substitute is used. All bookings, user accounts, messages, studio settings and managed content are stored in MongoDB.

## Booking workflow

1. Configure MongoDB Atlas and start the server; verify `http://localhost:3000/api/health` returns `{"status":"ok","database":"connected"}`.
2. Visit `/services.html` to view the seeded services, then `/booking.html`.
3. Choose a service and date. The time selector is populated from the active service duration, studio opening hours, closed weekdays, and current bookings.
4. Submit a booking. A successful response includes the generated booking ID and its initial `Pending` status. Reload the page or inspect MongoDB to verify persistence.
5. Use the booking ID and booking email in the lookup form to see status or cancel at least 24 hours before the appointment.
6. Sign in as the administrator at `/login.html`, open `/admin/`, and confirm the request. The appointment is then visible with its updated status.

Active pending and confirmed appointments reserve every interval they overlap. A unique MongoDB index arbitrates simultaneous requests, so two requests for overlapping time cannot both be persisted. Cancelled and completed appointments release the reservation. Customers can also create an account; bookings made while signed in are available from the authenticated `/api/appointments/mine` endpoint.

## Studio setup

In the admin dashboard:

- Update opening/closing times, appointment interval and closed weekdays.
- Enter the actual studio phone, WhatsApp number, email, address, map embed URL and social links. Until configured, the public contact page explicitly indicates which details need to be set.
- Edit starter services and their prices/durations, add services, or remove services from the public menu.
- Add or remove gallery images. Use image URLs you have rights to use.
- Publish or remove guest testimonials. Only publish real guest feedback with permission; no testimonials are fabricated or seeded.
- Review guest bookings and contact messages.

Appointment hours and slot labels are interpreted in the configured IANA studio time zone. The default is UTC; set the actual zone in Studio settings. Nonexistent daylight-saving transition times are excluded.

## Security notes

- Passwords use bcrypt hashing; sessions use signed JWTs in `HttpOnly`, `SameSite=Strict` cookies.
- Admin routes check the authenticated database user role on every request.
- Login, booking and contact requests are rate limited. API inputs are validated and bounded, and responses do not disclose server stack traces.
- MongoDB credentials and JWT secrets are read only from environment variables.
- In production, serve the site over HTTPS and use a strong unique `JWT_SECRET`. Restrict MongoDB network access and keep the admin password and environment file out of source control.

## Tests

```powershell
npm.cmd test
```

The automated tests cover booking slot allocation and request validation helpers. For an end-to-end booking test, MongoDB must be running and configured as above; use the browser flow in the booking workflow section and confirm the appointment from `/admin/`.

## Deployment

1. Provision a Node.js 18+ host and managed MongoDB (for example MongoDB Atlas).
2. Deploy the project files, run `npm ci --omit=dev` and configure `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, and `PORT` as host secrets/environment variables.
3. Configure HTTPS at the host or reverse proxy and serve the frontend and API from one browser origin. Set `CORS_ORIGIN` only if a separate trusted API client needs cross-origin access.
4. Run `npm run create-admin` as a one-time deployment task using protected admin credentials; do not make those credentials public.
5. Start with `npm start`, expose `/api/health` to monitoring, and configure backups, MongoDB access controls and server logs.

Images use externally hosted Unsplash URLs in the starter content. Replace or retain them according to your preferred image licensing and hosting arrangements.
