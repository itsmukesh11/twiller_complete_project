const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { inISTWindow } = require('../middleware/istTimeCheck');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

const plans = {
  free: { price: 0, posts: 1 },
  bronze: { price: 100, posts: 3, productId: 'prod_TEzdq9eSDckncx' },
  silver: { price: 300, posts: 5, productId: 'prod_TEzeBuNGoT5oPQ' },
  gold: { price: 1000, posts: 'unlimited', productId: 'prod_TEzf5IWE7eVHxS' }
};

router.post('/create-checkout-session', auth, async (req, res) => {
  // Only allow payment between 10-11 AM IST
  if (!inISTWindow(10, 11)) return res.status(403).json({ message: 'Payments allowed only 10-11 AM IST' });

  const { plan } = req.body;
  if (!plans[plan]) return res.status(400).json({ message: 'Invalid plan' });

  const priceInRupees = plans[plan].price;
  // Attach metadata so webhook can identify user and plan
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'inr',
        // If a Stripe productId is configured for the plan, reference it; otherwise fall back to inline product data
        ...(plans[plan].productId ? { product: plans[plan].productId } : { product_data: { name: `Twiller ${plan} plan` } }),
        unit_amount: priceInRupees * 100
      },
      quantity: 1
    }],
    metadata: {
      userId: req.user.id ? String(req.user.id) : '',
      plan
    },
    success_url: `${req.headers.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.origin}/payment-cancel`
  });

  res.json({ sessionId: session.id, url: session.url });
});

// webhook endpoint for stripe (in production protect with signature)
// Note: webhook should not require auth, as Stripe calls it
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // No webhook signing secret configured — accept the payload but log a warning
      event = req.body;
      console.warn('Stripe webhook received without signature verification');
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const userId = metadata.userId;
      const plan = metadata.plan;
      if (userId && plan && plans[plan]) {
        // mark user subscription
        const user = await User.findById(userId);
        if (user) {
          const now = new Date();
          const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          user.subscription = { plan, expiresAt };
          await user.save();
          await Subscription.create({ user: user._id, plan, amount: plans[plan].price, stripeSessionId: session.id });
          // send invoice by mail
          try {
            await sendMail(user.email, 'Subscription invoice', `<p>You purchased ${plan} plan for ₹${plans[plan].price}. Expires at ${expiresAt.toISOString()}</p>`);
          } catch (mailErr) {
            console.error('Failed to send subscription invoice:', mailErr && mailErr.message);
          }
        }
      } else {
        console.warn('Webhook session missing metadata.userId or plan');
      }
    }
  } catch (e) {
    console.error('Error handling webhook:', e);
  }

  res.json({ received: true });
});

// simplified purchase confirm endpoint (for demo - you can instead use webhook)
router.post('/confirm', auth, async (req, res) => {
  const { sessionId, userId, plan } = req.body;
  // enforce payment time window as well for the confirm endpoint
  if (!inISTWindow(10, 11)) return res.status(403).json({ message: 'Payments allowed only 10-11 AM IST' });
  // mark user subscription
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const now = new Date();
  const expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); // 1 month
  user.subscription = { plan, expiresAt };
  await user.save();
  await Subscription.create({ user: user._id, plan, amount: plans[plan].price, stripeSessionId: sessionId });

  // send invoice by mail
  try {
    await sendMail(user.email, 'Subscription invoice', `<p>You purchased ${plan} plan for ₹${plans[plan].price}. Expires at ${expiresAt.toISOString()}</p>`);
  } catch (mailErr) {
    console.error('Failed to send subscription invoice:', mailErr && mailErr.message);
  }

  res.json({ message: 'Subscription updated' });
});

module.exports = router;
