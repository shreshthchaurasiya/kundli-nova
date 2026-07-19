import { ApiResponse } from './apiTypes';

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public code: string;

  constructor(
    statusCode: number,
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }

  static fromResponse(statusCode: number, responseBody: ApiResponse) {
    const message = responseBody.message || 'An unexpected error occurred';
    const code = responseBody.status || 'ERROR';
    return new ApiError(statusCode, message, code, responseBody.errors);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network failure. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
  }
}
