import React, { useRef } from 'react';
import { MotionFile } from './shared/types';

interface VideoPlayerProps {
  motionFiles: MotionFile[];
  selectedMotion: string;
  setMotionByTag: (tag: string) => void;
  isGiftMotion: boolean;
  playNextGift: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  motionFiles,
  selectedMotion,
  setMotionByTag,
  isGiftMotion,
  playNextGift,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const safeMotionFiles = Array.isArray(motionFiles) ? motionFiles : [];
  const playing = safeMotionFiles.find(f => f.url === selectedMotion);

  // 영상 src 보정 함수
  const getVideoSrc = (url: string) => {
    if (!url) return undefined;
    // 이미 useMotionFiles에서 http로 시작하는 절대경로로 보정됨
    return url;
  };

  return (
    <div className="video-player flex flex-col items-center p-4 h-full w-full">
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
      <video
        ref={videoRef}
        style={{ width: 375, height: 812 }}
        className="rounded border mx-auto"
        src={getVideoSrc(selectedMotion)}
        autoPlay
        loop={playing?.tag === 'neutral'}
        controls
        onEnded={() => {
          if (isGiftMotion) {
            playNextGift();
          } else if (playing && playing.tag !== 'neutral') {
            setMotionByTag('neutral');
          }
        }}
      />
      {/* 하단 모션 파일 리스트 */}
      <div className="w-full mt-6 px-8 py-3 bg-gray-50 border-t flex flex-row flex-wrap gap-2 items-center justify-start">
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
      <div className="w-full mt-3 space-y-1">
        {motionFiles.map(file => (
          <div
            key={file.path}
            className={`p-2 rounded cursor-pointer flex items-center gap-2 ${selectedMotion === file.url ? 'bg-blue-50 border-2 border-blue-300' : 'border border-gray-200 hover:bg-gray-50'}`}
            onClick={() => setMotionByTag(file.tag)}
          >
            <span className="font-mono text-xs truncate">{file.path}</span>
            <span className="text-xs text-gray-500">[{file.tag}]</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoPlayer;
