'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SenderIdentity, USER_PROFILES } from '@/lib/types';
import { Lock, Eye, EyeOff, Sparkles, Heart, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedIdentity, setSelectedIdentity] = useState<SenderIdentity | null>(null);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdentity) {
      setError('Please choose whether you are Puchki or Puchu!');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter your shared Prickle PIN!');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, identity: selectedIdentity }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Incorrect PIN. Try again!');
        setLoading(false);
        return;
      }

      // Save identity locally for client components
      localStorage.setItem('prickle_identity', selectedIdentity);
      router.push('/chat');
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 chat-wallpaper relative overflow-hidden transition-colors">
      {/* Decorative floating blurred orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-[#2AABEE]/20 rounded-full blur-3xl pointer-events-none animate-pulse-soft" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-[#E56B88]/20 rounded-full blur-3xl pointer-events-none animate-pulse-soft [animation-delay:-0.75s]" />

      <div className="w-full max-w-md bg-white/90 dark:bg-[#17212b]/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 z-10 animate-msg">
        {/* Prickle Hedgehog Branding Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#2AABEE] via-[#9B7AD5] to-[#E56B88] shadow-lg mb-1 transform hover:scale-105 transition-transform duration-300">
            <span className="text-4xl select-none filter drop-shadow-md">🦔</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#2AABEE] to-[#E56B88] bg-clip-text text-transparent">
            PRICKLE
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <span>Only for Puchki and Puchu</span>
            <Heart className="w-3.5 h-3.5 text-[#E56B88] fill-[#E56B88]" />
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider uppercase pt-0.5">
            One-to-One Private Messaging
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Step 1: Identity Picker */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
              1. Who are you?
            </label>
            <div className="grid grid-cols-2 gap-3.5">
              {/* Puchki Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedIdentity('puchki');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                  selectedIdentity === 'puchki'
                    ? 'border-[#2AABEE] bg-[#2AABEE]/10 dark:bg-[#2AABEE]/20 shadow-md scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2AABEE] to-[#229ED9] flex items-center justify-center text-xl shadow-inner mb-2">
                  ✨
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Puchki</span>
                <span className="text-[10px] text-[#2AABEE] font-medium mt-0.5">
                  {selectedIdentity === 'puchki' ? '✓ Selected' : 'Tap to select'}
                </span>
              </button>

              {/* Puchu Card */}
              <button
                type="button"
                onClick={() => {
                  setSelectedIdentity('puchu');
                  setError(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${
                  selectedIdentity === 'puchu'
                    ? 'border-[#E56B88] bg-[#E56B88]/10 dark:bg-[#E56B88]/20 shadow-md scale-[1.02]'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E56B88] to-[#D4506F] flex items-center justify-center text-xl shadow-inner mb-2">
                  🦔
                </div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100">Puchu</span>
                <span className="text-[10px] text-[#E56B88] font-medium mt-0.5">
                  {selectedIdentity === 'puchu' ? '✓ Selected' : 'Tap to select'}
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: PIN Entry */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide uppercase">
              2. Shared Secret PIN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                placeholder="Enter Prickle PIN..."
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:border-[#2AABEE] focus:ring-2 focus:ring-[#2AABEE]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-1">
              Hint: Default PIN is <code className="bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">PuchuPuchki2026!</code> unless changed in <code className="bg-slate-200/80 dark:bg-slate-800 px-1 py-0.5 rounded text-xs">.env.local</code>.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-600 dark:text-rose-300 text-xs font-medium text-center animate-shake">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#2AABEE] to-[#E56B88] hover:from-[#229ED9] hover:to-[#D4506F] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Enter Prickle Thread</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Private 1-on-1 End-to-End Style PWA</span>
        </div>
      </div>
    </div>
  );
}
