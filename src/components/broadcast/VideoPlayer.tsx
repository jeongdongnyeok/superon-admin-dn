import React, { useRef } from 'react';
import { MotionFile } from './shared/types';

interface VideoPlayerProps {
  motionFiles: MotionFile[];
  selectedMotion: string;
  setMotionByTag: (tag: string) => void;
  setSelectedMotion?: (url: string) => void;
  isGiftMotion: boolean;
  playNextGift: () => void;
  motionTag: 'neutral' | 'talking';
  characterImage: string; // 캐릭터 스틸컷 이미지 url
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  motionFiles,
  selectedMotion,
  setMotionByTag,
  isGiftMotion,
  playNextGift,
  motionTag,
  characterImage,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeMotionFiles = Array.isArray(motionFiles) ? motionFiles : [];
  const playing = safeMotionFiles.find(f => f.url === selectedMotion);

  // 전환 효과용 상태
  const [showCanvas, setShowCanvas] = React.useState(false);
  const [pendingSrc, setPendingSrc] = React.useState<string | null>(null);

  // 캐릭터 스틸컷 이미지를 캔버스에 그림
  const drawStillImageToCanvas = React.useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (ctx) {
        // object-fit: contain 효과로 비율 유지
        const canvasRatio = c.width / c.height;
        const imgRatio = img.width / img.height;
        let drawWidth = c.width, drawHeight = c.height, dx = 0, dy = 0;
        if (imgRatio > canvasRatio) {
          drawWidth = c.width;
          drawHeight = c.width / imgRatio;
          dy = (c.height - drawHeight) / 2;
        } else {
          drawHeight = c.height;
          drawWidth = c.height * imgRatio;
          dx = (c.width - drawWidth) / 2;
        }
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
        setShowCanvas(true);
      }
    };
    img.src = characterImage;
  }, [characterImage]);

  // 기존 비디오의 마지막 프레임을 캔버스에 그림(프레임이 없으면 스틸컷)
  const drawLastFrameToCanvas = React.useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (v && c && v.readyState >= 2) {
      c.width = v.videoWidth || v.clientWidth;
      c.height = v.videoHeight || v.clientHeight;
      const ctx = c.getContext('2d');
      if (ctx && v.videoWidth > 0 && v.videoHeight > 0) {
        ctx.drawImage(v, 0, 0, c.width, c.height);
        setShowCanvas(true);
        return;
      }
    }
    // 준비된 프레임이 없으면 캐릭터 스틸컷 표시
    drawStillImageToCanvas();
  }, [drawStillImageToCanvas]);

  // 비디오 소스(selectedMotion)가 변경될 때, 마지막 프레임을 캔버스에 그림
  React.useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    // src가 변경될 때만 동작
    if (pendingSrc && pendingSrc !== selectedMotion) {
      // 이미 전환 중이면 무시
      return;
    }
    // 비디오가 준비되어 있고, src가 바뀔 때: 현재 프레임을 캔버스에 그림
    const v = videoRef.current;
    const c = canvasRef.current;
    // 준비된 프레임이 없으면 패스
    if (v.readyState < 2) return;
    c.width = v.videoWidth || v.clientWidth;
    c.height = v.videoHeight || v.clientHeight;
    const ctx = c.getContext('2d');
    if (ctx && v.videoWidth > 0 && v.videoHeight > 0) {
      ctx.drawImage(v, 0, 0, c.width, c.height);
      setShowCanvas(true);
      setPendingSrc(selectedMotion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMotion]);

  // 새 영상이 준비(onCanPlay)되면 캔버스 숨김 (중복 선언 방지)
  const handleVideoCanPlay = React.useCallback(() => {
    // 디버깅: 영상 준비 상태/변수 출력
    if (videoRef.current) {
      console.log('[handleVideoCanPlay] video.readyState:', videoRef.current.readyState, 'src:', videoRef.current.currentSrc, 'selectedMotion:', selectedMotion, 'showCanvas:', showCanvas);
    }
    // 실제로 영상이 준비된 상태(readyState >= 2)이고, src가 일치할 때만 showCanvas를 false로
    if (
      videoRef.current &&
      videoRef.current.readyState >= 2 &&
      (videoRef.current.currentSrc.includes(selectedMotion) || videoRef.current.src.includes(selectedMotion))
    ) {
      setShowCanvas(false);
      setPendingSrc(null);
    }
  }, [selectedMotion, showCanvas]);


  // motionTag가 변경될 때 해당 태그의 영상을 랜덤 반복 재생
  React.useEffect(() => {
    if (!motionTag) return;
    // motionTag에 해당하는 영상 중 랜덤으로 선택
    const candidates = safeMotionFiles.filter(f => f.tag === motionTag);
    if (candidates.length > 0) {
      // 현재 재생 중인 영상과 같은 url이면 setState 하지 않음
      const currentIdx = candidates.findIndex(f => f.url === selectedMotion);
      const nextIdx = Math.floor(Math.random() * candidates.length);
      // 단일 파일이거나, 랜덤 결과가 현재와 같으면 그대로 둠
      if (candidates.length === 1 || currentIdx === nextIdx) {
        if (candidates[currentIdx]?.url !== selectedMotion) {
          setMotionByTag(candidates[nextIdx].tag);
        }
      } else {
        setMotionByTag(candidates[nextIdx].tag);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionTag, safeMotionFiles]);

  // 영상 src 보정 함수
  const getVideoSrc = (url: string) => {
    if (!url) return undefined;
    // 이미 useMotionFiles에서 http로 시작하는 절대경로로 보정됨
    return url;
  };

  return (
    <div className="video-player flex flex-col h-full w-full min-w-0 min-h-0 overflow-hidden">
      {/* 영상이 없거나 재생할 파일이 없으면 안내 메시지 출력 */}
      {(!Array.isArray(motionFiles) || motionFiles.length === 0 || !playing) && (
        <div className="mb-4 w-full text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          정상적으로 영상파일이 로딩되지 않았습니다.<br />
          (캐릭터별 모션 리스트 API 또는 영상 파일을 확인해주세요)
        </div>
      )}
      {/* 현재 재생중인 파일명 오버레이 */}
      {playing && (
        <div className="mb-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded shadow">
          {playing.name} <span className="text-gray-300">[{playing.tag}]</span>
        </div>
      )}
      {/* 비디오/캔버스 부모: 상대 위치 */}
      <div style={{ position: 'relative', width: '100%', height: '400px', minHeight: '240px', maxHeight: '60vh' }}>
        {/* 캔버스: showCanvas가 true일 때만 보이게 */}
        <canvas
          ref={canvasRef}
          style={{
            display: showCanvas ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            background: 'transparent',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
        />
        {/* 비디오: 항상 렌더링, showCanvas가 true면 완전히 숨김 */}
        <video
          ref={videoRef}
          className="rounded border w-full h-full max-w-full object-contain"
          src={getVideoSrc(selectedMotion)}
          autoPlay
          loop={true}
          controls
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            display: showCanvas ? 'none' : 'block',
            background: 'black',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          onCanPlay={handleVideoCanPlay}
          onLoadedData={handleVideoCanPlay}
          onEnded={() => {
            drawLastFrameToCanvas();
            if (isGiftMotion) {
              playNextGift();
            } else if (motionTag === 'talking') {
              // talking 모드: talking 태그 영상 랜덤 반복
              const talkingFiles = safeMotionFiles.filter(f => f.tag === 'talking');
              if (talkingFiles.length > 0) {
                setMotionByTag('talking');
              }
            } else if (motionTag === 'neutral') {
              // neutral 모드: 반드시 useMotionFiles에서 순차 반복 처리
              setMotionByTag('neutral');
            } else {
              // 기타(수동 선택 등): 영상 끝나면 neutral 기본 영상으로 복귀
              const neutralFiles = safeMotionFiles.filter(f => f.tag === 'neutral');
              if (neutralFiles.length > 0) {
                setMotionByTag('neutral');
              }
            }
          }}
        />
      </div>
      {/* 하단 모션 파일 리스트 */}
      <div className="w-full flex-1 min-h-0 mt-6 px-4 py-3 bg-gray-50 border-t flex flex-row flex-wrap gap-2 items-center justify-start overflow-y-auto overflow-x-auto min-w-0">
        {motionFiles.length === 0 ? (
          <span className="text-gray-400 text-xs">모션 파일이 없습니다.</span>
        ) : (
          motionFiles.map(file => (
            <button
              key={file.url}
              className={`px-3 py-2 rounded flex items-center gap-2 text-xs font-mono border transition-colors duration-100 ${selectedMotion === file.url ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold' : 'border-gray-300 bg-white hover:bg-gray-100'}`}
              onClick={() => setMotionByTag(file.tag)}
            >
              <span>{file.name}</span>
              <span className="text-gray-400 ml-2">[{file.tag}]</span>
            </button>
          ))
        )}
      </div>

    </div>
  );
};

export default VideoPlayer;
