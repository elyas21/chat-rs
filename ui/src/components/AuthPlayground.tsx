import React, { useState } from 'react';
import { ShieldCheck, Key, Lock, Unlock, Copy, Check, Terminal } from 'lucide-react';
import { api } from '../api/client';

export const AuthPlayground: React.FC = () => {
  const [clientId, setClientId] = useState('foo');
  const [clientSecret, setClientSecret] = useState('bar');
  const [token, setToken] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const [protectedResponse, setProtectedResponse] = useState('');
  const [isLoadingProtected, setIsLoadingProtected] = useState(false);

  const [authError, setAuthError] = useState('');
  const [protectedError, setProtectedError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthorizing(true);
    setAuthError('');
    setToken('');

    try {
      const res = await api.authorize(clientId, clientSecret);
      setToken(res.data.access_token);
    } catch (err: any) {
      setAuthError(err.message || 'Authorization failed');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleFetchProtected = async () => {
    if (!token) return;
    setIsLoadingProtected(true);
    setProtectedError('');
    setProtectedResponse('');

    try {
      const text = await api.getProtected(token);
      setProtectedResponse(text);
    } catch (err: any) {
      setProtectedError(err.message || 'Protected route request failed');
    } finally {
      setIsLoadingProtected(false);
    }
  };

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-gray-900 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Axum JWT Security Playground
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Bearer Auth
              </span>
            </h2>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Test the Rust backend authentication handlers: <code className="text-indigo-300 font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">POST /v1/authorize</code> and <code className="text-indigo-300 font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">GET /v1/protected</code>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Step 1: Authorize (Get Token) */}
        <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Obtain JWT Token</h3>
                <p className="text-xs text-gray-400">Endpoint: POST /v1/authorize</p>
              </div>
            </div>

            <form onSubmit={handleAuthorize} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Client ID (default: <span className="text-indigo-400 font-mono">foo</span>)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500/70"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Client Secret (default: <span className="text-indigo-400 font-mono">bar</span>)
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500/70"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthorizing || !clientId || !clientSecret}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Key size={16} />
                {isAuthorizing ? 'Generating Token...' : 'Authorize & Generate Token'}
              </button>
            </form>
          </div>

          {/* Token Result Box */}
          {token && (
            <div className="mt-4 p-4 rounded-xl bg-gray-950/90 border border-indigo-500/30 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Lock size={14} />
                  JWT Bearer Access Token
                </span>
                <button
                  onClick={copyToken}
                  className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="font-mono text-xs text-emerald-300 break-all bg-black/40 p-2.5 rounded-lg border border-emerald-500/20 max-h-24 overflow-y-auto">
                {token}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Test Protected Route */}
        <div className="bg-gray-900/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Test Protected Resource</h3>
                <p className="text-xs text-gray-400">Endpoint: GET /v1/protected</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-950/60 border border-white/10 space-y-2 text-xs text-gray-300">
              <p className="font-semibold text-white">Request Header Format:</p>
              <pre className="font-mono text-cyan-300 bg-black/50 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                Authorization: Bearer {token ? `${token.substring(0, 18)}...` : '<ACCESS_TOKEN>'}
              </pre>
            </div>

            {protectedError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                {protectedError}
              </div>
            )}

            <button
              onClick={handleFetchProtected}
              disabled={isLoadingProtected || !token}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Unlock size={16} />
              {isLoadingProtected ? 'Fetching Protected Data...' : 'Request Protected Endpoint'}
            </button>
          </div>

          {/* Response Output Box */}
          {protectedResponse && (
            <div className="mt-4 p-4 rounded-xl bg-gray-950/90 border border-cyan-500/30 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Terminal size={14} />
                  Protected API Response (200 OK)
                </span>
              </div>
              <pre className="font-mono text-xs text-gray-200 whitespace-pre-wrap bg-black/40 p-3 rounded-lg border border-white/10">
                {protectedResponse}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
