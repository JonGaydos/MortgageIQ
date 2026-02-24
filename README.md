# 💰 PayoffIQ

A self-hosted loan tracker that runs as a **single Docker container**. Track payments, store documents, model payoff scenarios, and extract data from statement PDFs using AI — all on your own server.

Supports **Mortgage, ARM, HELOC, Auto, and Personal** loan types.

---

## Features

**Loans & Dashboard**
- Track multiple loans of any type simultaneously
- Balance progress bar, payoff projection, and payment charts per loan
- ARM loans: fixed period tracking, rate history log, and best/worst/current rate scenario modeling

**Payments**
- Log principal, interest, escrow, extra principal, and ending balance per payment
- Auto-calculate ending balance from previous payment
- Mismatch detection if payment fields don't sum to total

**Document Vault**
- Attach PDFs and images directly to payments or to a loan itself
- Drag-and-drop upload, clickable links, delete — no cloud storage involved

**AI Statement Extraction** *(optional)*
- Upload a PDF statement and have payment data filled in automatically
- Supports **Claude** (Anthropic), **ChatGPT** (OpenAI), **Gemini** (Google), and **Copilot** (Microsoft)
- API keys stored locally in your database — add only the providers you want

**Payoff Calculator**
- Extra monthly payment, lump sum, or both — side-by-side scenario comparison
- **Payoff-by-date**: enter a target date, see exactly how much extra you'd need to pay monthly
- Interest saved and time saved shown for every scenario
- Full amortization table for any scenario

**Escrow Tracker**
- Separate log for property tax and insurance disbursements
- Totals by type across all entries

**Security**
- Username + password login with bcrypt hashing and JWT sessions
- All routes protected server-side — suitable for use behind a Cloudflare tunnel

**All data stays local** — SQLite file on your own server, nothing leaves your machine

---

## Quick Start

```bash
docker run -d \
  --name payoffiq \
  --restart unless-stopped \
  -p 3010:3010 \
  -v /mnt/user/appdata/payoffiq:/data \
  ghcr.io/JonGaydos/payoffiq:latest
```

Open **http://localhost:3010** and create your account on first launch. No API keys required — add them later in Settings if you want PDF extraction.

---

## Unraid Installation

### Option A — Community Apps *(once published)*
Search **PayoffIQ** in Community Apps and click Install.

### Option B — Manual template
1. Docker tab → **Add Container**
2. Paste the contents of `payoffiq-unraid-template.xml` into the template field
3. Click **Apply**

---

## AI Provider Setup *(optional)*

API keys are configured inside the app under **Settings → AI Provider API Keys** — no environment variables needed. Add keys for whichever providers you want:

| Provider | Where to get a key |
|---|---|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com/api-keys) |
| ChatGPT (OpenAI) | [platform.openai.com](https://platform.openai.com/api-keys) |
| Gemini (Google) | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Copilot (Microsoft) | [github.com/settings/tokens](https://github.com/settings/tokens) |

Each PDF extraction costs fractions of a cent. $5 in credits will last years for personal use.

---

## Updating

```bash
docker pull ghcr.io/JonGaydos/payoffiq:latest
docker stop payoffiq && docker rm payoffiq
docker run -d --name payoffiq --restart unless-stopped \
  -p 3010:3010 \
  -v /mnt/user/appdata/payoffiq:/data \
  ghcr.io/JonGaydos/payoffiq:latest
```

Your data is never touched during updates. On Unraid, use the **Force Update** button on the container.

---

## Data & Backups

```
/mnt/user/appdata/payoffiq/
├── payoffiq.db     ← entire database (loans, payments, settings, users)
└── statements/     ← uploaded documents and PDFs
```

To back up: copy the entire `payoffiq` appdata folder. To restore: stop the container, replace the files, start again.

---

## Troubleshooting

**Port conflict** — Change the left side of `-p 3010:3010` to any free port.  
**Forgot password** — Stop the container, delete `payoffiq.db`, restart — you'll be prompted to create a new account. *(All loan data will be lost.)*  
**PDF extraction fails** — Verify your API key and account credits in the provider's dashboard.  
**View logs** — `docker logs payoffiq`
