import type {
  User,
  ChatSession,
  Message,
  CreateUserPayload,
  CreateSessionPayload,
  CreateMessagePayload,
  AuthBody,
  ApiResponse,
  AuthSession,
} from '../types';

const API_BASE = '/v1';

const LOCAL_STORAGE_KEYS = {
  AUTH_SESSION: 'rs_chat_auth_session',
};

const FETCH_TIMEOUT_MS = 3500;

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

// Utility to safely extract string ID from MongoDB ObjectId or string
export function extractId(obj?: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj._id) {
    if (typeof obj._id === 'string') return obj._id;
    if (typeof obj._id === 'object' && obj._id.$oid) return obj._id.$oid;
  }
  if (obj.id) {
    if (typeof obj.id === 'string') return obj.id;
    if (typeof obj.id === 'object' && obj.id.$oid) return obj.id.$oid;
  }
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
   * Check if Axum server and MongoDB database are healthy and responding
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'GET',
        signal: AbortSignal.timeout(2500),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Fetch all users directly from MongoDB via Axum (GET /v1/users)
   */
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `MongoDB Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Unable to connect to MongoDB server');
    }
  },

  /**
   * Create new user in MongoDB (POST /v1/users)
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
        throw new Error(json.error || `MongoDB Insert Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save user into MongoDB');
    }
  },

  /**
   * Fetch all chat sessions directly from MongoDB via Axum (GET /v1/sessions)
   */
  async getSessions(): Promise<ApiResponse<ChatSession[]>> {
    try {
      const res = await fetch(`${API_BASE}/sessions`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `MongoDB Session Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      return { data: [], isBackend: false };
    }
  },

  /**
   * Create new chat session room in MongoDB (POST /v1/sessions)
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
        throw new Error(json.error || `MongoDB Room Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      const sessionWithFlag: ChatSession = {
        ...data,
        is_direct: isDirect,
      };
      return { data: sessionWithFlag, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create room in MongoDB');
    }
  },

  /**
   * Get or create a 1-on-1 Direct Message session in MongoDB
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
      throw new Error('Group session not found in MongoDB');
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
   * Fetch session messages directly from MongoDB via Axum (GET /v1/sessions/:id/messages)
   */
  async getMessages(sessionId: string): Promise<ApiResponse<Message[]>> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `MongoDB Messages Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      return { data: [], isBackend: false };
    }
  },

  /**
   * Send a message to MongoDB (POST /v1/sessions/:id/messages)
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
        throw new Error(json.error || `MongoDB Send Error (HTTP ${res.status})`);
      }
      const data = await res.json();
      return { data, isBackend: true };
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send message to MongoDB');
    }
  },

  /**
   * Authorize JWT credentials (POST /v1/authorize)
   */
  async authorize(clientId: string, clientSecret: string): Promise<{ data: AuthBody }> {
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
    try {
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
    } catch (err: any) {
      throw new Error(err.message || 'Unauthorized / Protected route error');
    }
  }
};
