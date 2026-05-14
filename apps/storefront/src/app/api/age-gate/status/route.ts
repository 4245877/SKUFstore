import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  AGE_GATE_COOKIE,
  isAgeVerifiedCookieValue,
} from '../../../../lib/age-gate';

export async function GET() {
  const cookieStore = await cookies();

  return NextResponse.json({
    verified: isAgeVerifiedCookieValue(cookieStore.get(AGE_GATE_COOKIE)?.value),
  });
}