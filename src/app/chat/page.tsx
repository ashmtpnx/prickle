'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SenderIdentity } from '@/lib/types';
import ChatWindow from '@/components/ChatWindow';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function ChatPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState<SenderIdentity | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check localStorage first, or fallback to prickle_identity cookie
    let id = localStorage.getItem('prickle_identity') as SenderIdentity | null;
    if (!id || (id !== 'puchki' && id !== 'puchu')) {
      const cookieId = getCookieValue('prickle_identity') as SenderIdentity | null;
      if (cookieId && (cookieId === 'puchki' || cookieId === 'puchu')) {
        id = cookieId;
        localStorage.setItem('prickle_identity', id);
      }
    }

    if (!id || (id !== 'puchki' && id !== 'puchu')) {
      // Not identified yet, redirect to login
      router.push('/login');
    } else {
      setIdentity(id);
      setChecking(false);

      // Register PWA Service Worker and subscribe to push
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then(async (registration) => {
            console.log('Service Worker registered with scope:', registration.scope);

            // Check push permission
            if (Notification.permission === 'default') {
              const perm = await Notification.requestPermission();
              if (perm === 'granted') {
                subscribeToPush(registration, id);
              }
            } else if (Notification.permission === 'granted') {
              subscribeToPush(registration, id);
            }
          })
          .catch((err) => console.error('Service Worker registration failed:', err));
      }
    }
  }, [router]);

  const subscribeToPush = async (registration: ServiceWorkerRegistration, currentIdentity: SenderIdentity) => {
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey || vapidKey === 'placeholder-public-vapid-key') return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: currentIdentity,
          subscription: subscription.toJSON(),
        }),
      });
    } catch (err) {
      console.warn('Could not subscribe to Web Push:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (checking || !identity) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center chat-wallpaper">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2AABEE] to-[#E56B88] flex items-center justify-center text-white text-2xl shadow-lg animate-bounce mb-3">
          🦔
        </div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Entering Prickle Sanctuary...</p>
      </div>
    );
  }

  return <ChatWindow myIdentity={identity} />;
}
