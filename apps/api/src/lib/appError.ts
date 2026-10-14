export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CONFLICT';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;
  readonly errors: unknown[];

  constructor(code: AppErrorCode, message: string, statusCode: number, errors: unknown[] = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
