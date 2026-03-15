import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { systemAPI } from '../lib/api';

interface SystemStatus {
  status: string;
  timestamp: string;
  uptime: number;
}

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const token = useAuthStore((state) => state.token);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      const result = await systemAPI.getHealth();
      setSystemStatus(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">User Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Email</p>
            <p className="text-lg font-medium text-slate-900">{user?.email}</p>
          </div>
          {user?.name && (
            <div>
              <p className="text-sm text-slate-600 mb-1">Name</p>
              <p className="text-lg font-medium text-slate-900">{user.name}</p>
            </div>
          )}
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* API Token */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">API Token</h2>
        <p className="text-sm text-slate-600 mb-4">
          Use this token to authenticate API requests. Keep it secret!
        </p>
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-slate-100 rounded p-3 font-mono text-sm break-all">
            {showToken
              ? token
              : token?.substring(0, 20) + '...' + token?.substring(token.length - 10)}
          </div>
          <button
            onClick={() => setShowToken(!showToken)}
            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded transition"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={() => copyToClipboard(token || '')}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Copy
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">System Status</h2>
          <button
            onClick={fetchSystemStatus}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : systemStatus ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Status</span>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {systemStatus.status}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Uptime</span>
              <span className="text-slate-900 font-medium">
                {Math.floor(systemStatus.uptime / 3600)}h{' '}
                {Math.floor((systemStatus.uptime % 3600) / 60)}m
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Last Update</span>
              <span className="text-slate-900 font-medium">
                {new Date(systemStatus.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Tailscale Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-4">🔐 Tailscale Connection</h2>
        <div className="space-y-3 text-sm text-blue-800">
          <p>
            <strong>Status:</strong> Connected via Tailscale VPN
          </p>
          <p>
            <strong>Security:</strong> Zero-trust encrypted tunnel to your Mac mini
          </p>
          <p>
            <strong>Configuration:</strong> Check .env file on Railway for{' '}
            <code className="bg-white px-2 py-1 rounded">TAILSCALE_IP</code>
          </p>
        </div>
      </div>
    </div>
  );
}
