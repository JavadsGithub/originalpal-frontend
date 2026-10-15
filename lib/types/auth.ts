export interface StandardResponse<T = unknown> {
  success: boolean;
  message: string;
  payload: T;
}

export interface Permission {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  is_active: boolean;
  permission_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_active: boolean;
  roles: Role[];
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  title: string;
  token: string;
  type: string;
  expires_at: string;
}

export interface PaginatedPayload<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
