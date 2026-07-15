'use client';

import React, { useState, useEffect } from 'react';
import { USER_PROFILES, SenderIdentity } from '@/lib/types';
import { formatLastSeen } from '@/lib/dateUtils';
import { Moon, Sun, LogOut, ShieldCheck, Sparkles, Bell, BellOff, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { sounds } from '@/lib/soundUtils';

interface HeaderProps {
  myIdentity: SenderIdentity;
  partnerIdentity: SenderIdentity;
  partnerOnline: boolean;
  partnerTyping: boolean;
  partnerLastSeen: string | null;
  onTriggerBurst?: (x?: number, y?: number) => void;
}

export default function Header({
  myIdentity,
  partnerIdentity,
  partnerOnline,
  partnerTyping,
  partnerLastSeen,
  onTriggerBurst,
}: HeaderProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const partnerProfile = USER_PROFILES[partnerIdentity];
  const myProfile = USER_PROFILES[myIdentity];

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
    setSoundEnabled(sounds.isEnabled());
  }, []);

  const toggleTheme = () => {
    sounds.playPop();
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const toggleSound = () => {
    const newState = sounds.toggle();
    setSoundEnabled(newState);
  };

  const handleLogout = async () => {
    sounds.playPop();
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('prickle_identity');
    router.push('/login');
  };

  const handleAvatarTap = (e: React.MouseEvent) => {
    sounds.playSquish();
    if (onTriggerBurst) {
      onTriggerBurst(e.clientX, e.clientY);
    }
  };

  return (
    <header className="glass-header sticky top-0 z-30 px-4 py-3 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center justify-between transition-colors duration-200">
      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
        {/* Partner Avatar with playful wiggle on hover & tap */}
        <div
          onClick={handleAvatarTap}
          title="Tap for love burst! 💖"
          className={`relative w-11 h-11 rounded-full flex items-center justify-center shadow-inner shrink-0 cursor-pointer animate-wiggle transition-transform active:scale-90 ${partnerProfile?.avatarBg || 'bg-sky-500'}`}
        >
          <span className="text-xl select-none filter drop-shadow-sm">{partnerProfile?.emoji || '💬'}</span>
          {/* Online badge */}
          {partnerOnline && !partnerTyping && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#17212b] rounded-full shadow-xs animate-pulse" />
          )}
        </div>

        {/* Name & Live Status */}
        <div className="flex flex-col min-w-0 cursor-pointer" onClick={handleAvatarTap}>
          <div className="flex items-center space-x-1.5">
            <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate tracking-tight hover:text-[#2AABEE] transition-colors">
              {partnerProfile?.name || partnerIdentity}
            </h1>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700/60 shrink-0 flex items-center gap-0.5 animate-pop-bounce">
              <Sparkles className="w-2.5 h-2.5 text-[#2AABEE] animate-sparkle" /> Prickle
            </span>
          </div>

          <div className="text-xs truncate transition-all duration-200">
            {partnerTyping ? (
              <span className="text-[#2AABEE] font-medium flex items-center gap-1 animate-pulse">
                typing<span className="inline-flex tracking-widest">...</span>
              </span>
            ) : partnerOnline ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" /> Online
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                {formatLastSeen(partnerLastSeen, false, false)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center space-x-1 shrink-0 ml-2">
        {/* Current user badge indicator */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full text-xs text-slate-600 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60 mr-1 animate-pop-bounce">
          <span className="w-2 h-2 rounded-full bg-[#2AABEE] animate-pulse" />
          You: <span className="font-semibold text-slate-800 dark:text-slate-100">{myProfile?.shortName}</span>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          aria-label="Toggle sound effects"
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
          title={soundEnabled ? 'Sound Effects: ON (Tap to mute)' : 'Sound Effects: OFF (Tap to enable)'}
        >
          {soundEnabled ? <Bell className="w-5 h-5 text-[#2AABEE]" /> : <BellOff className="w-5 h-5 text-slate-400" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle light/dark theme"
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400 animate-sparkle" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          aria-label="Lock / Logout"
          className="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors duration-150 cursor-pointer"
          title="Lock / Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
