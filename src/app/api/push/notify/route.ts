import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { USER_PROFILES, SenderIdentity } from '@/lib/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const serverSupabase = createClient(supabaseUrl, serviceKey);

export async function POST(request: Request) {
  try {
    const { recipient, sender, text } = await request.json();

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey || vapidPublicKey === 'placeholder-public-vapid-key') {
      return NextResponse.json({ success: true, note: 'Vapid not configured' });
    }

    webPush.setVapidDetails('mailto:admin@prickle.app', vapidPublicKey, vapidPrivateKey);

    const { data: subs } = await serverSupabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_identity', recipient as SenderIdentity);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, note: 'No subscriptions found' });
    }

    const senderProfile = USER_PROFILES[sender as SenderIdentity];
    const payload = JSON.stringify({
      title: `Message from ${senderProfile?.name || sender}`,
      body: text || 'Sent a message',
      icon: '/icon-192.png',
      url: '/chat',
    });

    for (const subRecord of subs) {
      try {
        await webPush.sendNotification(subRecord.subscription, payload);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await serverSupabase
            .from('push_subscriptions')
            .delete()
            .eq('subscription', subRecord.subscription);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Push notification failed' }, { status: 500 });
  }
}
