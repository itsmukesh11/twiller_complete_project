Stripe CLI setup & local webhook forwarding (Windows PowerShell)

This guide helps you test Stripe webhooks locally and wire the `STRIPE_WEBHOOK_SECRET` into your backend `.env`.

1) Install Stripe CLI (Windows)
- Download and install from https://stripe.com/docs/stripe-cli#install
- Or use Scoop (if installed):
  scoop install stripe

Verify installation:
```powershell
stripe --version
```

2) Login to Stripe from the CLI
```powershell
stripe login
```
This opens a browser to authenticate with your Stripe account.

3) Start listening and forward events to your local webhook
```powershell
# Forward to your local backend webhook endpoint
stripe listen --forward-to localhost:5000/api/payments/webhook
```
The CLI will show a `Webhook signing secret (for local testing): whsec_...` value. Copy that value.

4) Save the webhook secret into your backend `.env`
- Option A (manual): open `backend/.env` and add the line:
  STRIPE_WEBHOOK_SECRET=whsec_...
- Option B (script): from repo root run:
```powershell
cd backend
node scripts/set_stripe_webhook_secret.js whsec_xxx
```

5) Trigger a test Checkout session
- Use the frontend Subscription page (Buy) during 10–11 AM IST to create a Checkout session.
- Complete Checkout with a test card (e.g., 4242 4242 4242 4242).
- Stripe CLI will forward `checkout.session.completed` to your local webhook, and the backend will process it (verify signature if `STRIPE_WEBHOOK_SECRET` is set) and mark the user's subscription.

6) Troubleshooting
- If webhook verification fails, ensure the secret matches the one printed by `stripe listen` and that you restarted the backend after changing `.env`.
- If your server isn't reachable, ensure no firewall blocks and you're running backend on port 5000.

7) Useful commands
```powershell
# Simulate a webhook POST (unsigned) - good for quick local tests
node scripts/send_test_webhook.js <userId> <plan>

# Simulate confirm without Stripe
node scripts/simulate_stripe_confirm.js
```

If you want, I can add the `node scripts/set_stripe_webhook_secret.js` helper now so you can paste the secret and run a single command to save it. Let me know and I'll add it.