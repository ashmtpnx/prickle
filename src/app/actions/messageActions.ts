'use server';

import { createClient } from '@supabase/supabase-js';
import { SenderIdentity, MediaType, USER_PROFILES } from '@/lib/types';
import webPush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const serverSupabase = createClient(supabaseUrl, serviceKey);

// Configure web-push with Vapid keys if provided
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey && vapidPublicKey !== 'placeholder-public-vapid-key') {
  try {
    webPush.setVapidDetails(
      'mailto:admin@prickle.app',
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.warn('Vapid details could not be set:', err);
  }
}

export async function sendMessage(
  sender: SenderIdentity,
  content: string | null,
  mediaUrl: string | null = null,
  mediaType: MediaType = null
) {
  try {
    const { data, error } = await serverSupabase
      .from('messages')
      .insert([
        {
          sender,
          content,
          media_url: mediaUrl,
          media_type: mediaType,
          created_at: new Date().toISOString(),
          deleted: false,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }

    // Trigger Web Push to opposite user asynchronously
    const partnerId: SenderIdentity = sender === 'puchki' ? 'puchu' : 'puchki';
    triggerWebPushNotification(partnerId, sender, content, mediaType).catch(() => {
      // Ignore background push delivery errors
    });

    return { success: true, message: data };
  } catch (error) {
    console.error('Unexpected error in sendMessage:', error);
    return { success: false, error: 'Failed to send message' };
  }
}

export async function editMessage(messageId: string, newContent: string) {
  try {
    const { data, error } = await serverSupabase
      .from('messages')
      .update({
        content: newContent,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: data };
  } catch (error) {
    return { success: false, error: 'Failed to edit message' };
  }
}

export async function deleteMessage(messageId: string) {
  try {
    const { data, error } = await serverSupabase
      .from('messages')
      .update({
        deleted: true,
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, message: data };
  } catch (error) {
    return { success: false, error: 'Failed to delete message' };
  }
}

export async function markMessagesAsRead(senderToMark: SenderIdentity) {
  try {
    const { error } = await serverSupabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender', senderToMark)
      .is('read_at', null)
      .eq('deleted', false);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark messages as read' };
  }
}

async function triggerWebPushNotification(
  recipient: SenderIdentity,
  sender: SenderIdentity,
  content: string | null,
  mediaType: MediaType
) {
  if (!vapidPublicKey || !vapidPrivateKey || vapidPublicKey === 'placeholder-public-vapid-key') {
    return;
  }

  try {
    const { data: subs, error } = await serverSupabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_identity', recipient);

    if (error || !subs || subs.length === 0) return;

    const senderProfile = USER_PROFILES[sender];
    let bodyText = content || 'New message';
    if (mediaType === 'image') bodyText = '📷 Sent a photo';
    if (mediaType === 'voice') bodyText = '🎤 Sent a voice note';
    if (mediaType === 'file') bodyText = '📎 Sent a file attachment';

    const payload = JSON.stringify({
      title: `Message from ${senderProfile.name}`,
      body: bodyText,
      icon: '/icon-192.png',
      url: '/chat',
    });

    for (const subRecord of subs) {
      try {
        await webPush.sendNotification(subRecord.subscription, payload);
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          // Remove expired subscription
          await serverSupabase
            .from('push_subscriptions')
            .delete()
            .eq('subscription', subRecord.subscription);
        }
      }
    }
  } catch (err) {
    // Ignore push error
  }
}
