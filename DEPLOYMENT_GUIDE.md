# OpenClaw Web Portal - Deployment Guide

Complete step-by-step guide to deploy the OpenClaw control panel on Railway with Tailscale.

## 📋 What You'll Get

- Secure web dashboard accessible from anywhere
- Monitor SwarmTrade portfolio, jobs, sessions in real-time
- Control agents and send messages through one interface
- All traffic encrypted via Tailscale VPN
- Only your Google account can login
- Full audit logging of all access

## 🎯 Deployment Checklist

- [ ] Prepare Mac mini (Tailscale, OpenClaw API ready)
- [ ] Get Google OAuth credentials
- [ ] Push code to GitHub
- [ ] Set up Railway project
- [ ] Configure environment variables
- [ ] Deploy and test

## 📍 Step 1: Prepare Your Mac mini

### 1.1 Ensure OpenClaw is running

```bash
# Check if OpenClaw is running
lsof -i :3000

# If not running, start it from your OpenClaw installation
# Typically something like:
# cd ~/openclaw && npm start
```

### 1.2 Ensure Tailscale is installed and active

```bash
# Install Tailscale (if not already installed)
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate with Tailscale
sudo tailscale up

# Get your Tailscale IP (you'll need this later)
tailscale ip
# Output will be something like: 100.110.203.45
```

### 1.3 Test OpenClaw API locally

```bash
# Test the API gateway locally
curl http://localhost:3000/api/health

# You should see: {"status":"ok",...}
```

## 🔐 Step 2: Create Google OAuth Credentials

### 2.1 Go to Google Cloud Console

1. Visit [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select existing):
   - Project name: "OpenClaw Portal"
   - Create

### 2.2 Set up OAuth consent screen

1. Left sidebar → "OAuth consent screen"
2. Select "External"
3. Fill in:
   - App name: "OpenClaw Control Panel"
   - User support email: your-email@example.com
   - Save and continue
