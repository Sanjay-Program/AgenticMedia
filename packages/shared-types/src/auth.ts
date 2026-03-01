export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  organizationName: string;
}

export type UserRole = 'admin' | 'talent_manager' | 'data_analyst' | 'client_readonly';
