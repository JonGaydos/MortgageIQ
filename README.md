# PayoffIQ

> Self-hosted loan & household finance management for Unraid

PayoffIQ is a privacy-first, self-hosted application for tracking loans, credit cards, utility bills, insurance, and home maintenance — all from a single Docker container.

## Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name payoffiq \
  -p 3010:3010 \
  -v /path/to/appdata:/data \
  --restart unless-stopped \
  ghcr.io/jongaydos/payoffiq:latest
```

Access at `http://your-server:3010`

### Unraid

1. Install via Community Applications (search "PayoffIQ")
2. Or manually add the container:
   - **Repository:** `ghcr.io/jongaydos/payoffiq:latest`
   - **Port:** `3010`
   - **Volume:** `/mnt/user/appdata/payoffiq` -> `/data`

## Features

- **Multi-Loan Tracking** — Mortgage, ARM, HELOC, Auto, Personal
- **Credit Card Management** — Balance trends, APR ranking, payoff velocity
- **Debt Strategy Engine** — Snowball vs Avalanche with What-If scenarios
- **Utility Bill Tracking** — Usage metrics (kWh, gallons, therms), YoY comparisons
- **Insurance Tracking** — Auto, Home, Life with renewal alerts
- **AI Document Processing** — Extract data from PDFs using Claude, ChatGPT, Gemini, Copilot, or Ollama
- **Paperless-NGX Integration** — Auto-push documents with #PayoffIQ tag
- **Home Maintenance** — Track tasks, warranties, and appliance lifecycles
- **Global Calendar** — Bill due dates, maintenance tasks in one view
- **7 Themes** — Light, Dark, Slate, Green & Red, Midnight, Forest, Ocean
- **Multi-Currency** — USD, EUR, GBP, CAD, AUD, JPY, and more
- **Mobile Responsive** — Full functionality on phones and tablets

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, SQLite
- **Container:** nginx, supervisord, Docker
- **AI:** Anthropic Claude, OpenAI, Google Gemini, Microsoft Copilot, Ollama

## Password Reset

If you forget your password, access the reset endpoint from your server:

```
http://your-server:3010/api/auth/generate-reset-token
```

This generates a 15-minute reset link.

## Development

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## License

MIT

---

Built by [JonGaydos](https://github.com/JonGaydos)
