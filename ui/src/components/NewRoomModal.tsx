import React, { useState } from 'react';
import { X, Hash, Check, Users } from 'lucide-react';
import type { User } from '../types';
import { extractId } from '../api/client';

interface NewRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onCreateRoom: (roomName: string, participantIds: string[]) => Promise<void>;
}

export const NewRoomModal: React.FC<NewRoomModalProps> = ({
  isOpen,
  onClose,
  users,
  onCreateRoom,
}) => {
  const [roomName, setRoomName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || selectedUsers.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateRoom(roomName.trim(), selectedUsers);
      setRoomName('');
      setSelectedUsers([]);
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
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Hash size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Chat Room</h3>
              <p className="text-xs text-gray-400">Start a new chat session on Axum</p>
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
              <Hash size={14} className="text-cyan-400" />
              Room Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tokio Async Chat"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-gray-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-cyan-400" />
                Select Participants
              </span>
              <span className="text-[11px] text-gray-500">
                {selectedUsers.length} selected
              </span>
            </label>

            <div className="max-h-48 overflow-y-auto space-y-1 bg-gray-950/50 p-2 rounded-xl border border-white/10">
              {users.map((user) => {
                const uid = extractId(user);
                const isSelected = selectedUsers.includes(uid);
                return (
                  <div
                    key={uid}
                    onClick={() => toggleUser(uid)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                        : 'hover:bg-white/5 border border-transparent text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-400 text-white'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check size={13} />}
                    </div>
                  </div>
                );
              })}
            </div>
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
              disabled={isSubmitting || !roomName.trim() || selectedUsers.length === 0}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-cyan-500/25 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
