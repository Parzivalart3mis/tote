import { NextResponse } from 'next/server';

type ErrorCode = 'UNAUTHORIZED' | 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'RATE_LIMITED' | 'INTERNAL';

export function apiError(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
