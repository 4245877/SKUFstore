import { NextResponse } from 'next/server';

import {
  AGE_GATE_COOKIE,
  AGE_GATE_MAX_AGE,
  isSafeReturnTo,
} from '../../../../lib/age-gate';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const returnTo = isSafeReturnTo(body.returnTo) ? body.returnTo : '/catalog';

  const response = NextResponse.json({
    ok: true,
    returnTo,
  });

  response.cookies.set(AGE_GATE_COOKIE, 'true', {
    path: '/',
    maxAge: AGE_GATE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  });

  return response;
}