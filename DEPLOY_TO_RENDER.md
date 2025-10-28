Twiller — Deploy to Render (recommended)

This document explains a minimal, repeatable way to deploy the Twiller project to Render as a single Web Service where the backend serves the frontend build.

Overview
- We build the React frontend, copy its static build into `backend/frontend_build`, and deploy the `backend` service. The backend serves API routes at `/api/*`, static uploads at `/uploads/*`, and the frontend at `/`.
- This keeps a single deployable artifact and keeps configuration simple for Stripe webhooks and Google OAuth.

Prerequisites
- GitHub repo with this project pushed to a branch (recommended: `main`).
- Render account (https://render.com).
- MongoDB Atlas (or other managed Mongo) connection string.
- SMTP provider credentials (SendGrid, Mailgun, etc.) if you want email sending.
- Stripe account (for subscriptions); Google Cloud Console credentials for Google OAuth if you use login.

Key files updated by this repo to support this flow
- `backend/server.js` — reads `FRONTEND_URL` for OAuth redirect and serves a `backend/frontend_build` folder if present.
- `.github/workflows/ci.yml` — optional CI that builds frontend and copies `frontend/build` into `backend/frontend_build`.

Render service setup (single Web Service)
1. Create a new Web Service in Render and connect your GitHub repository.
2. Settings:
   - Service type: Web Service
   - Environment: Node
   - Region: pick nearest
   - Branch: `main` (or your branch)
   - Root Directory: `backend` (recommended) or repository root and use `cd backend` in commands (see below)

3. Build Command (if root is `backend`):

```bash
# Render will run this from the backend directory
bash -lc "npm --prefix ../frontend ci && npm --prefix ../frontend run build && rm -rf frontend_build || true && mkdir -p frontend_build && cp -r ../frontend/build/* frontend_build/ && npm ci"
```

If you configured the pipeline/CI to copy the build to `backend/frontend_build`, you can use the simpler start command and no build step here.

Start Command:

```bash
npm start
```

(or if you set Root Directory to repo root: `cd backend && npm start`)

Environment variables (minimum)
- NODE_ENV=production
- PORT (optional; Render sets it automatically)
- MONGO_URI (mongodb+srv://...)
- JWT_SECRET (long random string)
- SESSION_SECRET (long random string)
- FRONTEND_URL (https://your-render-url or your custom domain)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET (set after creating Stripe webhook)
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- (Optional for uploads) AWS_ACCESS_KEY_ID
- (Optional for uploads) AWS_SECRET_ACCESS_KEY
- (Optional for uploads) S3_BUCKET
- (Optional for uploads) AWS_REGION

Security note: never commit these env vars to the repo. Use Render's Environment tab to add them securely.

Google OAuth adjustments
- In Google Cloud Console -> OAuth 2.0 Client IDs -> Authorized redirect URIs, add:

```
https://<your-render-url>/auth/google/callback
```

- Set `FRONTEND_URL` in Render to `https://<your-frontend-domain>` (typically the same as your Render service URL if you host frontend through the backend).

Stripe webhook setup
1. After your Render service is live, create a webhook endpoint in Stripe Dashboard or use `stripe listen`/CLI to point to:

```
https://<your-render-url>/api/payments/webhook
```

2. Capture the webhook signing secret (starts with `whsec_...`) and add it to Render as `STRIPE_WEBHOOK_SECRET`.

Uploads (important)
- The current repo stores uploads in `backend/uploads` for development. Render's filesystem is ephemeral — files are not persisted across deploys or instance restarts.
- For production you should configure S3 (or equivalent) and update the code to use `multer-s3` (recommended). Environment variables to add for S3:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - S3_BUCKET
  - AWS_REGION

Optional: implement S3 uploads now
- If you'd like, I can implement S3 storage in `backend/middleware/uploadMiddleware.js` and in routes that accept media uploads (e.g., tweets, avatars). This requires adding `aws-sdk` and `multer-s3` to `backend/package.json`.

Local build & test commands (how to emulate the Render flow locally)
1. Build frontend and copy into backend

```powershell
# from repo root (Windows PowerShell)
cd frontend
npm install
npm run build
cd ..\backend
# copy the build into backend/frontend_build
rm -Recurse -Force frontend_build; New-Item -ItemType Directory frontend_build
Copy-Item -Path ..\frontend\build\* -Destination frontend_build -Recurse
npm install
npm run dev   # starts the backend with nodemon
```

2. Alternatively run frontend & backend locally in parallel (dev mode)

```powershell
# Terminal 1
cd backend
npm run dev
# Terminal 2
cd frontend
npm start
```

Testing after deploy
- Health: https://<your-render-url>/health
- Frontend served: https://<your-render-url>/
- API: https://<your-render-url>/api/tweets
- Google login: click "Sign in with Google" and ensure you get redirected back with a `token` query param
- Stripe: Create a Checkout session via UI and validate webhook handling in your Render logs
- Email: Trigger a forgotten-password flow and confirm SMTP delivered

CI / GitHub Actions
- This repo contains `.github/workflows/ci.yml` which builds the frontend and copies the build into `backend/frontend_build` so the backend can serve it.
- You can rely on Render's auto-deploy on push (Render will use the code deployed by the workflow/commit). Make sure the build copies are present before Render deploy.

Troubleshooting tips
- If Google login redirects to localhost after deploy, ensure `FRONTEND_URL` is set on the Render service and that Google Cloud OAuth redirect URLs include your Render host.
- If Stripe webhooks fail with signature errors, re-generate webhook secret with `stripe listen` or use the Dashboard and set `STRIPE_WEBHOOK_SECRET` in Render.
- If uploads disappear after redeploy, migrate to S3 and update upload middleware.

Need me to do the next step?
- I can implement S3 uploads now (add middleware and route changes) and update `backend/package.json` with the required dependencies. I can also add a short `DEPLOYMENT_CHECKLIST.md` with screenshots and Render settings ready to paste.

If you'd like I can also create a small `README_DEPLOY.md` in the repo root with exact Render dashboard screenshots and copyable values — say the word and I will add them.
