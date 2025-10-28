# Internship Report (Twiller Project)

## Introduction
This project is a Twitter-like web application built as part of the NullClass internship assignments. It demonstrates frontend and backend integration and implements several required features.

## Background
Built using React for frontend and Node/Express + MongoDB for backend. Email uses Mailtrap for testing.

## Learning Objectives
- Implement time-based rules and limits
- Integrate audio recording and OTP verification
- Implement payment integration with time restrictions
- Create custom gesture-based video player

## Activities and Tasks
- Implemented backend API and models
- Implemented React components for posting, audio, payments, and settings
- Implemented Mailer and Stripe checkout integration (test mode)
- Wrote README and documentation

## Challenges and Solutions
- Timezone-based checks: used `moment-timezone` to ensure IST checks
- Audio duration verification: noted ffmpeg requirement for server-side checks
- Payment webhooks: implemented placeholder webhook; production requires signature verification

## Outcome and Impact
A working, demo-ready codebase that meets the internship requirements and is ready for testing and deployment.

## Conclusion
Project meets assignment requirements. Further production hardening recommended.

## Skills and Competencies Gained
- Full-stack development with React and Node.js
- Timezone-aware server logic and rate limiting
- Media handling (recording, uploads) and server-side validation
- Payment integration with Stripe and webhook processing
- Accessibility and mobile-first gesture interactions for video playback

## Feedback and Evidence
- All important features (audio OTP, notifications, posting rules, subscriptions) are implemented and wired between frontend and backend.
- Mail and payment flows are test-ready (Mailtrap and Stripe test keys configured in `.env` for demo).

## Challenges and Solutions
- Implementing server-side audio validation required adding `fluent-ffmpeg` and documenting ffmpeg runtime requirements.
- Webhook security: added optional signature verification using `STRIPE_WEBHOOK_SECRET` and guidance for stripe-cli testing.

## How to test (quick)
1. Start backend: `cd backend; npm install; npm run dev` (ensure env vars are set)
2. Start frontend: `cd frontend; npm install; npm start`
3. Register/login, toggle notifications on profile, post tweets with keywords to see browser notifications.
4. Use AudioRecorder: send OTP, verify from Mailtrap, record/upload within 2PM-7PM IST and <=5 minutes.
5. Use Subscription page to create a Stripe checkout session (payments allowed 10-11 AM IST); use Stripe CLI to forward webhooks for local testing.

## Next steps (recommended)
- Replace local uploads with S3 or cloud storage for production.
- Harden Stripe webhook signing verification and error handling.
- Add more unit/integration tests around posting/rate-limits and audio validation.

