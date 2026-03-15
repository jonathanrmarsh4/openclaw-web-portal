import React, { useState, useEffect } from 'react';
import { agentsAPI } from '../lib/api';

interface Agent {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  task?: string;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpawnForm, setShowSpawnForm] = useState(false);
  const [spawnName, setSpawnName] = useState('');
  const [spawnTask, setSpawnTask] = useState('');
  const [spawning, setSpawning] = useState(false);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const result = await agentsAPI.list();
      setAgents(result.agents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSpawnAgent = async () => {
    if (!spawnName.trim() || !spawnTask.trim()) {
      setError('Name and task are required');
      return;
    }

    try {
      setSpawning(true);
      await agentsAPI.spawn(spawnName, spawnTask);
      setSpawnName('');
      setSpawnTask('');
      setShowSpawnForm(false);
      setError(null);
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn agent');
    } finally {
      setSpawning(false);
    }
  };

  const handleKillAgent = async (agentId: string) => {
    try {
      await agentsAPI.kill(agentId);
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to kill agent');
    }
  };

  useEffect(() => {
    fetchAgents();
    // Refresh every 5 seconds
    const interval = setInterval(fetchAgents, 5000);
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
        <h1 className="text-3xl font-bold text-slate-900">Agent Control</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSpawnForm(!showSpawnForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            {showSpawnForm ? 'Cancel' : 'Spawn New Agent'}
          </button>
          <button
            onClick={fetchAgents}
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

      {/* Spawn Form */}
      {showSpawnForm && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Spawn New Agent</h2>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Agent Name
            </label>
            <input
              type="text"
              value={spawnName}
              onChange={(e) => setSpawnName(e.target.value)}
              placeholder="e.g., data-processor"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">
              Task Description
            </label>
            <textarea
              value={spawnTask}
              onChange={(e) => setSpawnTask(e.target.value)}
              placeholder="Describe what this agent should do..."
              className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSpawnAgent}
            disabled={spawning}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-2 rounded-lg transition"
          >
            {spawning ? 'Spawning...' : 'Spawn Agent'}
          </button>
        </div>
      )}

      {/* Agents List */}
      {agents.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          No agents running
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    ID: {agent.id}
                  </p>
                </div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : agent.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {agent.status}
                </span>
              </div>

              {agent.task && (
                <p className="text-slate-600 mb-4 text-sm">
                  <strong>Task:</strong> {agent.task}
                </p>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Created: {new Date(agent.createdAt).toLocaleString()}
                </span>
                {agent.status === 'running' && (
                  <button
                    onClick={() => handleKillAgent(agent.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    Kill Agent
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
