'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message, USER_PROFILES } from '@/lib/types';
import { formatMessageTime } from '@/lib/dateUtils';
import { Check, CheckCheck, Edit2, Trash2, Play, Pause, FileText, Download, X } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  isGrouped: boolean;
  isLastInGroup: boolean;
  onEdit: (id: string, newContent: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function MessageBubble({
  message,
  isSelf,
  isGrouped,
  isLastInGroup,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (message.media_type === 'voice' && message.media_url) {
      const audio = new Audio(message.media_url);
      audioRef.current = audio;

      const handleLoadedMetadata = () => {
        setAudioDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        if (audio.duration) {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      const handleEnded = () => {
        setIsPlayingVoice(false);
        setAudioProgress(0);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.pause();
      };
    }
  }, [message.media_type, message.media_url]);

  const toggleVoicePlayback = () => {
    if (!audioRef.current) return;
    if (isPlayingVoice) {
      audioRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioRef.current.play();
      setIsPlayingVoice(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    await onEdit(message.id, editContent);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content || '');
    }
  };

  const formatAudioTime = (seconds: number | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (message.deleted) {
    return (
      <div className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-2.5'} animate-msg`}>
        <div
          className={`max-w-[78%] sm:max-w-[65%] px-3.5 py-2 rounded-2xl italic text-xs ${
            isSelf
              ? 'bg-slate-200/60 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
              : 'bg-white/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/50'
          }`}
        >
          <span>🗑️ This message was deleted</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`group flex w-full ${isSelf ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-2.5'} animate-msg`}>
        <div
          className={`relative max-w-[84%] sm:max-w-[68%] px-3.5 py-2 transition-all duration-150 ${
            isSelf
              ? 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white shadow-xs'
              : 'bg-white dark:bg-[#182533] text-slate-800 dark:text-slate-100 shadow-xs border border-slate-100 dark:border-slate-800/60'
          } ${
            isSelf
              ? isGrouped
                ? 'rounded-l-2xl rounded-tr-md rounded-br-2xl'
                : 'rounded-2xl rounded-br-xs'
              : isGrouped
                ? 'rounded-r-2xl rounded-tl-md rounded-bl-2xl'
                : 'rounded-2xl rounded-bl-xs'
          }`}
        >
          {/* Action buttons on hover (self only) */}
          {isSelf && !isEditing && (
            <div className="absolute -top-3.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-slate-800/90 dark:bg-slate-700 text-white rounded-full px-2 py-0.5 shadow-md z-10 text-[11px]">
              {message.content && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="hover:text-[#2AABEE] flex items-center gap-0.5 cursor-pointer"
                  title="Edit message"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => onDelete(message.id)}
                className="hover:text-rose-400 flex items-center gap-0.5 cursor-pointer ml-1"
                title="Delete message"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Media Rendering */}
          {message.media_url && (
            <div className="mb-1.5 -mx-1 -mt-1 rounded-xl overflow-hidden">
              {message.media_type === 'image' && (
                <img
                  src={message.media_url}
                  alt="Attachment"
                  onClick={() => setShowLightbox(true)}
                  className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                />
              )}

              {message.media_type === 'file' && (
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    isSelf
                      ? 'bg-white/15 hover:bg-white/25 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelf ? 'bg-white/20' : 'bg-[#2AABEE]/10 text-[#2AABEE]'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">File Attachment</p>
                    <p className="text-[10px] opacity-75 truncate">Click to download</p>
                  </div>
                  <Download className="w-4 h-4 opacity-80 shrink-0" />
                </a>
              )}

              {message.media_type === 'voice' && (
                <div
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    isSelf ? 'bg-white/15 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <button
                    onClick={toggleVoicePlayback}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs cursor-pointer ${
                      isSelf ? 'bg-white text-[#2AABEE]' : 'bg-[#2AABEE] text-white'
                    }`}
                  >
                    {isPlayingVoice ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 flex flex-col justify-center min-w-[120px]">
                    <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full transition-all duration-150 ${
                          isSelf ? 'bg-white' : 'bg-[#2AABEE]'
                        }`}
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] opacity-80 font-mono">
                      <span>{formatAudioTime(audioRef.current?.currentTime || 0)}</span>
                      <span>{formatAudioTime(audioDuration)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Text Content / Editing Form */}
          {isEditing ? (
            <div className="mt-1 flex flex-col gap-1.5 min-w-[200px]">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full text-sm p-2 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-hidden focus:ring-1 focus:ring-white resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 rounded-md hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-0.5 bg-white text-[#2AABEE] font-semibold rounded-md shadow-xs hover:bg-slate-100 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            message.content && (
              <div className="text-sm sm:text-[14.5px] leading-relaxed break-words whitespace-pre-wrap pr-12 pb-1">
                {message.content}
              </div>
            )
          )}

          {/* Timestamp & Read Receipts tucked in bottom right */}
          <div
            className={`absolute bottom-1.5 right-2.5 flex items-center gap-1 text-[10.5px] font-medium select-none ${
              isSelf ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {message.edited_at && <span className="italic opacity-80">edited</span>}
            <span>{formatMessageTime(message.created_at)}</span>

            {/* Read receipts for self messages */}
            {isSelf && (
              <span title={message.read_at ? 'Read' : 'Sent'} className="flex items-center ml-0.5">
                {message.read_at ? (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-100 drop-shadow-xs" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-white/70" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen Lightbox Modal */}
      {showLightbox && message.media_url && (
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={message.media_url}
            alt="Full Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
