'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send, X, Trash2, Loader2, Image as ImageIcon, File } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SenderIdentity, MediaType } from '@/lib/types';

interface ComposerProps {
  myIdentity: SenderIdentity;
  onSendMessage: (content: string | null, mediaUrl: string | null, mediaType: MediaType) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
}

export default function Composer({
  myIdentity,
  onSendMessage,
  onTypingChange,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up file preview URL
  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Handle auto-resizing textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }

    // Trigger typing presence
    onTypingChange(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
    }, 2000);
  };

  // Handle File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    } else {
      setFilePreviewUrl(null);
    }
  };

  const clearAttachment = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload file to Supabase Storage
  const uploadToStorage = async (fileOrBlob: Blob | File, filename: string): Promise<string | null> => {
    try {
      const filePath = `${myIdentity}/${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, fileOrBlob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(filePath);
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Unexpected error during upload:', err);
      return null;
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopAndDiscardRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  };

  const stopAndSendVoiceNote = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      if (audioBlob.size < 1000) {
        // Too short, ignore
        return;
      }

      setIsSending(true);
      const publicUrl = await uploadToStorage(audioBlob, `voice_${Date.now()}.webm`);
      if (publicUrl) {
        await onSendMessage(null, publicUrl, 'voice');
      } else {
        alert('Failed to upload voice note.');
      }
      setIsSending(false);
    };

    mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Main Send Handler
  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || isSending) return;

    setIsSending(true);
    onTypingChange(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let mediaUrl: string | null = null;
    let mediaType: MediaType = null;

    if (selectedFile) {
      mediaUrl = await uploadToStorage(selectedFile, selectedFile.name);
      if (!mediaUrl) {
        alert('Failed to upload attachment. Please try again.');
        setIsSending(false);
        return;
      }
      mediaType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
    }

    const contentToSend = text.trim() ? text.trim() : null;
    await onSendMessage(contentToSend, mediaUrl, mediaType);

    // Reset input
    setText('');
    clearAttachment();
    setIsSending(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = text.trim().length > 0 || selectedFile !== null;

  return (
    <div className="glass-header sticky bottom-0 z-30 px-3 py-2 border-t border-slate-200/80 dark:border-slate-800/80 shadow-lg">
      {/* Attachment Preview Card */}
      {selectedFile && (
        <div className="mb-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700 animate-msg">
          <div className="flex items-center space-x-3 min-w-0">
            {filePreviewUrl ? (
              <img src={filePreviewUrl} alt="Thumbnail" className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#2AABEE]/10 text-[#2AABEE] flex items-center justify-center">
                <File className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button
            onClick={clearAttachment}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Voice Recording Active State */}
      {isRecording ? (
        <div className="flex items-center justify-between py-1.5 px-2 bg-rose-500/10 dark:bg-rose-950/30 rounded-2xl border border-rose-500/20 animate-msg">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 bg-rose-500 rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 font-mono">
              {formatRecordingTime(recordingTime)}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Recording voice note...</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={stopAndDiscardRecording}
              className="p-2 rounded-full text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Discard recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={stopAndSendVoiceNote}
              disabled={isSending}
              className="px-4 py-1.5 bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-semibold rounded-full shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Composer Bar */
        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          {/* Attachment button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            aria-label="Attach file or photo"
            className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-[#2AABEE] dark:hover:text-[#2AABEE] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 mb-0.5"
            title="Attach file or photo"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Auto-resizing textarea */}
          <div className="flex-1 bg-white dark:bg-[#17212b] rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-inner px-4 py-2 focus-within:border-[#2AABEE] focus-within:ring-1 focus-within:ring-[#2AABEE] transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder={`Message as ${myIdentity === 'puchki' ? 'Puchki ✨' : 'Puchu 🦔'}...`}
              rows={1}
              className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden resize-none leading-relaxed max-h-32"
            />
          </div>

          {/* Morphing Send / Voice button */}
          {hasContent ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              aria-label="Send message"
              className="p-2.5 rounded-full bg-gradient-to-tr from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1b8fc9] text-white shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-95 cursor-pointer shrink-0 mb-0.5 flex items-center justify-center"
              title="Send message (Enter)"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isSending}
              aria-label="Record voice note"
              className="p-2.5 rounded-full text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0 mb-0.5"
              title="Click to record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
