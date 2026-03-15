import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface Tab {
  path: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  tabs: Tab[];
  sidebarOpen: boolean;
}

export default function Sidebar({ tabs, sidebarOpen }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-slate-900 text-white transition-all duration-300 overflow-hidden`}
    >
      <div className="p-4 flex items-center gap-3">
        <div className="text-3xl">🤖</div>
        {sidebarOpen && <h1 className="text-xl font-bold">OpenClaw</h1>}
      </div>

      <nav className="mt-8 space-y-2 px-2">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              location.pathname === tab.path
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            {sidebarOpen && <span className="text-sm font-medium">{tab.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
