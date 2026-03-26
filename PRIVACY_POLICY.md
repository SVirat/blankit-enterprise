# Privacy Policy

**Blankit** · Last updated: March 23, 2026

---

## Overview

Blankit ("we", "our", "us") provides an API service for detecting and redacting personally identifiable information (PII) and protected health information (PHI) from text and documents. This privacy policy explains how we collect, use, and protect information when you use our website and API services.

## Information We Collect

### Account Information

When you sign in, we collect:

- **Name** — Your display name (from Google OAuth or the sign-up form)
- **Email address** — Used for account identification and communication
- **Profile picture** — From Google OAuth (if applicable)

We do not collect or store passwords for Google OAuth sign-ins. For email/password sign-ups, credentials are stored securely.

### API Usage Data

When you use the Blankit API, we collect:

- **Aggregate redaction counts** — Number of PII items detected per category (e.g., emails, phone numbers, SSNs)
- **Document format counts** — Number of documents processed per type (e.g., PDF, DOCX)
- **Daily usage history** — Aggregated counts for the last 7 days

### What We Do NOT Collect

- **Original text or documents** — We do not store, log, or retain any text or documents you submit for redaction
- **Detected PII values** — The actual PII found in your content is never stored on our servers
- **Redaction maps** — Maps used to reverse redactions are returned to you and not retained

## How We Use Information

We use collected information to:

- Authenticate your account and manage API access
- Display usage analytics on your dashboard
- Provide billing and invoice information
- Communicate service updates and support
- Improve our detection and redaction accuracy

## Data Retention

- **Account data** — Retained while your account is active. Deleted upon account deletion request.
- **Usage statistics** — Aggregated counts retained for 7 days of rolling history.
- **Submitted content** — Not retained. All text and documents are processed in memory and discarded immediately after the API response is returned.

## Data Security

We implement industry-standard security measures:

- All API communication is encrypted via TLS/HTTPS
- API keys are generated with cryptographically secure randomness
- Infrastructure hosted on Vercel with SOC 2 Type II compliance
- No PII from your content is ever written to disk or logs

## Third-Party Services

We use the following third-party services:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| Google OAuth | Authentication | Name, email, profile picture (from Google) |
| Vercel | Hosting & serverless functions | API request metadata |
| Web3Forms | Contact form submissions | Name, email, message content |

We do not sell, share, or transfer your data to any other third parties.

## Your Rights

You have the right to:

- **Access** your account data at any time via the dashboard
- **Delete** your account and all associated data
- **Export** your usage statistics
- **Opt out** of non-essential communications

To exercise these rights, contact us at support@Blankit.dev.

## Cookies

We use minimal cookies:

- **Session cookie** — To maintain your sign-in state (stored in localStorage, not a server cookie)
- **No tracking cookies** — We do not use advertising or analytics tracking cookies

## Children's Privacy

Blankit is a B2B service intended for businesses and developers. We do not knowingly collect information from children under 13.

## GDPR Compliance

For users in the European Economic Area (EEA):

- We process data based on legitimate interest (providing our service) and consent (account creation)
- You may request data portability, rectification, or erasure at any time
- Our data processing is limited to what is necessary to provide the service

## HIPAA Considerations

Blankit is designed to help organizations comply with HIPAA by redacting PHI. However:

- Blankit does not store PHI — all data is processed in-memory
- Organizations using Blankit for HIPAA compliance should conduct their own risk assessments
- A Business Associate Agreement (BAA) is available for Enterprise plan customers

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date. Continued use of the service after changes constitutes acceptance.

## Contact

For privacy-related questions or requests:

- **Email:** support@Blankit.dev
- **Website:** [Blankit.dev](https://Blankit.dev)
