import React, { useState } from 'react';
import { X, UserPlus, Mail, User as UserIcon } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (name: string, email: string) => Promise<void>;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onCreateUser }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateUser(name.trim(), email.trim());
      setName('');
      setEmail('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New User</h3>
              <p className="text-xs text-gray-400">Register user in Axum backend / MongoDB</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
              <UserIcon size={14} className="text-indigo-400" />
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alice Rustacean"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
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
              placeholder="e.g. alice@tokio.rs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-300 hover:bg-white/5 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !email.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-indigo-500/25 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
