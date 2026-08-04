import { useState, useEffect } from 'react';
import { HeaderNav } from './components/HeaderNav';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { UserModal } from './components/UserModal';
import { NewRoomModal } from './components/NewRoomModal';
import { InviteModal } from './components/InviteModal';
import { AuthScreen } from './components/AuthScreen';
import { Toast } from './components/Toast';
import { api, extractId } from './api/client';
import type { User, ChatSession, Message, ToastInfo, AuthSession } from './types';
import { AlertTriangle } from 'lucide-react';

export function App() {
  // Auth state
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => api.getStoredAuth());

  // Backend status & app state
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [dbError, setDbError] = useState<string>('');

  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isNewRoomModalOpen, setIsNewRoomModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
  };

  // Load app data strictly from Redis Cloud
  const loadInitialData = async () => {
    setIsRefreshing(true);
    setDbError('');
    try {
      const isOnline = await api.checkHealth();
      setIsBackendConnected(isOnline);

      if (!isOnline) {
        setDbError('Redis Cloud database server is offline or cold-starting.');
        return;
      }

      // Load Users from Redis Cloud
      const usersRes = await api.getUsers();
      setUsers(usersRes.data);

      // Load Sessions from Redis Cloud
      const sessionsRes = await api.getSessions();
      setSessions(sessionsRes.data);

      if (sessionsRes.data.length > 0 && !activeSessionId) {
        setActiveSessionId(extractId(sessionsRes.data[0]));
      }
    } catch (err: any) {
      setIsBackendConnected(false);
      setDbError(err.message || 'Redis Cloud database server is down or unreachable.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch current session messages from Redis Cloud
  const fetchMessages = async (sessionId: string) => {
    if (!sessionId) return;
    setIsLoadingMessages(true);
    try {
      const res = await api.getMessages(sessionId);
      setMessages(res.data);
    } catch (err: any) {
      console.error('Error fetching messages from Redis Cloud:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
    }
  }, [activeSessionId]);

  // Periodic polling every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const isOnline = await api.checkHealth();
      setIsBackendConnected(isOnline);
      if (isOnline) {
        setDbError('');
      }

      if (activeSessionId && authSession && isOnline) {
        const res = await api.getMessages(activeSessionId);
        setMessages(res.data);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeSessionId, authSession]);

  // Auth Handlers
  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    showToast('success', `Welcome back, ${session.user.name}!`);
    loadInitialData();
  };

  const handleLogout = () => {
    api.setStoredAuth(null);
    setAuthSession(null);
    showToast('info', 'Logged out of workspace.');
  };

  // Action Handlers
  const handleCreateUser = async (name: string, email: string) => {
    try {
      const res = await api.createUser({ name, email });
      setUsers((prev) => [...prev, res.data]);
      showToast('success', `Saved user "${name}" to Redis Cloud!`);
    } catch (err: any) {
      showToast('error', `Failed to save user in Redis Cloud: ${err.message}`);
    }
  };

  const handleCreateGroupRoom = async (roomName: string, participantIds: string[]) => {
    if (!authSession) return;
    const currentUid = extractId(authSession.user);
    const allParticipants = Array.from(new Set([currentUid, ...participantIds]));

    try {
      const res = await api.createSession(
        { room_name: roomName, participants: allParticipants },
        false
      );
      setSessions((prev) => [res.data, ...prev]);
      const newSid = extractId(res.data);
      setActiveSessionId(newSid);
      showToast('success', `Created group room "${roomName}" in Redis Cloud!`);
    } catch (err: any) {
      showToast('error', `Failed to create room in Redis Cloud: ${err.message}`);
    }
  };

  const handleStartDirectMessage = async (targetUserId: string) => {
    if (!authSession) return;
    const currentUid = extractId(authSession.user);
    try {
      const dmSession = await api.getOrCreateDirectSession(currentUid, targetUserId);
      const dmSid = extractId(dmSession);

      setSessions((prev) => {
        if (!prev.some((s) => extractId(s) === dmSid)) {
          return [dmSession, ...prev];
        }
        return prev;
      });

      setActiveSessionId(dmSid);
    } catch (err: any) {
      showToast('error', `Could not open direct message: ${err.message}`);
    }
  };

  const handleInviteMembers = async (sessionId: string, newMemberIds: string[]) => {
    try {
      const updatedSession = await api.addParticipantsToSession(sessionId, newMemberIds);
      setSessions((prev) =>
        prev.map((s) => (extractId(s) === sessionId ? updatedSession : s))
      );
      showToast('success', `Invited ${newMemberIds.length} member(s) to group!`);
    } catch (err: any) {
      showToast('error', `Failed to invite members: ${err.message}`);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId || !authSession) return;
    const currentUid = extractId(authSession.user);

    try {
      const res = await api.sendMessage(activeSessionId, {
        sender_id: currentUid,
        content,
      });
      setMessages((prev) => [...prev, res.data]);
    } catch (err: any) {
      showToast('error', `Failed to send message: ${err.message}`);
    }
  };

  // If not logged in, render AuthScreen
  if (!authSession) {
    return (
      <>
        <AuthScreen
          users={users}
          onLoginSuccess={handleLoginSuccess}
          isBackendConnected={isBackendConnected}
          dbError={dbError}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  const currentSession = sessions.find((s) => extractId(s) === activeSessionId) || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-white">
      {/* Top Banner if Redis Cloud is Down */}
      {!isBackendConnected && (
        <div className="bg-rose-600/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
          <AlertTriangle size={16} />
          <span>Redis Cloud Database Server is Offline or Down. Ensure backend is running and REDIS_URL is accessible.</span>
        </div>
      )}

      {/* Header Bar */}
      <HeaderNav
        currentUser={authSession.user}
        isBackendConnected={isBackendConnected}
        onLogout={handleLogout}
        onRefresh={loadInitialData}
        isRefreshing={isRefreshing}
      />

      {/* Main App Workspace */}
      <main className="flex-1 flex overflow-hidden">
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          setActiveSessionId={setActiveSessionId}
          users={users}
          currentUser={authSession.user}
          onOpenNewRoomModal={() => setIsNewRoomModalOpen(true)}
          onStartDirectMessage={handleStartDirectMessage}
        />
        <ChatView
          session={currentSession}
          messages={messages}
          users={users}
          currentUser={authSession.user}
          onSendMessage={handleSendMessage}
          isLoadingMessages={isLoadingMessages}
          onOpenInviteModal={() => setIsInviteModalOpen(true)}
        />
      </main>

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onCreateUser={handleCreateUser}
      />

      <NewRoomModal
        isOpen={isNewRoomModalOpen}
        onClose={() => setIsNewRoomModalOpen(false)}
        users={users}
        onCreateRoom={handleCreateGroupRoom}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={currentSession}
        users={users}
        onInviteMembers={handleInviteMembers}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
