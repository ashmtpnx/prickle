import { format, isToday, isYesterday, differenceInMilliseconds, parseISO } from 'date-fns';
import { Message } from './types';

export function formatMessageTime(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    return format(date, 'HH:mm');
  } catch {
    return '';
  }
}

export function formatStickyHeaderDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  } catch {
    return dateString;
  }
}

export function formatLastSeen(lastSeen: string | null | undefined, isOnline: boolean, isTyping: boolean): string {
  if (isTyping) return 'typing...';
  if (isOnline) return 'Online';
  if (!lastSeen) return 'Offline';

  try {
    const date = parseISO(lastSeen);
    const timeStr = format(date, 'HH:mm');
    if (isToday(date)) {
      return `last seen today at ${timeStr}`;
    }
    if (isYesterday(date)) {
      return `last seen yesterday at ${timeStr}`;
    }
    return `last seen on ${format(date, 'MMM d, yyyy')} at ${timeStr}`;
  } catch {
    return 'Offline';
  }
}

export function checkSameDay(dateStr1: string, dateStr2: string): boolean {
  if (!dateStr1 || !dateStr2) return false;
  try {
    const d1 = parseISO(dateStr1);
    const d2 = parseISO(dateStr2);
    return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
  } catch {
    return false;
  }
}

export function canGroupConsecutiveMessages(prevMsg: Message | undefined, currMsg: Message): boolean {
  if (!prevMsg) return false;
  if (prevMsg.sender !== currMsg.sender) return false;
  if (prevMsg.deleted || currMsg.deleted) return false;
  if (!checkSameDay(prevMsg.created_at, currMsg.created_at)) return false;

  try {
    const d1 = parseISO(prevMsg.created_at);
    const d2 = parseISO(currMsg.created_at);
    const diffMs = Math.abs(differenceInMilliseconds(d2, d1));
    // Group messages from same sender if sent within 2 minutes
    return diffMs <= 120_000;
  } catch {
    return false;
  }
}
