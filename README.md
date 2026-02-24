# 🏠 MortgageIQ

A self-hosted mortgage loan tracker that runs as a **single Docker container**. Track payments, monitor your balance, analyze escrow, and calculate payoff scenarios with three comparison modes. Optional Claude AI integration auto-reads your monthly mortgage statement PDFs.

---

## Features

- **Dashboard** — Balance progress, payoff projection, payment charts
- **Payment History** — Log principal, interest, escrow, extra principal per payment
- **PDF Auto-Processing** — Upload a statement PDF, Claude AI fills the form *(requires API key)*
- **Payoff Calculator** — Three side-by-side scenarios:
  - Extra monthly payment only
  - One-time lump sum applied to principal now
  - Both combined
- **Amortization Schedule** — View month-by-month breakdown for any scenario
- **Escrow Tracker** — Separate tracking for property tax and insurance disbursements
- **Multiple Loans** — Track as many mortgages as you want
- **All data stays local** — SQLite file on your own server

---

## Quick Start (Any Docker Host)

```bash
docker run -d \
  --name mortgageiq \
  --restart unless-stopped \
  -p 3010:3010 \
  -v /mnt/user/appdata/mortgageiq:/data \
  -e ANTHROPIC_API_KEY=your_key_here \
  ghcr.io/JonGaydos/mortgageiq:latest
```

Open **http://localhost:3010**. Omit `ANTHROPIC_API_KEY` if you don't need PDF processing.

---

## Unraid Installation

### Option A — Community Apps *(once published)*
Search **MortgageIQ** in Community Apps and click Install.

### Option B — Manual template
1. Docker tab → **Add Container**
2. Paste the contents of `mortgageiq-unraid-template.xml` into the template field
3. Update `yourusername` to your GitHub username
4. Fill in your Anthropic API key if desired
5. Click **Apply**

---

## Getting an Anthropic API Key *(optional)*

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. **API Keys** → **Create Key**
3. **Billing** → add $5 in credits (lasts years at fractions of a cent per PDF)
4. Paste the key into `ANTHROPIC_API_KEY`

---

## Publishing Updates (GitHub + GHCR)

Every push to `main` automatically builds and publishes a new Docker image via GitHub Actions. No manual `docker build` or `docker push` needed.

### First-time setup

```bash
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com first, then:
git remote add origin https://github.com/JonGaydos/mortgageiq.git
git branch -M main
git push -u origin main
```

Watch the build under the **Actions** tab on your repo. Image publishes to `ghcr.io/JonGaydos/mortgageiq:latest`.

### Making changes going forward

```bash
git add .
git commit -m "Describe your change"
git push origin master
```

The image rebuilds and republishes automatically.

> **⚠️ After any fresh `git init`:** The workflow file resets to trigger on `main` instead of `master`, so the Actions build won't appear. Fix it with:
> ```bash
> python3 -c "f=open('.github/workflows/docker-publish.yml','r+');c=f.read().replace('      - main','      - master');f.seek(0);f.write(c);f.truncate();print('Fixed')"
> git add . && git commit -m "Fix workflow branch" && git push origin master --force
> ```

### Pulling the update on Unraid

```bash
docker pull ghcr.io/JonGaydos/mortgageiq:latest
docker stop mortgageiq && docker rm mortgageiq
docker run -d --name mortgageiq --restart unless-stopped \
  -p 3010:3010 \
  -v /mnt/user/appdata/mortgageiq:/data \
  -e ANTHROPIC_API_KEY=your_key_here \
  ghcr.io/JonGaydos/mortgageiq:latest
```

Your data is never touched during updates.

---

## Data & Backups

```
/mnt/user/appdata/mortgageiq/
├── mortgage.db    ← entire database
└── uploads/       ← temp PDFs, auto-deleted after processing
```

To back up: copy `mortgage.db`. To restore: stop container, replace file, start again.

---

## Removing MortgageIQ

```bash
docker stop mortgageiq && docker rm mortgageiq
docker rmi ghcr.io/JonGaydos/mortgageiq:latest
rm -rf /mnt/user/appdata/mortgageiq
```

---

## Troubleshooting

**Port conflict** — Change `3010` to any free port.  
**PDF fails** — Check API key and credits at console.anthropic.com/billing.  
**View logs** — `docker logs mortgageiq`  
**Build failing** — Check the Actions tab on GitHub for the error.
