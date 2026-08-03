import React, { useState } from 'react';
import { Plus, Search, Hash, MessageSquare, Lock } from 'lucide-react';
import type { ChatSession, User } from '../types';
import { extractId } from '../api/client';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  users: User[];
  currentUser: User;
  onOpenNewRoomModal: () => void;
  onStartDirectMessage: (targetUserId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  setActiveSessionId,
  users,
  currentUser,
  onOpenNewRoomModal,
  onStartDirectMessage,
}) => {
  const [search, setSearch] = useState('');

  const currentUid = extractId(currentUser);

  // Group Rooms (sessions with is_direct !== true, filter to only rooms where current user is a participant)
  const groupSessions = sessions.filter(
    (s) =>
      !s.is_direct &&
      s.participants.map(String).includes(currentUid) &&
      s.room_name.toLowerCase().includes(search.toLowerCase())
  );

  // Other users for Direct Messages (exclude self)
  const otherUsers = users.filter(
    (u) =>
      extractId(u) !== currentUid &&
      (u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <aside className="w-80 border-r border-white/10 bg-gray-900/60 backdrop-blur-lg flex flex-col h-[calc(100vh-64px)]">
      {/* Search Bar Header */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search channels & members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-950/60 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* SECTION 1: Group Rooms */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Hash size={13} className="text-indigo-400" />
              Group Rooms ({groupSessions.length})
            </span>
            <button
              onClick={onOpenNewRoomModal}
              className="p-1 rounded-md bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white transition-colors"
              title="Create Group Room"
            >
              <Plus size={14} />
            </button>
          </div>

          {groupSessions.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">No group rooms found.</div>
          ) : (
            groupSessions.map((session) => {
              const sid = extractId(session);
              const isActive = sid === activeSessionId;
              return (
                <div
                  key={sid}
                  onClick={() => setActiveSessionId(sid)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-900/20 border border-indigo-500/40 text-white shadow-lg shadow-indigo-500/10'
                      : 'hover:bg-white/5 border border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 group-hover:text-white'
                      }`}
                    >
                      #
                    </div>
                    <span className="font-medium text-xs truncate">{session.room_name}</span>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    {session.participants.length}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* SECTION 2: Direct Messages (Private 1-on-1 Chat) */}
        <div className="space-y-1.5">
          <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Lock size={13} className="text-cyan-400" />
            Direct Messages ({otherUsers.length})
          </div>

          {otherUsers.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-500">No other members registered.</div>
          ) : (
            otherUsers.map((user) => {
              const uid = extractId(user);
              
              // Check if current session is a DM with this user
              const dmSession = sessions.find(
                (s) =>
                  s.is_direct &&
                  s.participants.includes(currentUid) &&
                  s.participants.includes(uid)
              );
              const isActive = dmSession ? extractId(dmSession) === activeSessionId : false;

              return (
                <div
                  key={uid}
                  onClick={() => onStartDirectMessage(uid)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-900/20 border border-cyan-500/40 text-white shadow-lg'
                      : 'hover:bg-white/5 border border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-gray-900 absolute -bottom-0.5 -right-0.5" />
                    </div>

                    <div className="truncate">
                      <p className="font-medium text-xs text-white truncate leading-tight">{user.name}</p>
                      <p className="text-[10px] text-gray-500 truncate leading-tight">{user.email}</p>
                    </div>
                  </div>

                  <MessageSquare size={14} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Profile summary */}
      <div className="p-3 border-t border-white/10 bg-gray-950/40 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Logged in: <strong className="text-white">{currentUser.name}</strong>
        </span>
      </div>
    </aside>
  );
};
