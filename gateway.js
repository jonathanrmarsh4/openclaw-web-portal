import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
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
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

// OAuth2 client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/callback`
);

// Audit log (in-memory; use Supabase in production)
const auditLog = [];
const logAudit = (userId, action, resource, status, details = {}) => {
  auditLog.push({
    timestamp: new Date().toISOString(),
    userId,
    action,
    resource,
    status,
    details,
  });
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(express.json());
app.use(cors({
  origin: [FRONTEND_ORIGIN, 'http://localhost:5173'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute
  keyGenerator: (req) => req.user?.email || req.ip,
});
app.use('/api/', limiter);

// JWT verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: error.message });
  }
};

// ============================================================================
// AUTH ROUTES
// ============================================================================

// POST /auth/login - Redirect to Google OAuth
app.post('/auth/login', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
  });
  res.json({ url });
});

// GET /auth/callback - OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error('No ID token received');
    }

    const decoded = jwt.decode(idToken);
    const email = decoded?.email;

    if (email !== ALLOWED_EMAIL) {
      logAudit(email, 'LOGIN_ATTEMPT', 'auth', 'denied', { reason: 'Unauthorized email' });
      return res.status(403).json({ error: 'You are not authorized to access this portal' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email,
        userId: decoded.sub,
        name: decoded.name,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    logAudit(email, 'LOGIN', 'auth', 'success');

    // Return token (frontend will store in sessionStorage/localStorage)
    res.json({
      token,
      user: {
        email,
        name: decoded.name,
        picture: decoded.picture,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    logAudit('unknown', 'LOGIN_ATTEMPT', 'auth', 'error', { reason: error.message });
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

// GET /auth/me - Get current user
app.get('/auth/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/logout - Logout
app.post('/auth/logout', verifyToken, (req, res) => {
  logAudit(req.user.email, 'LOGOUT', 'auth', 'success');
  res.json({ message: 'Logged out successfully' });
});

// ============================================================================
// API ROUTES - PORTFOLIO
// ============================================================================

app.get('/api/portfolio', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/portfolio`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', 'portfolio', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Portfolio fetch error:', error.message);
    logAudit(req.user.email, 'GET', 'portfolio', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch portfolio',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - JOBS (CRON)
// ============================================================================

app.get('/api/jobs', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/jobs`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', 'jobs', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Jobs fetch error:', error.message);
    logAudit(req.user.email, 'GET', 'jobs', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch jobs',
      details: error.message,
    });
  }
});

app.post('/api/jobs/:id/run', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.post(`${OPENCLAW_BASE_URL}/api/jobs/${id}/run`, {}, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'POST', `jobs/${id}/run`, 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Job run error:', error.message);
    logAudit(req.user.email, 'POST', `jobs/${id}/run`, 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to run job',
      details: error.message,
    });
  }
});

app.get('/api/jobs/:id/history', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/jobs/${id}/history`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', `jobs/${id}/history`, 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Job history fetch error:', error.message);
    logAudit(req.user.email, 'GET', `jobs/${id}/history`, 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch job history',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - SESSIONS
// ============================================================================

app.get('/api/sessions', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/sessions`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', 'sessions', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Sessions fetch error:', error.message);
    logAudit(req.user.email, 'GET', 'sessions', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch sessions',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - MEMORY
// ============================================================================

app.get('/api/memory', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/memory`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', 'memory', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Memory fetch error:', error.message);
    logAudit(req.user.email, 'GET', 'memory', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch memory',
      details: error.message,
    });
  }
});

app.post('/api/memory', verifyToken, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const response = await axios.post(`${OPENCLAW_BASE_URL}/api/memory`, { content }, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'POST', 'memory', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Memory save error:', error.message);
    logAudit(req.user.email, 'POST', 'memory', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to save memory',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - MESSAGES
// ============================================================================

app.post('/api/messages/send', verifyToken, async (req, res) => {
  const { channel, target, message } = req.body;
  if (!channel || !target || !message) {
    return res.status(400).json({ error: 'Channel, target, and message are required' });
  }

  try {
    const response = await axios.post(`${OPENCLAW_BASE_URL}/api/messages/send`, {
      channel,
      target,
      message,
    }, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'POST', 'messages/send', 'success', { channel, target });
    res.json(response.data);
  } catch (error) {
    console.error('Message send error:', error.message);
    logAudit(req.user.email, 'POST', 'messages/send', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to send message',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - AGENTS
// ============================================================================

app.get('/api/agents', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${OPENCLAW_BASE_URL}/api/agents`, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'GET', 'agents', 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Agents fetch error:', error.message);
    logAudit(req.user.email, 'GET', 'agents', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to fetch agents',
      details: error.message,
    });
  }
});

app.post('/api/agents/spawn', verifyToken, async (req, res) => {
  const { name, task } = req.body;
  if (!name || !task) {
    return res.status(400).json({ error: 'Name and task are required' });
  }

  try {
    const response = await axios.post(`${OPENCLAW_BASE_URL}/api/agents/spawn`, {
      name,
      task,
    }, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'POST', 'agents/spawn', 'success', { name });
    res.json(response.data);
  } catch (error) {
    console.error('Agent spawn error:', error.message);
    logAudit(req.user.email, 'POST', 'agents/spawn', 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to spawn agent',
      details: error.message,
    });
  }
});

app.post('/api/agents/:id/kill', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.post(`${OPENCLAW_BASE_URL}/api/agents/${id}/kill`, {}, {
      timeout: 5000,
    });
    logAudit(req.user.email, 'POST', `agents/${id}/kill`, 'success');
    res.json(response.data);
  } catch (error) {
    console.error('Agent kill error:', error.message);
    logAudit(req.user.email, 'POST', `agents/${id}/kill`, 'error', { reason: error.message });
    res.status(500).json({
      error: 'Failed to kill agent',
      details: error.message,
    });
  }
});

// ============================================================================
// API ROUTES - SYSTEM
// ============================================================================

app.get('/api/audit-log', verifyToken, (req, res) => {
  logAudit(req.user.email, 'GET', 'audit-log', 'success');
  res.json({ logs: auditLog });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================================================
// STATIC FILES (React build)
// ============================================================================

const clientBuildPath = path.join(__dirname, 'client/dist');

// Check if client build exists; if so, serve it
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // SPA fallback: route all non-API requests to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Fallback: simple message
  app.get('/', (req, res) => {
    res.json({
      message: 'OpenClaw Web Portal API Gateway',
      status: 'running',
      docs: 'See README.md for API documentation',
    });
  });
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Web Portal running on port ${PORT}`);
  console.log(`📡 Backend (Tailscale): ${OPENCLAW_BASE_URL}`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`📧 Allowed email: ${ALLOWED_EMAIL}`);
});
