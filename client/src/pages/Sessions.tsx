import React, { useState, useEffect } from 'react';
import { sessionsAPI } from '../lib/api';

interface Session {
  id: string;
  timestamp: string;
  type: string;
  status: string;
  output?: string;
  agentName?: string;
  duration?: number;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const result = await sessionsAPI.list();
      setSessions(result.sessions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // Refresh every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Session History</h1>
        <button
          onClick={fetchSessions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          No sessions found
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow">
              <button
                onClick={() =>
                  setExpandedId(expandedId === session.id ? null : session.id)
                }
                className="w-full p-4 text-left hover:bg-slate-50 transition flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        session.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : session.status === 'error'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {session.status}
                    </span>
                    <span className="font-medium text-slate-900">
                      {session.agentName || session.type}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(session.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-slate-400">
                  {expandedId === session.id ? '▼' : '▶'}
                </div>
              </button>

              {expandedId === session.id && session.output && (
                <div className="px-4 pb-4 border-t border-slate-200">
                  <div className="bg-slate-900 rounded p-3 text-slate-100 font-mono text-sm overflow-x-auto max-h-80 overflow-y-auto">
                    <pre>{session.output}</pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
