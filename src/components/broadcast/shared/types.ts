// 공통 타입 정의: 방송 세션, 캐릭터, 모션, 채팅 등

export type SessionStatus = 'idle' | 'start' | 'end';

export interface Character {
  id: string;
  name: string;
  description?: string;
  image_url?: string | null;
  status?: string;
}

export interface MotionFile {
  name: string;
  path: string;
  url: string;
  tag: string; // 'neutral' | 'talking' | 'reaction' | ...
}

export interface GiftEvent {
  motion_tag: string;
  count: number;
}

export interface ChatMessage {
  type: 'chat' | 'gift' | 'like';
  user_nickname?: string;
  content?: string;
  gift_name?: string;
  gift_coin?: number;
  repeat_count?: number;
  motion_tag?: string;
  timestamp?: number;
}
