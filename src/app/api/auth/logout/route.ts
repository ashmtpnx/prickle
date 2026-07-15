import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete('prickle_session');
  response.cookies.delete('prickle_identity');

  return response;
}
