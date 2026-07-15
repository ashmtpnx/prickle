'use client';

import React from 'react';
import { sounds } from '@/lib/soundUtils';

interface QuickStickersProps {
  onSendSticker: (content: string) => Promise<void>;
  onTriggerBurst?: (emojis: string[]) => void;
}

const STICKERS = [
  { label: '💖 Hugs!', text: '💖 *Sends a giant warm hug!* 🤗', emojis: ['💖', '🤗', '💕', '✨'] },
  { label: '👉🦔 Boop!', text: '👉🦔 *Boops Prickle on the nose!*', emojis: ['🦔', '👉', '✨', '🐾'] },
  { label: '✨ Sparkle Attack!', text: '✨💖 *SPARKLE ATTACK!* 💖✨', emojis: ['✨', '💖', '🌟', '💫'] },
  { label: '☕ Tea Time?', text: '☕ *Wants to get chai/tea together!* 🫖', emojis: ['☕', '🫖', '🍪', '✨'] },
  { label: '👀 Miss you!', text: '👀 *Thinking of you and sending love!* 🥰', emojis: ['👀', '🥰', '💖', '💕'] },
  { label: '😴 Sleepy Prickle', text: '😴 *Patience... Prickle is getting sleepy!* 🌙', emojis: ['😴', '🌙', '💤', '🦔'] },
];

export default function QuickStickers({ onSendSticker, onTriggerBurst }: QuickStickersProps) {
  const handleClick = async (sticker: typeof STICKERS[0]) => {
    sounds.playPop();
    if (onTriggerBurst) {
      onTriggerBurst(sticker.emojis);
    }
    await onSendSticker(sticker.text);
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-1.5 bg-slate-50/90 dark:bg-[#121c26]/90 border-t border-slate-200/60 dark:border-slate-800/60 no-scrollbar select-none">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
        <span className="animate-bounce">⚡</span> Quick:
      </span>
      {STICKERS.map((sticker, idx) => (
        <button
          key={idx}
          onClick={() => handleClick(sticker)}
          className="px-2.5 py-1 rounded-full bg-white dark:bg-[#182533] hover:bg-[#2AABEE]/10 dark:hover:bg-[#2AABEE]/20 text-slate-700 dark:text-slate-200 hover:text-[#2AABEE] dark:hover:text-[#2AABEE] border border-slate-200/80 dark:border-slate-700/80 text-xs font-semibold shadow-2xs hover:shadow-md transition-all duration-150 transform hover:scale-105 active:scale-95 shrink-0 cursor-pointer animate-pop-bounce"
          style={{ animationDelay: `${idx * 0.05}s` }}
          title={`Click to send "${sticker.label}" sticker immediately`}
        >
          {sticker.label}
        </button>
      ))}
    </div>
  );
}
