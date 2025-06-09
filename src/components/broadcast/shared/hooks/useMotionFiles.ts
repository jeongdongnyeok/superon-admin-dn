import { useState, useEffect, useCallback, useRef } from 'react';
import { MotionFile, GiftEvent } from '../types';

export const useMotionFiles = (characterId: string | null) => {
  const [motionFiles, setMotionFiles] = useState<MotionFile[]>([]);
  const [selectedMotion, setSelectedMotion] = useState<string>('');
  const [isGiftMotion, setIsGiftMotion] = useState(false);
  const giftQueue = useRef<GiftEvent[]>([]);

  // 캐릭터 변경 시 모션 파일 로딩
  useEffect(() => {
    if (!characterId) {
      setMotionFiles([]);
      setSelectedMotion('');
      return;
    }
    fetch(`/backend/${characterId}/motion/list.json`)
      .then(res => res.json())
      .then((data: MotionFile[]) => {
        setMotionFiles(data);
        const neutral = data.find(f => f.tag === 'neutral');
        setSelectedMotion(neutral ? neutral.url : '');
      });
  }, [characterId]);

  // 모션 변경
  const setMotionByTag = useCallback((tag: string) => {
    const file = motionFiles.find(f => f.tag === tag);
    if (file) {
      setSelectedMotion(file.url);
      setIsGiftMotion(tag !== 'neutral');
    }
  }, [motionFiles]);

  // gift 큐 관리 및 재생 로직
  const playNextGift = useCallback(() => {
    if (giftQueue.current.length > 0) {
      const next = giftQueue.current.shift();
      if (next) setMotionByTag(next.motion_tag);
    } else {
      setMotionByTag('neutral');
    }
  }, [setMotionByTag]);

  return {
    motionFiles,
    selectedMotion,
    setSelectedMotion,
    isGiftMotion,
    setIsGiftMotion,
    setMotionByTag,
    giftQueue,
    playNextGift,
  };
};
