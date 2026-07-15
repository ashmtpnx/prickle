'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Message, SenderIdentity, getPartnerIdentity, PresencePayload } from '@/lib/types';
import { canGroupConsecutiveMessages, formatStickyHeaderDate, checkSameDay } from '@/lib/dateUtils';
import { sendMessage, editMessage, deleteMessage, markMessagesAsRead } from '@/app/actions/messageActions';
import Header from './Header';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Composer from './Composer';
import QuickStickers from './QuickStickers';
import FloatingParticles, { FloatingParticlesRef } from './FloatingParticles';
import { ArrowDown, MessageSquareCode, ShieldAlert, Sparkles, Heart } from 'lucide-react';
import { sounds } from '@/lib/soundUtils';

interface ChatWindowProps {
  myIdentity: SenderIdentity;
}

export default function ChatWindow({ myIdentity }: ChatWindowProps) {
  const partnerIdentity = getPartnerIdentity(myIdentity);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Presence state
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadCountBelow, setUnreadCountBelow] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const particlesRef = useRef<FloatingParticlesRef | null>(null);

  // Fetch initial message history (last 200 messages for lifetime instant load speed)
  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        // If table doesn't exist yet or RLS blocked, show informative prompt
        console.error('Error fetching messages:', error);
        if (error.message.includes('relation "public.messages" does not exist')) {
          setErrorMsg('Supabase table `messages` not created yet. Please run the SQL migration script.');
        }
      } else if (data) {
        setMessages(data as Message[]);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark unread partner messages as read
  const triggerMarkAsRead = useCallback(async () => {
    if (document.visibilityState === 'visible') {
      await markMessagesAsRead(partnerIdentity);
      // Also update local state optimistically
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === partnerIdentity && !msg.read_at && !msg.deleted
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        )
      );
    }
  }, [partnerIdentity]);

  // Scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 160;
    setShowScrollBottom(isUp);
    if (!isUp) {
      setUnreadCountBelow(0);
      triggerMarkAsRead();
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setShowScrollBottom(false);
    setUnreadCountBelow(0);
  };

  // Realtime & Presence setup
  useEffect(() => {
    fetchMessages();

    // 1. Subscribe to Postgres changes on `messages` table
    const roomChannel = supabase.channel('prickle-room-1on1', {
      config: {
        presence: { key: myIdentity },
      },
    });

    roomChannel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const hasOptimistic = prev.some(
              (m) => m.id.startsWith('temp-') && m.sender === newMsg.sender && (m.content === newMsg.content || m.media_url === newMsg.media_url)
            );
            if (hasOptimistic) {
              return prev.map((m) =>
                m.id.startsWith('temp-') && m.sender === newMsg.sender && (m.content === newMsg.content || m.media_url === newMsg.media_url)
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });

          // Check if we should auto-scroll or increment unread indicator
          if (newMsg.sender === myIdentity) {
            setTimeout(() => scrollToBottom(true), 10);
          } else {
            sounds.playChime();
            particlesRef.current?.triggerBurst(window.innerWidth / 2, 200, ['💌', '💖', '✨', '💕']);
            if (document.visibilityState === 'visible' && !showScrollBottom) {
              setTimeout(() => {
                scrollToBottom(true);
                triggerMarkAsRead();
              }, 50);
            } else {
              setUnreadCountBelow((cnt) => cnt + 1);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedMsg = payload.old as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === deletedMsg.id ? { ...m, deleted: true } : m))
          );
        }
      )
      // 2. Presence events
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState();
        const partnerStateList = state[partnerIdentity] as unknown as PresencePayload[] | undefined;
        if (partnerStateList && partnerStateList.length > 0) {
          const latest = partnerStateList[partnerStateList.length - 1];
          setPartnerOnline(latest.status === 'online');
          setPartnerTyping(latest.typing);
          setPartnerLastSeen(latest.last_seen);
        } else {
          setPartnerOnline(false);
          setPartnerTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === partnerIdentity && newPresences.length > 0) {
          const p = newPresences[0] as unknown as PresencePayload;
          setPartnerOnline(p.status === 'online');
          setPartnerTyping(p.typing);
          setPartnerLastSeen(p.last_seen);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === partnerIdentity) {
          setPartnerOnline(false);
          setPartnerTyping(false);
          setPartnerLastSeen(new Date().toISOString());
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track self
          await roomChannel.track({
            user: myIdentity,
            status: 'online',
            typing: false,
            last_seen: new Date().toISOString(),
          } as PresencePayload);
        }
      });

    channelRef.current = roomChannel;

    // Visibility & Focus listener for read receipts
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerMarkAsRead();
        roomChannel.track({
          user: myIdentity,
          status: 'online',
          typing: false,
          last_seen: new Date().toISOString(),
        });
      } else {
        roomChannel.track({
          user: myIdentity,
          status: 'offline',
          typing: false,
          last_seen: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', triggerMarkAsRead);

    // Initial scroll after load
    setTimeout(() => scrollToBottom(false), 300);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', triggerMarkAsRead);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchMessages, myIdentity, partnerIdentity, triggerMarkAsRead]);

  // Handle outgoing typing presence change
  const handleTypingChange = (isTyping: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      user: myIdentity,
      status: 'online',
      typing: isTyping,
      last_seen: new Date().toISOString(),
    });
  };

  const handleSendMessage = async (content: string | null, mediaUrl: string | null, mediaType: any) => {
    sounds.playPop();
    particlesRef.current?.triggerBurst(window.innerWidth / 2, window.innerHeight - 150, ['💖', '✨', '💕', '🦔']);
    
    // 0ms Optimistic UI Insertion
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender: myIdentity,
      content: content || '',
      media_url: mediaUrl,
      media_type: mediaType,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted: false,
      read_at: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 10);

    await sendMessage(myIdentity, content, mediaUrl, mediaType);
  };

  const handleSendSticker = async (text: string) => {
    sounds.playPop();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender: myIdentity,
      content: text,
      media_url: null,
      media_type: null,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted: false,
      read_at: null,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 10);

    await sendMessage(myIdentity, text, null, null);
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    // 0ms Optimistic Edit
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m))
    );
    await editMessage(id, newContent);
  };

  const handleDeleteMessage = async (id: string) => {
    sounds.playPop();
    // 0ms Optimistic Delete
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, deleted: true } : m)));
    await deleteMessage(id);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-3xl mx-auto bg-white dark:bg-[#0e1621] shadow-2xl relative border-x border-slate-200/60 dark:border-slate-800/80 transition-colors">
      {/* Interactive Floating Particles Layer */}
      <FloatingParticles ref={particlesRef} />

      {/* Header */}
      <Header
        myIdentity={myIdentity}
        partnerIdentity={partnerIdentity}
        partnerOnline={partnerOnline}
        partnerTyping={partnerTyping}
        partnerLastSeen={partnerLastSeen}
        onTriggerBurst={(x, y) => {
          particlesRef.current?.triggerBurst(x, y, ['💖', '✨', '💕', '🦔', '🥰']);
        }}
      />

      {/* Message List Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 chat-wallpaper relative flex flex-col"
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading your Prickle thread...</p>
          </div>
        ) : errorMsg ? (
          <div className="my-auto max-w-md mx-auto p-5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center space-y-2">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-200">Supabase Setup Needed</h3>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{errorMsg}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto text-center space-y-3 p-6 max-w-sm mx-auto bg-white/80 dark:bg-[#182533]/80 backdrop-blur-md rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs animate-pop-bounce">
            <div
              onClick={(e) => {
                sounds.playSquish();
                particlesRef.current?.triggerBurst(e.clientX, e.clientY, ['💖', '✨', '🦔', '🐾', '🥰']);
              }}
              title="Tap Prickle for love! 🦔💖"
              className="w-16 h-16 bg-gradient-to-br from-[#2AABEE] via-[#9B7AD5] to-[#E56B88] rounded-3xl mx-auto flex items-center justify-center text-white text-3xl shadow-lg cursor-pointer animate-wiggle hover:scale-110 active:scale-95 transition-transform"
            >
              🦔
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
              <span>Only for Puchki & Puchu</span>
              <Heart className="w-4 h-4 text-[#E56B88] fill-[#E56B88] animate-heartbeat" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Welcome to your private one-to-one messaging sanctuary! Say hello below or tap one of our quick animated stickers to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-1 mt-auto">
            {messages.map((msg, index) => {
              const isSelf = msg.sender === myIdentity;
              const prevMsg = index > 0 ? messages[index - 1] : undefined;
              const nextMsg = index < messages.length - 1 ? messages[index + 1] : undefined;

              const isGrouped = canGroupConsecutiveMessages(prevMsg, msg);
              const isLastInGroup = !canGroupConsecutiveMessages(msg, nextMsg || ({} as Message));

              // Check if we need a sticky date divider above this message
              const showDateHeader = !prevMsg || !checkSameDay(prevMsg.created_at, msg.created_at);

              return (
                <React.Fragment key={msg.id}>
                  {showDateHeader && (
                    <div className="sticky top-2 z-10 flex justify-center my-3 pointer-events-none animate-msg">
                      <span className="bg-slate-800/40 dark:bg-slate-900/60 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-xs">
                        {formatStickyHeaderDate(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <MessageBubble
                    message={msg}
                    isSelf={isSelf}
                    isGrouped={isGrouped}
                    isLastInGroup={isLastInGroup}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                  />
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Partner Typing Indicator Bubble */}
        {partnerTyping && <TypingIndicator partnerIdentity={partnerIdentity} />}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Floating Scroll to bottom pill button */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
          className="absolute bottom-28 right-5 z-20 bg-white dark:bg-[#182533] text-slate-700 dark:text-slate-200 p-2.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center animate-bounce"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-5 h-5 text-[#2AABEE]" />
          {unreadCountBelow > 0 && (
            <span className="absolute -top-1.5 -left-1.5 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
              {unreadCountBelow}
            </span>
          )}
        </button>
      )}

      {/* Quick Stickers Bar */}
      <QuickStickers
        onSendSticker={handleSendSticker}
        onTriggerBurst={(emojis) => {
          particlesRef.current?.triggerBurst(window.innerWidth / 2, window.innerHeight - 150, emojis);
        }}
      />

      {/* Bottom Composer */}
      <Composer
        myIdentity={myIdentity}
        onSendMessage={handleSendMessage}
        onTypingChange={handleTypingChange}
      />
    </div>
  );
}
