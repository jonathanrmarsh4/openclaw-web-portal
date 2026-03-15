# Quick Start - Local Development

Get OpenClaw Web Portal running locally for testing.

## Prerequisites

- Node.js 18+ with npm
- OpenClaw running locally (or accessible via Tailscale IP)
- Google OAuth credentials (or test with mock mode)

## 1. Clone & Install

```bash
git clone https://github.com/YOUR-USERNAME/openclaw-web-portal.git
cd openclaw-web-portal

# Install dependencies
npm install
cd client && npm install && cd ..
```

## 2. Create `.env.local`

Copy from `.env.example`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# For local testing
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=dev-secret-key-change-in-production

# Point to your local or remote OpenClaw instance
TAILSCALE_IP=localhost        # or 100.x.x.x for remote
TAILSCALE_PORT=3000

ALLOWED_EMAIL=your-email@gmail.com

# Local development
API_BASE_URL=http://localhost:3000
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## 3. Start Development Servers

**Terminal 1: Express API Gateway**
```bash
npm run dev:server
```

You should see:
```
🚀 OpenClaw Web Portal running on port 3000
```

**Terminal 2: React Frontend (in new terminal)**
```bash
npm run dev:client
```

You should see:
```
  Local:   http://localhost:5173/
```

## 4. Open in Browser

Visit: [http://localhost:5173](http://localhost:5173)

You should see the OpenClaw login page.

## 5. Test Login

Click "Sign in with Google" and authenticate.

After successful login, you'll see the dashboard with tabs:
- Portfolio (if OpenClaw API is accessible)
- Jobs
- Sessions
- Memory
- Messages
- Agents
- Settings

## 6. Testing without Google OAuth

For testing without Google OAuth credentials, modify `client/src/lib/auth.ts`:

```typescript
// Add this for bypass mode
const BYPASS_AUTH = true;

export const useAuthStore = create<AuthStore>((set) => ({
  // ...
  initializeAuth: () => {
    if (BYPASS_AUTH) {
      set({
        token: 'dev-token-bypass',
        user: {
          email: 'dev@localhost',
          name: 'Developer',
          picture: undefined,
        },
        loading: false,
      });
      return;
    }
    // ... normal auth flow
  },
```

Then you can skip OAuth and go straight to the dashboard.

## 7. Test API Endpoints

```bash
# Get your JWT token (from browser DevTools → Application → sessionStorage → "token")
TOKEN="your-jwt-token"

# Test portfolio endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/portfolio

# Test jobs endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/jobs

# Test health check
curl http://localhost:3000/api/health
```

## 8. Debugging

### Browser DevTools

Open DevTools (F12):
- **Console** — JavaScript errors
- **Network** — API requests/responses
- **Application** → Storage → Session Storage — JWT token location

### Server Logs

Check the Express terminal for:
- Authentication flows
- API requests
- Errors and warnings

### Environment Variables

Verify `.env.local` is being loaded:
```bash
# In gateway.js, should see these values logged
echo "API Gateway using JWT_SECRET: ${JWT_SECRET:0:10}..."
```

## 9. Building for Production

```bash
# Build client (creates dist/ folder)
npm run build

# Start server (serves both API and static files)
npm start
```

Then visit: [http://localhost:3000](http://localhost:3000)

## 10. Common Issues

### "Cannot reach backend"

Ensure OpenClaw is running:
```bash
# Local
lsof -i :3000

# Or test API directly
curl http://localhost:3000/api/health
```

### "OAuth failed"

Check:
- Google Client ID/Secret are correct
- Redirect URI in Google Console is `http://localhost:3000/auth/callback`
- Not behind proxy or firewall blocking Google

### "Module not found"

```bash
# Reinstall all dependencies
rm -rf node_modules client/node_modules
npm install
cd client && npm install && cd ..
```

## 11. Making Changes

### React Components

Edit files in `client/src/pages/` or `client/src/components/`

React dev server auto-reloads.

### Express API

Edit `gateway.js`

Use `npm run dev:server` (with `--watch` flag) to auto-reload.

### Styles

Tailwind CSS is configured. Edit classes in `.tsx` files.

Styles auto-update in dev mode.

## 12. Ready to Deploy?

When you're ready:

1. Test thoroughly locally
2. Commit changes: `git add . && git commit -m "message"`
3. Push to GitHub: `git push origin main`
4. Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for Railway

## 📚 Documentation

- **README.md** — Full API documentation
- **DEPLOYMENT_GUIDE.md** — Railway deployment steps
- **gateway.js** — Express API code (well-commented)
- **client/src/** — React component structure

---

Happy coding! 🚀
