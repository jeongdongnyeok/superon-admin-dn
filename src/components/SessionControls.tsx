import React from 'react';

interface SessionControlsProps {
  sessionStatus: 'idle' | 'start' | 'end';
  onStart: () => void;
  onEnd: () => void;
  currentSessionId: string | null;
}

const SessionControls: React.FC<SessionControlsProps> = ({
  sessionStatus,
  onStart,
  onEnd,
  currentSessionId,
}) => (
  <div className="mb-4 flex items-center gap-2">
    <button
      className="rounded px-4 py-2 font-bold text-white bg-green-500"
      onClick={onStart}
      disabled={sessionStatus === 'start'}
    >
      방송 시작
    </button>
    {sessionStatus === 'start' && (
      <button
        className="rounded px-4 py-2 font-bold text-white bg-red-500"
        onClick={onEnd}
      >
        방송 종료
      </button>
    )}
    <span className="text-gray-700 font-semibold ml-4">
      세션 상태: {sessionStatus === 'idle' ? '대기' : sessionStatus === 'start' ? '방송 중' : '종료'}
    </span>
    {currentSessionId && (
      <span className="text-xs text-gray-500 ml-2">Session ID: {currentSessionId}</span>
    )}
  </div>
);

export default SessionControls;
