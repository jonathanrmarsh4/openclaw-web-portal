import React, { useState, useEffect } from 'react';
import { memoryAPI } from '../lib/api';

export default function Memory() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchMemory = async () => {
    try {
      setLoading(true);
      const result = await memoryAPI.get();
      setContent(result.content || '');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memory');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await memoryAPI.save(content);
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchMemory();
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
        <h1 className="text-3xl font-bold text-slate-900">Memory & Notes</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchMemory}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
          >
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Memory saved successfully!
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-96 p-4 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Your notes and memory go here..."
        />
      </div>

      <div className="text-sm text-slate-500">
        <p>💾 Your memories are saved to MEMORY.md in your workspace.</p>
        <p>📝 Use this editor to capture important context, decisions, and lessons learned.</p>
      </div>
    </div>
  );
}
