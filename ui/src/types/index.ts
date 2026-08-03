export interface MongoObjectId {
  $oid?: string;
}

export interface User {
  _id?: string | MongoObjectId;
  id?: string | MongoObjectId;
  name: string;
  email: string;
  password_hash?: string;
}

export interface ChatSession {
  _id?: string | MongoObjectId;
  id?: string | MongoObjectId;
  room_name: string;
  participants: string[];
  is_direct?: boolean;
}

export interface Message {
  _id?: string | MongoObjectId;
  id?: string | MongoObjectId;
  session_id: string;
  sender_id: string;
  content: string;
  timestamp: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
}

export interface CreateSessionPayload {
  room_name: string;
  participants: string[];
}

export interface CreateMessagePayload {
  sender_id: string;
  content: string;
}

export interface AuthPayload {
  client_id: string;
  client_secret: string;
}

export interface AuthBody {
  access_token: string;
  token_type: string;
}

export interface ApiResponse<T> {
  data: T;
  isBackend: boolean;
}

export interface ToastInfo {
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
