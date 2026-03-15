# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Your Browser                            │
│                  (anywhere in the world)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  React Dashboard (React Router, Zustand)                  │  │
│  │  - Portfolio Status  - Job Queue  - Sessions              │  │
│  │  - Memory Editor     - Messages   - Agent Control         │  │
│  │                                                            │  │
│  │  Authentication: Google OAuth → JWT Token                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                    │
│                    (HTTPS encrypted)                             │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Railway.app       │
                    │  (Public Internet)  │
                    │                     │
                    │  Express.js Gateway │
                    │  - OAuth Handler    │
                    │  - JWT Verification │
                    │  - Rate Limiting    │
                    │  - Reverse Proxy    │
                    │  - Audit Logging    │
                    │                     │
                    └──────────┬──────────┘
                               │
                    (Tailscale VPN encrypted)
                               │
        ┌──────────────────────▼──────────────────────┐
        │          Your Mac mini (Local)             │
        │         (Tailscale peer network)           │
        │                                            │
        │  ┌─────────────────────────────────────┐  │
        │  │  Tailscale Client (VPN)             │  │
        │  │  IP: 100.x.x.x                      │  │
        │  └─────────────────────────────────────┘  │
        │                │                           │
        │  ┌─────────────▼──────────────────────┐  │
        │  │  OpenClaw (Port 3000)              │  │
        │  │  - Session management              │  │
        │  │  - Job execution                   │  │
        │  │  - Memory files                    │  │
        │  │  - Agent spawning                  │  │
        │  │  - SwarmTrade integration          │  │
        │  │                                    │  │
        │  │  Data:                             │  │
        │  │  - MEMORY.md                       │  │
        │  │  - Cron jobs                       │  │
        │  │  - Portfolio data                  │  │
        │  └─────────────────────────────────────┘  │
        └────────────────────────────────────────────┘
```

## Component Architecture

### Frontend (React)

```
client/src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router setup
├── index.css                   # Tailwind base styles
│
├── pages/                      # Main feature pages
│   ├── Login.tsx              # Google OAuth login
│   ├── Dashboard.tsx          # Tab container
│   ├── Portfolio.tsx          # SwarmTrade data
│   ├── JobQueue.tsx           # Cron job management
│   ├── Sessions.tsx           # Session history
│   ├── Memory.tsx             # MEMORY.md editor
│   ├── Messages.tsx           # Send messages
│   ├── Agents.tsx             # Sub-agent control
│   └── Settings.tsx           # User settings
│
├── components/                # Reusable UI components
│   ├── Sidebar.tsx            # Navigation sidebar
│   └── Header.tsx             # Top header bar
│
└── lib/                        # Utilities
    ├── auth.ts                # Auth state (Zustand)
    └── api.ts                 # API client (axios)
```

**State Management:** Zustand (lightweight, easy)
**HTTP Client:** Axios (with JWT interceptors)
**Routing:** React Router v6
**Styling:** Tailwind CSS

### Backend (Express.js)

```
gateway.js (~500 lines)

