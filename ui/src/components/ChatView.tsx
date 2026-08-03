import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Users, Sparkles, Clock, User as UserIcon, UserPlus } from 'lucide-react';
import type { ChatSession, Message, User } from '../types';
import { extractId } from '../api/client';

interface ChatViewProps {
  session: ChatSession | null;
  messages: Message[];
  users: User[];
  currentUser: User;
  onSendMessage: (content: string) => Promise<void>;
  isLoadingMessages: boolean;
  onOpenInviteModal?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  session,
  messages,
  users,
  currentUser,
  onSendMessage,
  isLoadingMessages,
  onOpenInviteModal,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUid = extractId(currentUser);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);
    try {
      await onSendMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const getUserById = (id: string): User | undefined => {
    return users.find((u) => extractId(u) === String(id));
  };

  const formatTime = (ts: number): string => {
    if (!ts) return '';
    const date = new Date(ts > 10000000000 ? ts : ts * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-950/20">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-500/10">
          <Sparkles size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Welcome to rs-chat</h3>
        <p className="text-sm text-gray-400 max-w-sm">
          Select a <strong>Group Room</strong> or start a <strong>Direct Private Chat</strong> from the sidebar to start messaging.
        </p>
      </div>
    );
  }

  // Determine partner user for Direct Messages
  let dmPartner: User | undefined;
  if (session.is_direct) {
    const partnerId = session.participants.find((p) => String(p) !== currentUid);
    if (partnerId) {
      dmPartner = getUserById(partnerId);
    }
  }

  const roomTitle = session.is_direct
    ? dmPartner
      ? dmPartner.name
      : 'Direct Message'
    : session.room_name;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-gray-950/30">
      {/* Room / DM Header */}
      <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-gray-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md ${
              session.is_direct
                ? 'bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-cyan-500/20'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20'
            }`}
          >
            {session.is_direct ? <UserIcon size={20} /> : <Hash size={20} />}
          </div>

          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {roomTitle}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  session.is_direct
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                }`}
              >
                {session.is_direct ? 'Private DM' : 'Group Room'}
              </span>
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
              {session.is_direct ? (
                <span>{dmPartner ? dmPartner.email : '1-on-1 Conversation'}</span>
              ) : (
                <>
                  <Users size={12} className="text-indigo-400" />
                  <span>{session.participants.length} Participants</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Actions: Invite Members (Group Chats) & Participant Badges */}
        <div className="flex items-center gap-3">
          {!session.is_direct && onOpenInviteModal && (
            <button
              onClick={onOpenInviteModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all"
            >
              <UserPlus size={14} />
              <span>Invite Members</span>
            </button>
          )}

          {!session.is_direct && (
            <div className="flex items-center -space-x-2 overflow-hidden pl-2 border-l border-white/10">
              {session.participants.map((pid) => {
                const participant = getUserById(pid);
                const name = participant ? participant.name : String(pid);
                return (
                  <div
                    key={pid}
                    title={name}
                    className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="text-center py-12 text-gray-500 text-xs flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-xs space-y-2">
            <p className="text-sm text-gray-400 font-medium">No messages in this chat yet 💬</p>
            <p>Type a message below to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const mid = extractId(msg);
            const sender = getUserById(msg.sender_id);
            const isSelf = String(msg.sender_id) === currentUid;
            const senderName = sender ? sender.name : isSelf ? currentUser.name : 'User';

            return (
              <div
                key={mid}
                className={`flex gap-3 max-w-2xl animate-fade-in ${
                  isSelf ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md ${
                    isSelf
                      ? 'bg-gradient-to-br from-indigo-500 to-cyan-500'
                      : 'bg-gradient-to-br from-purple-600 to-pink-500'
                  }`}
                >
                  {senderName.charAt(0).toUpperCase()}
                </div>

                {/* Message Content Bubble */}
                <div className={`space-y-1 ${isSelf ? 'items-end text-right' : ''}`}>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 px-1">
                    <span className="font-semibold text-gray-300">{senderName}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Clock size={10} />
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-md ${
                      isSelf
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none border border-indigo-500/30'
                        : 'bg-gray-900/90 text-gray-100 rounded-tl-none border border-white/10'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="p-4 border-t border-white/10 bg-gray-900/60 backdrop-blur-md">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            type="text"
            placeholder={`Message ${roomTitle} as ${currentUser.name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-gray-950/70 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
          >
            <span>Send</span>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
