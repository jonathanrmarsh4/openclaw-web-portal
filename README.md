# OpenClaw Web Portal

A secure, web-facing control panel for monitoring and controlling your local OpenClaw instance from anywhere.

**Architecture:**
- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Express API gateway with Google OAuth + JWT
- **Tunnel:** Tailscale (zero-trust VPN)
- **Hosting:** Railway (for the web portal)
- **Local:** Mac mini with OpenClaw + Tailscale

## 🚀 Features

1. **Portfolio Status** — SwarmTrade positions, balance, P&L (30-sec refresh)
2. **Job Queue** — Manage cron jobs, trigger runs, view history
3. **Session History** — Monitor sub-agent runs and execution logs
4. **Memory/Notes** — Edit MEMORY.md from the dashboard
5. **Messages** — Send WhatsApp, Telegram, or Discord messages
6. **Agent Control** — Spawn, view, and kill sub-agents
7. **Settings** — User info, API tokens, system status, logout

## 🔐 Security

- **Google OAuth** — Only authorized account can login
- **JWT Tokens** — 1-hour expiry with refresh logic
- **Rate Limiting** — 50 requests per minute per user
- **Audit Logging** — All requests logged
- **Tailscale VPN** — Zero-trust encrypted tunnel
- **CORS** — Locked to your Railway domain
- **No secrets in code** — All env vars in `.env`

## 📋 Prerequisites

Before you start, you need:

1. **Mac mini running OpenClaw** with Tailscale enabled
   - Get Tailscale IP: `tailscale ip`
   - Get OpenClaw port: typically `3000`

