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
  const playing = motionFiles.find(f => f.url === selectedMotion);

  return (
    <div className="video-player flex flex-col items-center p-4 h-full">
      {/* 현재 재생중인 파일명 오버레이 */}
      {playing && (
        <div className="mb-2 bg-black bg-opacity-60 text-white text-xs px-3 py-1 rounded shadow">
          {playing.name} <span className="text-gray-300">[{playing.tag}]</span>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full max-w-md h-64 rounded border"
        src={selectedMotion || undefined}
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
