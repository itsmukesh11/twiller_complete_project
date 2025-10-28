Stripe local testing guide (PowerShell)

1) Prerequisites
- Ensure backend is running locally (default: http://localhost:5000)
- Make sure you set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `backend/.env` (you said you already did)
- If you want real Stripe Checkout flows, set `REACT_APP_API_URL` in frontend `.env.local` to `http://localhost:5000/api` and run frontend

2) Quick simulate confirm (bypass webhook)
- This script registers a test user, logs in, and calls `/payments/confirm` to mark subscription (works even without Stripe)

From project root (PowerShell):

```powershell
cd backend
node scripts/simulate_stripe_confirm.js
```

This prints status and will send an invoice email via your configured SMTP (Mailtrap recommended).

3) Send a fake webhook event to your backend
- If you want to test the webhook handler (`/api/payments/webhook`) directly (recommended for testing webhook logic):

```powershell
cd backend
node scripts/send_test_webhook.js <userId> <plan>
# example:
node scripts/send_test_webhook.js 64f2c1a0ad3e3b1a1c2d3e4f bronze
```

Notes:
- If `STRIPE_WEBHOOK_SECRET` is set in `.env` the webhook handler will attempt to verify signatures and the test script above won't be able to generate a valid signature. For quick tests, unset `STRIPE_WEBHOOK_SECRET` or leave it blank.
- For production or end-to-end tests with Stripe CLI, use the Stripe CLI to forward webhook events to your local server and Stripe will sign them correctly. Example (requires stripe CLI installed):

```powershell
stripe login
stripe listen --forward-to localhost:5000/api/payments/webhook
```

- Then create a test Checkout session from your frontend or via API and complete it (use Stripe test cards). The Stripe CLI will forward the event to your local webhook endpoint and the webhook signature will be verified if `STRIPE_WEBHOOK_SECRET` is configured.

4) After webhook processing
- The webhook will set the user's `subscription` field and create a `Subscription` record in the database.
- An invoice email will be attempted using the project's mailer (Mailtrap recommended).

If you want, I can:
- Run `node scripts/simulate_stripe_confirm.js` now and show the output (needs backend running).
- Walk you through using the Stripe CLI to test real signed webhook events (I can provide the exact commands for PowerShell).