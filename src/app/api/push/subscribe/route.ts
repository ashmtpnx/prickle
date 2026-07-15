import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const serverSupabase = createClient(supabaseUrl, serviceKey);

export async function POST(request: Request) {
  try {
    const { identity, subscription } = await request.json();

    if (!identity || !subscription) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await serverSupabase
      .from('push_subscriptions')
      .upsert(
        {
          user_identity: identity,
          subscription: subscription,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_identity,subscription' }
      );

    if (error) {
      // If constraint doesn't exist or upsert fails, try simple insert checking existing
      const { data: existing } = await serverSupabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_identity', identity)
        .filter('subscription->>endpoint', 'eq', subscription.endpoint);

      if (!existing || existing.length === 0) {
        await serverSupabase.from('push_subscriptions').insert([
          {
            user_identity: identity,
            subscription: subscription,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving subscription:', err);
    return NextResponse.json({ success: false, error: 'Failed to save subscription' }, { status: 500 });
  }
}
