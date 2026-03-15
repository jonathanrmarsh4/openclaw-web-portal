import React, { useState, useEffect } from 'react';
import { portfolioAPI } from '../lib/api';

interface PortfolioData {
  balance?: number;
  positions?: any[];
  pnl?: number;
  health?: string;
}

export default function Portfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const result = await portfolioAPI.getStatus();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPortfolio, 30000);
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
        <h1 className="text-3xl font-bold text-slate-900">Portfolio Status</h1>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-500">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchPortfolio}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Balance Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-600 text-sm font-medium">Balance</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${data.balance?.toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          {/* P&L Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-600 text-sm font-medium">P&L</p>
                <p
                  className={`text-3xl font-bold mt-2 ${
                    (data.pnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {(data.pnl ?? 0) >= 0 ? '+' : ''}
                  {data.pnl?.toLocaleString('en-US', {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          {/* Health Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-600 text-sm font-medium">System Health</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {data.health || 'Unknown'}
                </p>
              </div>
              <div className="text-4xl">🏥</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          No portfolio data available
        </div>
      )}

      {/* Positions Table */}
      {data?.positions && data.positions.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Positions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.positions.map((position, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">{position.symbol}</td>
                    <td className="px-6 py-4 text-slate-600">{position.quantity}</td>
                    <td className="px-6 py-4 text-slate-600">
                      ${position.price?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">
                      ${position.value?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
