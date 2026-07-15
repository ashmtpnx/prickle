'use client';

import React from 'react';
import { USER_PROFILES, SenderIdentity } from '@/lib/types';

interface TypingIndicatorProps {
  partnerIdentity: SenderIdentity;
}

export default function TypingIndicator({ partnerIdentity }: TypingIndicatorProps) {
  const partnerProfile = USER_PROFILES[partnerIdentity];

  return (
    <div className="flex justify-start w-full mt-2 animate-msg">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#182533] rounded-2xl rounded-bl-xs shadow-xs border border-slate-100 dark:border-slate-800/60">
        <span className="text-sm select-none">{partnerProfile?.emoji || '💬'}</span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {partnerProfile?.shortName || partnerIdentity} is typing
        </span>
        <div className="flex items-center space-x-1 ml-0.5">
          <span className="w-1.5 h-1.5 bg-[#2AABEE] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-[#2AABEE] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-[#2AABEE] rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
