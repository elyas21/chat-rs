import React from 'react';
import { Cpu, RefreshCw, LogOut, Database } from 'lucide-react';
import type { User } from '../types';

interface HeaderNavProps {
  currentUser: User;
  isBackendConnected: boolean;
  onLogout: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  isBackendConnected,
  onLogout,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="h-16 border-b border-white/10 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-50 px-6 flex items-center justify-between">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Cpu size={22} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              rs-chat
            </span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Axum + Redis
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Tokio Async + Redis Cloud</p>
        </div>
      </div>

      {/* Right Controls: Redis Cloud Status, Current User Profile, Logout */}
      <div className="flex items-center gap-4">
        {/* Redis Status Badge */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border ${
            isBackendConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          }`}
        >
          <Database size={14} />
          <div
            className={`pulse-dot ${
              isBackendConnected ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-500 text-rose-500'
            }`}
          />
          <span>{isBackendConnected ? 'Redis Cloud Live (:3000)' : 'Redis Offline'}</span>
        </div>

        {/* Refresh Data */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
        </button>

        {/* User Identity & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
