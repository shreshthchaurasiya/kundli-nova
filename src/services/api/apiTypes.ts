export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  code?: string;
  data?: T;
  message?: string;
  errors?: any[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  requiresAuth?: boolean;
  timeout?: number;
}