4. Skip scopes (we're using ID tokens)
5. Add yourself as a test user:
   - Add Users → your-email@example.com
   - Save

### 2.3 Create OAuth 2.0 Client ID

1. Left sidebar → "Credentials"
2. "Create Credentials" → "OAuth 2.0 Client ID"
3. Application type: "Web application"
4. Name: "OpenClaw Portal Railway"
5. Authorized JavaScript origins: (leave empty)
6. Authorized redirect URIs: Add placeholder for now:
   - `https://openclaw-web-portal-YOURNAME.railway.app/auth/callback`
   - Replace `YOURNAME` with something unique
   - Or just use `https://openclaw.railway.app/auth/callback` if available
7. Create

### 2.4 Copy credentials

Click the client ID, you'll see:
- Client ID: `xxx.apps.googleusercontent.com`
- Client Secret: `xxx`

**Save these somewhere safe!** You'll need them soon.

## 📦 Step 3: Push Code to GitHub

### 3.1 Create a new GitHub repo

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `openclaw-web-portal`
3. Description: "Web control panel for OpenClaw"
4. Public (so Railway can access it)
5. Create repository

### 3.2 Push the code

In the openclaw-web-portal directory on your local machine:

```bash
# Add GitHub remote (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/openclaw-web-portal.git

# Push to main branch
git branch -M main
git push -u origin main
```

Verify on GitHub that all files are there.

## 🚀 Step 4: Set Up Railway Project

### 4.1 Create Railway account and project

1. Go to [railway.app](https://railway.app)
2. Sign up (GitHub login recommended)
3. Create new project → "Deploy from GitHub"
4. Authorize GitHub access
5. Select your `openclaw-web-portal` repo
6. Railway will auto-detect Node.js

### 4.2 View your deployment domain

In Railway dashboard:
- Your project → Settings → Domains
- You'll see a domain like: `openclaw-web-portal-prod.railway.app`

Update your Google OAuth redirect URI:
- Go back to Google Cloud Console → Credentials
- Edit your OAuth client
- Update Authorized redirect URIs to:
  `https://YOUR-RAILWAY-DOMAIN/auth/callback`

## ⚙️ Step 5: Configure Environment Variables

### 5.1 In Railway Dashboard

1. Your project → "Variables"
2. Add each variable (copy-paste from below):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=generate-a-random-secret
TAILSCALE_IP=100.x.x.x
TAILSCALE_PORT=3000
ALLOWED_EMAIL=your-email@example.com
NODE_ENV=production
PORT=3000
API_BASE_URL=https://YOUR-RAILWAY-DOMAIN
FRONTEND_ORIGIN=https://YOUR-RAILWAY-DOMAIN
```

### 5.2 Generate JWT_SECRET

On your Mac:
```bash
openssl rand -base64 32
```

Copy the output into `JWT_SECRET` variable.

### 5.3 Replace placeholders

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `TAILSCALE_IP` — from `tailscale ip` on Mac mini
- `ALLOWED_EMAIL` — your Google email
- `YOUR-RAILWAY-DOMAIN` — your actual Railway domain

## 🔌 Optional: Enable Tailscale in Railway Container

If you want Railway to connect via Tailscale (recommended for extra security):

### Option A: Use Tailscale Auth Key (Recommended)

1. Get a Tailscale auth key:
   - Go to [tailscale.com/admin/auth-keys](https://tailscale.com/admin/auth-keys)
   - Create new auth key
   - Reusable: Yes
   - Copy the key

2. Add to Railway variables:
   ```
   TAILSCALE_AUTH_KEY=tskey-xxxxxxxxxxxxxxxxxxxx
   ```

3. Railway container will auto-join Tailscale on startup

### Option B: Manual setup (for now)

If the above doesn't work, just ensure:
- Mac mini Tailscale IP is correct
- Railway can reach that IP on port 3000
- You may need to adjust firewall rules

## 🚢 Step 6: Deploy

### 6.1 Trigger deployment

Either:
- Railway auto-deploys on git push
- Or manually trigger in Railway dashboard → Deploy

### 6.2 Watch the logs

In Railway dashboard:
- Your project → Logs
- You should see build starting
- Client builds: `npm run build` in client/
- Server starts: `npm start`

Look for:
```
🚀 OpenClaw Web Portal running on port 3000
📡 Backend (Tailscale): http://100.x.x.x:3000
```

### 6.3 Wait for "Deploying" to turn green

This usually takes 2-5 minutes.

## ✅ Step 7: Test Your Deployment

### 7.1 Visit your portal

Open in browser:
```
https://YOUR-RAILWAY-DOMAIN
```

You should see the OpenClaw login page.

### 7.2 Sign in

Click "Sign in with Google" and use your allowed email account.

### 7.3 Test the dashboard

Navigate through tabs:
- **Portfolio** — Should show balance (or "No data")
- **Jobs** — Should list your cron jobs
- **Sessions** — Should show recent session history
- **Memory** — Should show your MEMORY.md
- **Messages** — Send a test message
- **Agents** — View running agents
- **Settings** — See system status and logout

### 7.4 Check network connectivity

If Portfolio and other pages show errors:
1. Check Railway logs for connection errors
2. Verify Mac mini Tailscale IP: `tailscale ip`
3. Verify OpenClaw is running: `lsof -i :3000`
4. Test connection manually:
   ```bash
   curl http://100.x.x.x:3000/api/health
   ```

## 🔒 Security Verification

### Ensure proper authentication

```bash
# Try accessing API without token (should fail)
curl https://YOUR-RAILWAY-DOMAIN/api/portfolio
# Should return: "Missing or invalid token"

# Try with token (should work)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://YOUR-RAILWAY-DOMAIN/api/portfolio
```

### Check audit logs

In Settings tab → System Status shows audit logs are being recorded.

## 📊 Monitoring

### View logs

Railway dashboard → Logs shows:
- All API requests
- Authentication attempts
- Error messages

### Monitor performance

Railway dashboard → Metrics shows:
- CPU usage
- Memory usage
- Request latency
- Error rate

## 🔄 Updates & Maintenance

### Update code

```bash
# Make changes locally
# Commit and push
git add .
git commit -m "Update dashboard feature X"
git push

# Railway auto-deploys (watch logs)
```

### Rotate JWT secret

If JWT_SECRET is compromised:
1. Generate new secret: `openssl rand -base64 32`
2. Update in Railway variables
3. Redeploy (existing tokens will be invalid)

### Backup settings

Keep a copy of:
- `.env.example` (public, safe)
- Google OAuth credentials (private, secure)
- Tailscale IP (changes rarely, but save)

## 🆘 Troubleshooting

### "Cannot reach backend" error

**Symptom:** Portfolio page shows error, "Failed to fetch portfolio"

**Solutions:**
1. Check Mac mini Tailscale: `tailscale ip`
2. Check OpenClaw running: `lsof -i :3000`
3. Check Railway logs for connection errors
4. Try from Mac mini: `curl http://localhost:3000/api/portfolio`

### "Unauthorized" on login

**Symptom:** Gets to callback, then shows "You are not authorized"

**Solutions:**
1. Check `ALLOWED_EMAIL` matches your Google account
2. Verify you're using that Google account (check emails)
3. Log out of other Google accounts in browser

### "Invalid client ID" OAuth error

**Symptom:** Google OAuth fails with cryptic error

**Solutions:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Railway
2. Check they match Google Cloud Console
3. Verify redirect URI in Google Console matches Railway domain

### Railway deployment fails

**Symptom:** Build succeeds but deployment fails

**Solutions:**
1. Check Railway logs for specific error
2. Verify `package.json` has correct build script: `npm run build`
3. Try manual rebuild: Railway → Deploy → Rebuild

## 📞 Support & Next Steps

### If something isn't working:

1. **Check logs first:**
   - Railway logs (dashboard)
   - Browser console (F12 → Console)
   - Mac mini OpenClaw logs

2. **Verify basics:**
   - Tailscale is running on Mac mini
   - OpenClaw is running on Mac mini
   - Environment variables are set correctly
   - Google OAuth is configured

3. **Test manually:**
   ```bash
   # From your Mac, test connection
   curl -H "Authorization: Bearer TOKEN" \
     http://100.x.x.x:3000/api/portfolio
   ```

### Future enhancements:

- [ ] Add refresh token logic (currently 1-hour expiry)
- [ ] Store audit logs in Supabase
- [ ] Email alerts for failed jobs
- [ ] Real-time WebSocket updates
- [ ] Mobile app version
- [ ] Advanced permission system for multiple users

## 🎉 You're Done!

Your OpenClaw control panel is live and secure. You can now:
- Monitor your trading system from anywhere
- Manage jobs remotely
- Send messages through one interface
- Access memories and notes
- Control sub-agents

Enjoy your web portal! 🚀

---

**Questions?** Check README.md for API documentation or Railway's docs for platform features.
