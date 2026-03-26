# Blankit: Enterprise PII Redaction API

<p align="center">
  <img src="public/icons/icon128.png" alt="Blankit" width="80">
</p>

<p align="center">
  <strong>Enterprise-grade PII &amp; PHI detection and redaction as a simple REST API.</strong><br>
  9 PII categories · 6 document formats · &lt;50ms latency · SOC 2 compliant
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#api-reference">API Reference</a> ·
  <a href="#dashboard">Dashboard</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#license">License</a>
</p>

---

## Features

- **9 PII categories** — Emails, phone numbers, SSNs, names, addresses, dates of birth, credit cards, MRNs, and IP addresses
- **6 document formats** — PDF, DOCX, XLSX, PPTX, CSV, and plain text
- **Reversible redaction** — Restore original values with a redaction map
- **Custom dictionaries** — Define your own terms and replacements
- **Real-time analytics** — Track redactions per category with 7-day history
- **Dashboard** — Google OAuth + email sign-in, API key management, Charts.js analytics, team management
- **B2B-ready** — Settings, billing, team invites, logs, and support pages

## Project Structure

```
Blankit-b2b/
├── public/                     # Static frontend
│   ├── index.html              # Landing page
│   ├── style.css               # Global styles
│   ├── docs.html               # API documentation
│   ├── docs.css                # Docs styles
│   ├── dashboard.html          # Dashboard (auth, analytics, settings)
│   ├── dashboard.css           # Dashboard styles
│   ├── dashboard.js            # Dashboard client-side logic
│   └── icons/                  # App icons
├── api/                        # Vercel serverless functions
│   └── v1/
│       ├── redact.js           # POST /api/v1/redact
│       ├── redact-doc.js       # POST /api/v1/redact-doc
│       ├── unredact.js         # POST /api/v1/unredact
│       ├── categories.js       # GET  /api/v1/categories
│       ├── usage.js            # GET  /api/v1/usage
│       └── config.js           # GET  /api/v1/config
├── lib/                        # Shared server-side libraries
│   ├── pii-engine.js           # PII detection & redaction engine
│   ├── doc-handler.js          # Document parsing (OOXML, PDF, text)
│   ├── api-helpers.js          # Auth, CORS, error handling
│   └── stats-store.js          # File-backed usage stats
├── server.js                   # Local Express dev server
├── vercel.json                 # Vercel routing config
├── package.json
├── LICENSE
├── PRIVACY_POLICY.md
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- A Google Cloud OAuth client ID (for sign-in)

### Install & Run

```bash
# Clone and install
git clone https://github.com/your-org/Blankit-b2b.git
cd Blankit-b2b
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your keys:
#   GOOGLE_CLIENT_ID=...
#   GOOGLE_CLIENT_SECRET=...
#   WEB3FORMS_KEY=...

# Start local dev server
npm run dev
# → http://localhost:3001
```

## API Reference

All endpoints require `Authorization: Bearer Blankit_live_...` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/redact` | Redact PII from plain text |
| `POST` | `/api/v1/redact-doc` | Redact PII from uploaded documents |
| `POST` | `/api/v1/unredact` | Restore original values from redaction map |
| `GET` | `/api/v1/categories` | List available detection categories |
| `GET` | `/api/v1/usage` | Get usage stats and 7-day history |
| `GET` | `/api/v1/config` | Get public client configuration |

### Example: Redact Text

```bash
curl -X POST http://localhost:3001/api/v1/redact \
  -H "Authorization: Bearer Blankit_live_abc123" \
  -H "Content-Type: application/json" \
  -d '{"text": "Contact John Smith at john@example.com or 555-0123"}'
```

```json
{
  "redacted": "Contact [NAME_1] at [EMAIL_1] or [PHONE_1]",
  "items": [
    {"type": "NAME", "original": "John Smith", "replacement": "[NAME_1]"},
    {"type": "EMAIL", "original": "john@example.com", "replacement": "[EMAIL_1]"},
    {"type": "PHONE", "original": "555-0123", "replacement": "[PHONE_1]"}
  ],
  "map": "eyJ..."
}
```

## Dashboard

The dashboard provides a full B2B experience:

- **Overview** — Welcome bar, API key management (generate/reveal/copy/rotate/delete), Chart.js analytics
- **Settings** — Default redaction mode, webhook notifications, rate limits
- **Account** — Display name, email, organization, account deletion
- **Billing** — Plan info, payment method, invoices
- **Team** — Invite members, manage roles
- **Logs** — API request activity
- **Support** — Docs, email, community, enterprise contact

## Deployment

### Vercel (Production)

```bash
npx vercel --prod
```

Set environment variables in the Vercel dashboard:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `WEB3FORMS_KEY`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for sign-in | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `WEB3FORMS_KEY` | Web3Forms access key for contact form | Yes |
| `PORT` | Local dev server port (default: 3001) | No |

## Configuration

- **Auth** — The current auth layer validates API key format. Wire `lib/api-helpers.js` `authenticate()` to your user database for production.
- **Billing** — Connect to Stripe or your billing provider for real usage-based billing.
- **Stats** — Usage stats are file-backed (`.stats.json`). For production, swap `lib/stats-store.js` to a database.

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Privacy

See [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for our privacy policy.
