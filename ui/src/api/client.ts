import type {
  User,
  ChatSession,
  Message,
  CreateUserPayload,
  CreateSessionPayload,
  CreateMessagePayload,
  ApiResponse,
  AuthSession,
} from '../types';

const API_BASE = '/v1';

const LOCAL_STORAGE_KEYS = {
  AUTH_SESSION: 'rs_chat_auth_session',
};

const FETCH_TIMEOUT_MS = 6000;

function getLocal<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Utility to extract string ID
export function extractId(obj?: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.id && typeof obj.id === 'string') return obj.id;
  if (obj._id && typeof obj._id === 'string') return obj._id;
  return String(obj);
}

export const api = {
  getStoredAuth(): AuthSession | null {
    return getLocal<AuthSession | null>(LOCAL_STORAGE_KEYS.AUTH_SESSION, null);
  },

  setStoredAuth(session: AuthSession | null): void {
    if (session) {
      setLocal(LOCAL_STORAGE_KEYS.AUTH_SESSION, session);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_SESSION);
    }
  },

  /**
   * Check if Axum server and Redis Cloud database are healthy and responding
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  },

  /**
   * Fetch all users directly from Redis Cloud via Axum (GET /v1/users)
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Unable to connect to Redis Cloud server');
    }
  },

  /**
   * Create new user in Redis Cloud (POST /v1/users)
   */
  async createUser(payload: CreateUserPayload): Promise<ApiResponse<User>> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Insert Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save user into Redis Cloud');
    }
  },

  /**
   * Fetch all chat sessions directly from Redis Cloud via Axum (GET /v1/sessions)
   */
  async getSessions(): Promise<ApiResponse<ChatSession[]>> {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Session Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      return { data: [], isBackend: false };
    }
  },

  /**
   * Create new chat session room in Redis Cloud (POST /v1/sessions)
   */
  async createSession(payload: CreateSessionPayload, isDirect: boolean = false): Promise<ApiResponse<ChatSession>> {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Room Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      const sessionWithFlag: ChatSession = {
        ...data,
        is_direct: isDirect,
      };
      return { data: sessionWithFlag, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create room in Redis Cloud');
    }
  },

  /**
   * Get or create a 1-on-1 Direct Message session in Redis Cloud
   */
  async getOrCreateDirectSession(user1Id: string, user2Id: string): Promise<ChatSession> {
    const { data: allSessions } = await this.getSessions();
    
    const existing = allSessions.find((s) => {
      const p = s.participants.map((pid) => String(pid));
      return (
        p.length === 2 &&
        p.includes(String(user1Id)) &&
        p.includes(String(user2Id))
      );
    });

    if (existing) {
      return { ...existing, is_direct: true };
    }

    const res = await this.createSession(
      {
        room_name: `Direct Chat`,
        participants: [user1Id, user2Id],
      },
      true
    );
    return res.data;
  },

  /**
   * Add members to session
   */
  async addParticipantsToSession(sessionId: string, newParticipantIds: string[]): Promise<ChatSession> {
    const { data: allSessions } = await this.getSessions();
    const existing = allSessions.find((s) => extractId(s) === sessionId);
    if (!existing) {
      throw new Error('Group session not found in Redis Cloud');
    }
    const updatedParticipants = Array.from(
      new Set([...existing.participants.map(String), ...newParticipantIds])
    );
    return await this.createSession(
      {
        room_name: existing.room_name,
        participants: updatedParticipants,
      },
      existing.is_direct
    ).then((r) => r.data);
  },

  /**
   * Fetch session messages directly from Redis Cloud via Axum (GET /v1/sessions/:id/messages)
   */
  async getMessages(sessionId: string): Promise<ApiResponse<Message[]>> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Messages Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      return { data: [], isBackend: false };
    }
  },

  /**
   * Send a message to Redis Cloud (POST /v1/sessions/:id/messages)
   */
  async sendMessage(sessionId: string, payload: CreateMessagePayload): Promise<ApiResponse<Message>> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Redis Send Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send message to Redis Cloud');
    }
  },

  /**
   * Authorize JWT credentials (POST /v1/authorize)
   */
  async authorize(clientId: string, clientSecret: string): Promise<{ data: { access_token: string; token_type: string } }> {
    const res = await fetch(`${API_BASE}/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid credentials');
    }
    return { data };
  },

  async getProtected(token: string): Promise<string> {
    const res = await fetch(`${API_BASE}/protected`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(text || 'Unauthorized request');
    }
    return text;
  }
};
