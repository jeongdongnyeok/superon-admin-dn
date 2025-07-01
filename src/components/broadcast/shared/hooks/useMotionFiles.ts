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
      console.log('[useMotionFiles] characterId가 없어서 초기화');
      setMotionFiles([]);
      setSelectedMotion('');
      return;
    }

    const fetchUrl = `/backend/${characterId}/motion/list.json`;
    console.log('[useMotionFiles] characterId:', characterId, 'fetchUrl:', fetchUrl);
    
    fetch(fetchUrl)
      .then(res => {
        console.log('[useMotionFiles] fetch response status:', res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data: unknown) => {
        console.log('[useMotionFiles] 원본 데이터:', data);
        
        // list.json의 구조에 맞게 수정: { "files": [...] } 형태를 처리
        let filesArray: MotionFile[] = [];
        function hasFilesProp(obj: unknown): obj is { files: MotionFile[] } {
          return (
            typeof obj === 'object' &&
            obj !== null &&
            'files' in obj &&
            Array.isArray((obj as { files?: unknown }).files)
          );
        }
        if (hasFilesProp(data)) {
          filesArray = data.files;
        } else if (Array.isArray(data)) {
          filesArray = data as MotionFile[];
        } else {
          console.warn('[useMotionFiles] 예상하지 못한 데이터 구조:', data);
          filesArray = [];
        }

        console.log('[useMotionFiles] 파싱된 파일 배열:', filesArray);

        // URL 정규화 및 태그 보정
        const normalized = filesArray.map((f: MotionFile) => {
          const normalizedFile = { ...f };
          
          // URL이 이미 올바른 형태인지 확인
          if (!f.url || !f.url.startsWith('/backend/')) {
            const fileName = f.name || f.path?.replace(/^.*[\\/]/, '') || '';
            normalizedFile.url = `/backend/${characterId}/motion/${encodeURIComponent(fileName)}`;
          }
          
          // 태그가 비어있는 경우 파일명 기반으로 추론
          if (!f.tag || f.tag.trim() === '') {
            const fileName = f.name || '';
            if (fileName.includes('neutral_')) {
              normalizedFile.tag = 'neutral';
            } else if (fileName.includes('talking_')) {
              normalizedFile.tag = 'talking';
            } else if (fileName.includes('gift_level_')) {
              const match = fileName.match(/gift_level_(\d+)/);
              if (match) {
                normalizedFile.tag = `gift_level_${match[1]}`;
              }
            } else if (fileName.includes('emotion_positive_')) {
              normalizedFile.tag = 'emotion_positive';
            } else if (fileName.includes('emotion_negative_')) {
              normalizedFile.tag = 'emotion_negative';
            } else if (fileName.includes('keyword_')) {
              const keywordMatch = fileName.match(/keyword_([^_]+)/);
              if (keywordMatch) {
                normalizedFile.tag = `keyword_${keywordMatch[1]}`;
              }
            }
          }
          
          return normalizedFile;
        });

        console.log('[useMotionFiles] 정규화된 파일들:', normalized);
        setMotionFiles(normalized);

        // 기본 모션 설정 (neutral 태그를 가진 첫 번째 파일)
        const neutralFiles = normalized.filter((f: MotionFile) => f.tag === 'neutral');
        if (neutralFiles.length > 0) {
          console.log('[useMotionFiles] neutral 파일 선택:', neutralFiles[0].url);
          setSelectedMotion(neutralFiles[0].url);
        } else if (normalized.length > 0) {
          console.log('[useMotionFiles] neutral 파일이 없어서 첫 번째 파일 선택:', normalized[0].url);
          setSelectedMotion(normalized[0].url);
        }
      })
      .catch(error => {
        console.error('[useMotionFiles] 모션 파일 로딩 실패:', error);
        setMotionFiles([]);
        setSelectedMotion('');
      });
  }, [characterId]);

  // 순차 neutral 반복용
  const lastNeutralIdx = useRef<number>(-1);

  // 모션 변경
  const setMotionByTag = useCallback((tag: string, source?: string) => {
    console.log(`[useMotionFiles] setMotionByTag 호출: tag=${tag}, source=${source || 'unknown'}`);
    if (!motionFiles || motionFiles.length === 0) return;
    const candidates = motionFiles.filter((f: MotionFile) => f.tag === tag);
    if (candidates.length > 0) {
      let chosen = candidates[0];
      if (tag === 'neutral' && candidates.length > 1) {
        // 순차적으로 인덱스 증가
        lastNeutralIdx.current = (lastNeutralIdx.current + 1) % candidates.length;
        chosen = candidates[lastNeutralIdx.current];
      } else if (tag === 'neutral') {
        lastNeutralIdx.current = 0;
        chosen = candidates[0];
      }
      console.log(`[useMotionFiles] setMotionByTag: 재생할 파일 선택됨 (tag=${tag}, url=${chosen.url}, name=${chosen.name}, idx=${lastNeutralIdx.current})`);
      setSelectedMotion(chosen.url);
      setIsGiftMotion(tag.startsWith('gift'));
    } else {
      // fallback: neutral
      const neutral = motionFiles.find((f: MotionFile) => f.tag === 'neutral');
      if (neutral) {
        console.log('[useMotionFiles] setMotionByTag: 해당 tag 없음, neutral로 fallback');
        setSelectedMotion(neutral.url);
      }
      setIsGiftMotion(false);
    }
  }, [motionFiles]);

  // gift 큐 관리 및 재생 로직
  const playNextGift = useCallback(() => {
    console.log('[useMotionFiles] playNextGift 호출, giftQueue:', JSON.stringify(giftQueue.current));
    if (!giftQueue.current.length) {
      setIsGiftMotion(false);
      setMotionByTag('neutral', 'playNextGift-queueEmpty');
      console.log('[useMotionFiles] playNextGift: giftQueue가 비었으므로 neutral로 복귀');
      return;
    }
    const nextGift = giftQueue.current.shift();
    if (nextGift && nextGift.motion_tag) {
      setIsGiftMotion(true);
      console.log(`[useMotionFiles] playNextGift: 다음 gift 모션 재생 (tag=${nextGift.motion_tag}, count=${nextGift.count})`);
      setMotionByTag(nextGift.motion_tag, 'playNextGift');
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