├── Auth Routes
│   ├── POST /auth/login          → Initiate OAuth
│   ├── GET /auth/callback        → OAuth callback
│   ├── GET /auth/me              → Current user
│   └── POST /auth/logout         → Logout
│
├── API Routes (all require JWT)
│   ├── Portfolio
│   │   └── GET /api/portfolio
│   │
│   ├── Jobs
│   │   ├── GET /api/jobs
│   │   ├── POST /api/jobs/:id/run
│   │   └── GET /api/jobs/:id/history
│   │
│   ├── Sessions
│   │   └── GET /api/sessions
│   │
│   ├── Memory
│   │   ├── GET /api/memory
│   │   └── POST /api/memory
│   │
│   ├── Messages
│   │   └── POST /api/messages/send
│   │
│   ├── Agents
│   │   ├── GET /api/agents
│   │   ├── POST /api/agents/spawn
│   │   └── POST /api/agents/:id/kill
│   │
│   └── System
│       ├── GET /api/audit-log
│       └── GET /api/health
│
├── Middleware
│   ├── JWT verification
│   ├── Rate limiting (50 req/min)
│   ├── CORS configuration
│   └── Audit logging
│
└── Reverse Proxy
    └── All /api/* routes → Tailscale IP:3000
```

**Framework:** Express.js
**Auth:** Google OAuth2 + JWT (jsonwebtoken)
**Rate Limiting:** express-rate-limit
**HTTP Client:** axios (to reach Mac mini)
**Logging:** Console (upgrade to Supabase in production)

## Data Flow

### Login Flow

```
User
  ↓
[Login.tsx] "Sign in with Google" button
  ↓
POST /auth/login
  ↓
[gateway.js] generates OAuth URL
  ↓
Redirect to Google login
  ↓
User authenticates with Google
  ↓
Google redirects to /auth/callback?code=xxx
  ↓
[gateway.js] exchanges code for ID token
  ↓
Verify user email matches ALLOWED_EMAIL
  ↓
Generate JWT token
  ↓
Return token + user info to frontend
  ↓
[auth.ts] stores token in sessionStorage
  ↓
Redirect to Dashboard
```

### API Request Flow

```
React Component
  ↓
[api.ts] getApiClient()
  ↓
axios interceptor adds "Authorization: Bearer JWT"
  ↓
POST/GET request to /api/...
  ↓
[gateway.js] verifyToken middleware
  ↓
Check JWT signature and expiry
  ↓
If valid, extract user info
  ↓
Execute API handler
  ↓
Proxy request to Mac mini (Tailscale IP:3000)
  ↓
Mac mini responds with data
  ↓
Log audit entry
  ↓
Return response to frontend
  ↓
axios interceptor handles 401 (token expired)
  ↓
React re-renders with new data
```

## Deployment Architecture

### Local Development

```
Your Machine
├── npm run dev:server    → localhost:3000 (Express)
├── npm run dev:client    → localhost:5173 (Vite)
├── OpenClaw running      → localhost:3000
└── Tailscale OFF         → connects to local
```

### Production (Railway)

```
Railway Container
├── Tailscale daemon      → Joins VPN network
├── Express.js            → Port 3000 (public)
├── React build (dist/)   → Served by Express
└── Proxies to           → Mac mini (Tailscale IP)

Mac mini
├── Tailscale peer       → 100.x.x.x
└── OpenClaw running     → localhost:3000
```

## Security Layers

### Layer 1: Authentication
- **Google OAuth** — Verify user identity
- **ALLOWED_EMAIL** — Only authorized account
- **ID Token** — Contains user claims

### Layer 2: Authorization
- **JWT Token** — Encrypted, time-limited (1 hour)
- **Token verification** — Every API request
- **401 handling** — Auto-logout on expiry

### Layer 3: Network
- **HTTPS** — Railway → Browser (TLS encryption)
- **Tailscale VPN** — Railway → Mac mini (zero-trust tunnel)
- **CORS** — Only your Railway domain

### Layer 4: Rate Limiting
- **50 requests/minute per user** — Prevent abuse
- **User identification** — By JWT email claim

### Layer 5: Audit Logging
- **All requests logged** — Who, what, when, status
- **Includes auth attempts** — Detect unauthorized access
- **Stored in memory** (upgrade to Supabase)

## Environment Variables

### OAuth
```
GOOGLE_CLIENT_ID          # From Google Cloud Console
GOOGLE_CLIENT_SECRET      # From Google Cloud Console
```

### JWT
```
JWT_SECRET                # Generate with: openssl rand -base64 32
                          # Must be long & random
```

### Tailscale Connection
```
TAILSCALE_IP              # Mac mini's Tailscale IP (100.x.x.x)
TAILSCALE_PORT            # OpenClaw port on Mac mini (3000)
TAILSCALE_AUTH_KEY        # Optional: auto-join Railway container
```

### Deployment
```
ALLOWED_EMAIL             # Your Google email
NODE_ENV                  # production
PORT                      # 3000
API_BASE_URL              # Your Railway domain
FRONTEND_ORIGIN           # Your Railway domain (CORS)
```

## Database Schema (Future Enhancement)

If upgrading audit logging to Supabase:

```sql
create table audit_logs (
  id uuid default uuid_generate_v4() primary key,
  timestamp timestamp default now(),
  user_email text not null,
  action text not null,           -- GET, POST, DELETE, etc.
  resource text not null,         -- /api/portfolio, /api/jobs
  status text not null,           -- success, error, denied
  details jsonb,                  -- Additional context
  ip_address text
);

create index idx_user_email on audit_logs(user_email);
create index idx_timestamp on audit_logs(timestamp);
```

## Performance Considerations

### Frontend
- **Code Splitting** — Only load needed bundles
- **Lazy Loading** — Routes load on demand
- **Zustand** — Minimal re-renders
- **Tailwind** — Minimal CSS bundle

### Backend
- **Rate Limiting** — Prevents abuse
- **Caching** — Could add for portfolio/jobs (30s)
- **Timeouts** — 5s max for remote API calls
- **Connection Pooling** — Not needed (stateless)

### Network
- **Tailscale** — Low latency (local network path)
- **HTTPS** — ~100ms TLS handshake once
- **JWT** — Stateless (no database lookups)

## Scaling Path

If you need to handle more users:

1. **Add database** (Supabase)
   - Move audit logs from memory
   - Store sessions
   - Cache portfolio data

2. **Add caching** (Redis)
   - Cache portfolio (30s)
   - Cache job list (60s)
   - Session store

3. **Split services**
   - API gateway (Express)
   - WebSocket server (real-time updates)
   - Worker processes (heavy lifting)

4. **Multiple replicas**
   - Railway auto-scales containers
   - Load balancer distributes traffic
   - Shared database/cache layer

For now, single Railway container handles 1000+ requests/day easily.

## Testing the System

### Unit Tests
```bash
# Frontend: add Jest + React Testing Library
cd client && npm install --save-dev @testing-library/react jest

# Backend: add Node test framework
npm install --save-dev jest
```

### Integration Tests
```bash
# Test OAuth flow
# Test API endpoints with JWT
# Test Tailscale connectivity
```

### E2E Tests
```bash
# Use Playwright or Cypress
# Login → Navigate dashboard → Check all tabs load
```

---

**Next:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step Railway setup.
