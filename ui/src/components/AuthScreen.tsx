import React, { useState } from 'react';
import { Cpu, User as UserIcon, Mail, LogIn, UserPlus, ArrowRight, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import type { User, AuthSession } from '../types';
import { api, extractId } from '../api/client';

interface AuthScreenProps {
  users: User[];
  onLoginSuccess: (session: AuthSession) => void;
  isBackendConnected: boolean;
  dbError: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  users,
  onLoginSuccess,
  isBackendConnected,
  dbError,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form states
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [clientId, setClientId] = useState('foo');
  const [clientSecret, setClientSecret] = useState('bar');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!isBackendConnected) {
        throw new Error('MongoDB database server is offline. Please start MongoDB to continue.');
      }

      // 1. Authenticate with JWT handler (POST /v1/authorize)
      const authRes = await api.authorize(clientId, clientSecret);
      const token = authRes.data.access_token;

      // 2. Pick target user profile loaded from MongoDB
      let targetUser: User | undefined;
      if (selectedUserId) {
        targetUser = users.find((u) => extractId(u) === selectedUserId);
      } else if (users.length > 0) {
        targetUser = users[0];
      }

      if (!targetUser) {
        throw new Error('No user selected. Please create a user via Sign Up tab first.');
      }

      const session: AuthSession = { user: targetUser, token };
      api.setStoredAuth(session);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim()) return;
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (!isBackendConnected) {
        throw new Error('MongoDB database server is offline. Unable to insert user.');
      }

      // 1. Create user in Axum / MongoDB (POST /v1/users)
      const userRes = await api.createUser({
        name: signupName.trim(),
        email: signupEmail.trim(),
      });

      // 2. Authorize token (POST /v1/authorize)
      const authRes = await api.authorize(clientId, clientSecret);
      const token = authRes.data.access_token;

      const session: AuthSession = { user: userRes.data, token };
      api.setStoredAuth(session);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090d16] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/80 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl p-8 space-y-6 relative z-10 animate-fade-in">
        {/* App Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/30 mb-2">
            <Cpu size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            rs-chat Workspace
          </h1>
          <p className="text-xs text-gray-400">
            Realtime Chat Engine built with <strong className="text-indigo-400 font-medium">Rust, Axum & MongoDB</strong>
          </p>
        </div>

        {/* MongoDB Status Banner */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-medium ${
            isBackendConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Database size={15} />
            <span>MongoDB Database Status:</span>
          </div>
          <div className="flex items-center gap-2 font-semibold">
            <div
              className={`pulse-dot ${
                isBackendConnected ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-500 text-rose-500'
              }`}
            />
            <span>{isBackendConnected ? 'Connected (:3000)' : 'Offline / Down'}</span>
          </div>
        </div>

        {/* MongoDB Offline Alert Banner */}
        {!isBackendConnected && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1.5 animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-200 text-sm">
              <AlertTriangle size={16} />
              MongoDB Database Connection Down
            </div>
            <p className="text-[11px] leading-relaxed text-rose-300/90">
              {dbError || 'Unable to connect to the MongoDB server. Please ensure MongoDB is running locally or MONGODB_URI is set.'}
            </p>
          </div>
        )}

        {/* Tabs: Login vs Signup */}
        <div className="grid grid-cols-2 gap-1 bg-gray-950/60 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LogIn size={14} />
            Log In
          </button>
          <button
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus size={14} />
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Select MongoDB User Profile
              </label>
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={!isBackendConnected || users.length === 0}
                  className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-indigo-500/70 transition-all cursor-pointer disabled:opacity-50"
                >
                  {users.length === 0 ? (
                    <option value="">-- No Users Found in MongoDB --</option>
                  ) : (
                    users.map((u) => {
                      const uid = extractId(u);
                      return (
                        <option key={uid} value={uid} className="bg-gray-900 text-white">
                          {u.name} ({u.email})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
              {users.length === 0 && isBackendConnected && (
                <p className="text-[11px] text-amber-400 mt-1.5">
                  No users found in MongoDB database. Switch to <strong>Sign Up</strong> tab to register a new user!
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-indigo-500/70"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !isBackendConnected || users.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In with MongoDB'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Signup Form */
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                <UserIcon size={14} className="text-indigo-400" />
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ferris Rustacean"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                disabled={!isBackendConnected}
                className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/70 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-indigo-400" />
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ferris@rust-lang.org"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                disabled={!isBackendConnected}
                className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500/70 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isBackendConnected || !signupName.trim() || !signupEmail.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Inserting into MongoDB...' : 'Save User to MongoDB'}</span>
              <CheckCircle2 size={16} />
            </button>
          </form>
        )}

        <div className="text-center text-[11px] text-gray-500 pt-2 border-t border-white/10">
          Strict MongoDB Persistence & Axum v0.8 API
        </div>
      </div>
    </div>
  );
};