2. **Railway account** (free tier available)
   - Sign up at [railway.app](https://railway.app)

3. **Google OAuth credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new OAuth 2.0 Client ID (Web application)
   - Authorized redirect URIs: `https://openclaw-web-portal.railway.app/auth/callback`

4. **Git & Node.js**
   - Node.js 18+ with npm

## 🛠️ Local Setup

### 1. Clone & Install Dependencies

```bash
# Clone the repo
git clone https://github.com/yourusername/openclaw-web-portal.git
cd openclaw-web-portal

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 2. Create `.env` file

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:
```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=generate-a-long-random-string
TAILSCALE_IP=100.x.x.x          # Get from: tailscale ip on Mac mini
TAILSCALE_PORT=3000
ALLOWED_EMAIL=your-email@example.com
API_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Run Locally

**Terminal 1: Start Express server**
```bash
npm run dev:server
```

**Terminal 2: Start React dev server**
```bash
npm run dev:client
```

Open [http://localhost:5173](http://localhost:5173) and sign in.

## 🚢 Deploy to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: OpenClaw web portal"
git remote add origin https://github.com/yourusername/openclaw-web-portal.git
git push -u origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "Create Project" → "Deploy from GitHub"
3. Select your `openclaw-web-portal` repo
4. Railway will auto-detect Node.js

### 3. Set Environment Variables

In Railway dashboard:
1. Go to Variables
2. Add all variables from `.env.example`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-secret-key
TAILSCALE_IP=100.x.x.x
TAILSCALE_PORT=3000
ALLOWED_EMAIL=your-email@example.com
NODE_ENV=production
PORT=3000
API_BASE_URL=https://openclaw-web-portal.railway.app
FRONTEND_ORIGIN=https://openclaw-web-portal.railway.app
```

### 4. Configure Build & Start Commands

In Railway project settings:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

### 5. Enable Tailscale in Container

Create `tailscale-init.sh`:
```bash
#!/bin/bash
# Join Tailscale network on startup
if [ ! -f /var/lib/tailscale/tailscaled.state ]; then
  tailscaled --state=/var/lib/tailscale/tailscaled.state &
  sleep 2
  tailscale up --authkey=${TAILSCALE_AUTH_KEY}
fi
```

Add to `gateway.js` before app.listen():
```javascript
import { exec } from 'child_process';
if (process.env.NODE_ENV === 'production') {
  exec('bash tailscale-init.sh', (err) => {
    if (err) console.error('Tailscale init error:', err);
  });
}
```

**Alternative:** Use Railway's native Dockerfile support with a custom image that includes Tailscale.

### 6. Deploy

Push changes:
```bash
git add .
git commit -m "Configure for Railway deployment"
git push
```

Railway will auto-deploy. Watch the logs in the dashboard.

## 🔗 First Login

1. Get your Railway deployment URL (usually `https://openclaw-web-portal.railway.app`)
2. Visit the URL in your browser
3. Click "Sign in with Google"
4. Use the Google account matching `ALLOWED_EMAIL`
5. You should see the OpenClaw dashboard

## 🧪 Testing the Connection

### Check Tailscale on Mac mini
```bash
tailscale ip
# Output: 100.x.x.x
```

### Test OpenClaw API from Railway
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://100.x.x.x:3000/api/portfolio
```

### Check Railway logs
```bash
# In Railway dashboard, select your project and view Build/Deploy logs
```

## 📁 Project Structure

```
openclaw-web-portal/
├── gateway.js                 # Express API gateway
├── package.json
├── .env.example
├── client/
│   ├── src/
│   │   ├── main.tsx          # React entry point
│   │   ├── App.tsx           # Root component
│   │   ├── index.css         # Tailwind styles
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── JobQueue.tsx
│   │   │   ├── Sessions.tsx
│   │   │   ├── Memory.tsx
│   │   │   ├── Messages.tsx
│   │   │   ├── Agents.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   └── lib/
│   │       ├── api.ts        # API client
│   │       └── auth.ts       # Auth store (Zustand)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── package.json
├── README.md
└── tailscale-init.sh
```

## 🔧 API Endpoints

All endpoints require `Authorization: Bearer <JWT_TOKEN>` header.

### Auth
- `POST /auth/login` — Start OAuth flow
- `GET /auth/callback` — OAuth callback (handles redirect)
- `GET /auth/me` — Get current user
- `POST /auth/logout` — Logout

### Portfolio
- `GET /api/portfolio` — Get balance, P&L, positions

### Jobs
- `GET /api/jobs` — List all cron jobs
- `POST /api/jobs/:id/run` — Run a job
- `GET /api/jobs/:id/history` — Get job run history

### Sessions
- `GET /api/sessions` — List recent sessions & sub-agent runs

### Memory
- `GET /api/memory` — Read MEMORY.md
- `POST /api/memory` — Save MEMORY.md

### Messages
- `POST /api/messages/send` — Send message (WhatsApp/Telegram/Discord)

### Agents
- `GET /api/agents` — List running agents
- `POST /api/agents/spawn` — Spawn new sub-agent
- `POST /api/agents/:id/kill` — Kill agent

### System
- `GET /api/audit-log` — View audit log
- `GET /api/health` — Server health check

## 🛡️ Security Checklist

- [ ] `JWT_SECRET` is a long random string (use `openssl rand -hex 32`)
- [ ] `ALLOWED_EMAIL` is set to your Google account
- [ ] Google OAuth redirect URI matches your Railway domain
- [ ] `FRONTEND_ORIGIN` is set to your Railway domain (CORS)
- [ ] `.env` file is in `.gitignore` (never commit secrets)
- [ ] Environment variables are set in Railway dashboard (not in code)
- [ ] Tailscale is running on Mac mini
- [ ] Firewall allows Tailscale traffic

## 🚀 Next Steps

1. **Test the dashboard** — Navigate all tabs, check data flows
2. **Add Supabase** — Replace in-memory audit log with Supabase table
3. **Set up cron monitoring** — Integrate with your existing cron jobs
4. **Add notifications** — Email alerts for failed jobs or system issues
5. **Custom branding** — Update colors, logo, favicon

## 🐛 Troubleshooting

### "Cannot reach backend"
- Check Tailscale IP is correct: `tailscale ip` on Mac mini
- Ensure OpenClaw is running on Mac mini: `lsof -i :3000`
- Check Railway logs for proxy errors

### "OAuth login fails"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Check redirect URI in Google Console matches Railway domain
- Clear browser cookies/cache

### "Token expired"
- JWT expires after 1 hour — app auto-logs out
- User must login again
- (Future: implement refresh token logic)

### "Rate limited"
- App limits to 50 requests/min per user
- Wait 1 minute or create new session

## 📞 Support

For issues:
1. Check Railway logs: Dashboard → Your Project → Logs
2. Check browser console: F12 → Console tab
3. Check `.env` variables are set correctly
4. Ensure Tailscale connection is active

## 📄 License

MIT — See LICENSE file

---

Built with ❤️ for OpenClaw
