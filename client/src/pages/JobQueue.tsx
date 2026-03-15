import React, { useState, useEffect } from 'react';
import { jobsAPI } from '../lib/api';

interface Job {
  id: string;
  name: string;
  enabled: boolean;
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  status?: string;
}

export default function JobQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const result = await jobsAPI.list();
      setJobs(result.jobs || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRunJob = async (jobId: string) => {
    try {
      setRunningJob(jobId);
      await jobsAPI.run(jobId);
      // Refresh jobs list
      await fetchJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run job');
    } finally {
      setRunningJob(null);
    }
  };

  useEffect(() => {
    fetchJobs();
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
        <h1 className="text-3xl font-bold text-slate-900">Cron Jobs</h1>
        <button
          onClick={fetchJobs}
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

      {jobs.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          No jobs found
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Job Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Last Run
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Next Run
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {job.name}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          job.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {job.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {job.schedule || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {job.lastRun || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {job.nextRun || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleRunJob(job.id)}
                        disabled={!job.enabled || runningJob === job.id}
                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                          runningJob === job.id
                            ? 'bg-gray-400 text-white cursor-wait'
                            : job.enabled
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {runningJob === job.id ? 'Running...' : 'Run'}
                      </button>
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
