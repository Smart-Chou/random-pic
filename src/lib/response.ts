import { NextResponse } from 'next/server';
import { AppError } from './errors';

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function jsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: AppError | Error, status = 400): NextResponse {
  const errorObj = error instanceof AppError
    ? { code: error.code, message: error.message }
    : { code: 'INTERNAL_ERROR', message: error.message };

  return NextResponse.json(
    { success: false, error: errorObj },
    { status }
  );
}

export function redirectResponse(url: string, status = 302): NextResponse {
  return NextResponse.redirect(url, status);
}