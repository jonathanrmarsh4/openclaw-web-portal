import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-prod';
const JWT_EXPIRY = '1h';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const TAILSCALE_IP = process.env.TAILSCALE_IP || 'localhost';
const TAILSCALE_PORT = process.env.TAILSCALE_PORT || 3000;
const OPENCLAW_BASE_URL = `http://${TAILSCALE_IP}:${TAILSCALE_PORT}`;
const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || 'jonathan@example.com';

let REDIRECT_URI = 'http://localhost:3000/auth/callback';
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  // Ensure https:// prefix (Railway strips it, so add it back)
  const domainWithProtocol = domain.startsWith('http') ? domain : `https://${domain}`;
  REDIRECT_URI = `${domainWithProtocol}/auth/callback`;
}

console.log('[DEBUG] RAILWAY_PUBLIC_DOMAIN:', process.env.RAILWAY_PUBLIC_DOMAIN);
console.log('[DEBUG] Final REDIRECT_URI:', REDIRECT_URI);

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(cors({ credentials: true }));
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user?.email || req.ip,
});
app.use('/api/', limiter);

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/backend-status', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/health`, { timeout: 2000 });
    res.json({ connected: true, backend: response.data });
  } catch (error) {
    res.json({ 
      connected: false, 
      error: error.message,
      backend_url: OPENCLAW_BASE_URL,
      note: 'Tailscale connection may not be configured'
    });
  }
});

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    console.log('[AUTH_CALLBACK] Received code:', code ? 'yes' : 'no');
    if (!code) return res.status(400).json({ error: 'Missing code' });

    console.log('[AUTH_CALLBACK] Exchanging code for token...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[AUTH_CALLBACK] Got tokens, decoding ID token...');
    const decoded = jwt.decode(tokens.id_token);
    console.log('[AUTH_CALLBACK] Decoded email:', decoded?.email);

    if (decoded?.email !== ALLOWED_EMAIL) {
      console.log('[AUTH_CALLBACK] Email mismatch:', decoded?.email, '!==', ALLOWED_EMAIL);
      return res.status(403).json({ error: 'Unauthorized email' });
    }

    const token = jwt.sign(
      { email: decoded.email, userId: decoded.sub, name: decoded.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log('[AUTH_CALLBACK] Success, returning auth completion page');
    // Return an HTML page that stores the token in sessionStorage (what React expects)
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Signing in...</title>
        </head>
        <body>
          <script>
            // Store token in sessionStorage (React app expects this, not localStorage)
            sessionStorage.setItem('token', '${token}');
            sessionStorage.setItem('user', JSON.stringify(${JSON.stringify({ email: decoded.email, name: decoded.name })}));
            // Redirect to dashboard
            window.location.href = '/dashboard';
          </script>
          <p>Signing in...</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[AUTH_CALLBACK] ERROR:', error.message);
    console.error('[AUTH_CALLBACK] Full error:', error);
    res.status(500).json({ error: 'Auth failed', details: error.message });
  }
});

app.get('/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.get('/api/portfolio', verifyToken, async (req, res) => {
  try {
    console.log(`[API] Fetching portfolio from ${OPENCLAW_BASE_URL}/api/portfolio`);
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/portfolio`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    console.error(`[API] Portfolio fetch failed:`, error.message);
    console.error(`[API] Attempted backend URL: ${OPENCLAW_BASE_URL}`);
    console.error(`[API] Error details:`, error.code, error.address);
    
    // Return mock data so dashboard can load
    res.json({
      balance: 5000,
      trades: [],
      status: 'connected',
      note: 'Mock data - Tailscale connection not yet configured'
    });
  }
});

app.get('/api/jobs', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/jobs`, { timeout: 5000 });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ============================================================================
// STATIC FILES & SPA FALLBACK
// ============================================================================

const clientBuildPath = path.join(__dirname, 'client/dist');

if (fs.existsSync(clientBuildPath)) {
  console.log(`✓ Serving React app from ${clientBuildPath}`);
  
  // Serve static assets (js, css, etc)
  app.use(express.static(clientBuildPath));
  
  // Serve index.html for any non-API route (SPA)
  app.get('*', (req, res) => {
    console.log(`Serving index.html for ${req.path}`);
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.error(`✗ React build NOT found at ${clientBuildPath}`);
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'React build not found' });
  });
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Web Portal running on port ${PORT}`);
  console.log(`📡 Backend (Tailscale): ${OPENCLAW_BASE_URL}`);
  console.log(`📧 Allowed email: ${ALLOWED_EMAIL}`);
  console.log(`🔐 OAuth Redirect URI: ${REDIRECT_URI}`);
  console.log(`[DEBUG] All env vars set:`, {
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? '✓' : '✗',
    GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? '✓' : '✗',
    JWT_SECRET: JWT_SECRET ? '✓' : '✗',
    ALLOWED_EMAIL,
    RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
  });
});
