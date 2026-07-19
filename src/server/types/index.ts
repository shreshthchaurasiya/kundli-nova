import { Request } from 'express';

export interface AuthUser {
  id: string;
  role: string;
  phone?: string;
  email?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    name?: string;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
}
