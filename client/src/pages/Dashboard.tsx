import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Portfolio from './Portfolio';
import JobQueue from './JobQueue';
import Sessions from './Sessions';
import Memory from './Memory';
import Messages from './Messages';
import Agents from './Agents';
import Settings from './Settings';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const tabs = [
    { path: '/dashboard', label: 'Portfolio', icon: '📊' },
    { path: '/dashboard/jobs', label: 'Jobs', icon: '⚙️' },
    { path: '/dashboard/sessions', label: 'Sessions', icon: '📝' },
    { path: '/dashboard/memory', label: 'Memory', icon: '💾' },
    { path: '/dashboard/messages', label: 'Messages', icon: '💬' },
    { path: '/dashboard/agents', label: 'Agents', icon: '🤖' },
    { path: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar tabs={tabs} sidebarOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Portfolio />} />
            <Route path="/dashboard/jobs" element={<JobQueue />} />
            <Route path="/dashboard/sessions" element={<Sessions />} />
            <Route path="/dashboard/memory" element={<Memory />} />
            <Route path="/dashboard/messages" element={<Messages />} />
            <Route path="/dashboard/agents" element={<Agents />} />
            <Route path="/dashboard/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
