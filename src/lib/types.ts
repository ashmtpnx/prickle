export type SenderIdentity = 'puchki' | 'puchu';

export type MediaType = 'image' | 'file' | 'voice' | null;

export interface Message {
  id: string;
  sender: SenderIdentity;
  content: string | null;
  media_url: string | null;
  media_type: MediaType;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  read_at: string | null;
}

export interface PresencePayload {
  user: SenderIdentity;
  status: 'online' | 'offline';
  typing: boolean;
  last_seen: string;
}

export interface UserProfile {
  id: SenderIdentity;
  name: string;
  shortName: string;
  emoji: string;
  avatarBg: string;
  avatarText: string;
  accentColor: string;
  bubbleClassSelf: string;
  bubbleClassPartner: string;
}

export const USER_PROFILES: Record<SenderIdentity, UserProfile> = {
  puchki: {
    id: 'puchki',
    name: 'Puchki ✨',
    shortName: 'Puchki',
    emoji: '✨',
    avatarBg: 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9]',
    avatarText: 'text-white font-semibold',
    accentColor: '#2AABEE',
    bubbleClassSelf: 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white rounded-2xl shadow-sm',
    bubbleClassPartner: 'bg-white dark:bg-[#182533] text-slate-800 dark:text-slate-100 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60',
  },
  puchu: {
    id: 'puchu',
    name: 'Puchu 🦔',
    shortName: 'Puchu',
    emoji: '🦔',
    avatarBg: 'bg-gradient-to-br from-[#E56B88] to-[#D4506F]',
    avatarText: 'text-white font-semibold',
    accentColor: '#E56B88',
    bubbleClassSelf: 'bg-gradient-to-br from-[#2AABEE] to-[#229ED9] text-white rounded-2xl shadow-sm',
    bubbleClassPartner: 'bg-white dark:bg-[#182533] text-slate-800 dark:text-slate-100 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60',
  },
};

export function getPartnerIdentity(myIdentity: SenderIdentity): SenderIdentity {
  return myIdentity === 'puchki' ? 'puchu' : 'puchki';
}
