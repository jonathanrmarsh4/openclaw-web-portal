import React, { useState } from 'react';
import { messagesAPI } from '../lib/api';

type Channel = 'whatsapp' | 'telegram' | 'discord';

export default function Messages() {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!target.trim() || !message.trim()) {
      setError('Target and message are required');
      return;
    }

    try {
      setSending(true);
      await messagesAPI.send(channel, target, message);
      setSuccess(true);
      setMessage('');
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Send Messages</h1>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          Message sent successfully!
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Channel
          </label>
          <div className="flex gap-4">
            {(['whatsapp', 'telegram', 'discord'] as const).map((ch) => (
              <label key={ch} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="channel"
                  value={ch}
                  checked={channel === ch}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                  className="w-4 h-4"
                />
                <span className="capitalize text-slate-700">{ch}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Target */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Recipient
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              channel === 'whatsapp'
                ? '+1234567890 or contact name'
                : channel === 'telegram'
                ? '@username or chat ID'
                : '@username or server#channel'
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-slate-900 mb-2">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || !target.trim() || !message.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 rounded-lg transition"
        >
          {sending ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p>📝 <strong>Note:</strong> Messages are sent through OpenClaw's message integrations.</p>
        <p>Make sure the recipient is available in your configured channels.</p>
      </div>
    </div>
  );
}
