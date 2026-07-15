import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { pin, identity } = await request.json();

    const expectedPin = process.env.APP_PIN || 'PuchuPuchki2026!';

    if (!pin || pin.trim() !== expectedPin.trim()) {
      return NextResponse.json(
        { success: false, error: 'Incorrect Prickle PIN! Check with your chat partner 🦔' },
        { status: 401 }
      );
    }

    if (identity !== 'puchki' && identity !== 'puchu') {
      return NextResponse.json(
        { success: false, error: 'Please select whether you are Puchki or Puchu!' },
        { status: 400 }
      );
    }

    // Create a simple token encoding identity & timestamp
    const tokenPayload = `${identity}_prickle_session_${Date.now()}`;

    const response = NextResponse.json({ success: true, identity });

    // Set httpOnly session cookie (30 days)
    response.cookies.set('prickle_session', tokenPayload, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    // Also set readable identity cookie for Next.js server actions/middleware quick lookup
    response.cookies.set('prickle_identity', identity, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
