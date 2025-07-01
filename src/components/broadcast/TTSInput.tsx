import React, { useState, useRef } from 'react';

interface TTSInputProps {
  onSend: (text: string) => void;
  loading: boolean;
  playing: boolean;
}

const TTSInput: React.FC<TTSInputProps> = ({ onSend, loading, playing }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !loading && !playing) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleSendClick = () => {
    if (input.trim() && !loading && !playing) {
      onSend(input.trim());
      setInput('');
      if (inputRef.current) inputRef.current.blur();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <input
        ref={inputRef}
        type="text"
        className="border px-2 py-1 rounded w-full"
        placeholder={loading ? 'TTS 생성중...' : playing ? '재생중...' : '텍스트를 입력하세요'}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={loading || playing}
        maxLength={200}
      />
      <button
        className="bg-blue-500 text-white px-4 py-1 rounded disabled:bg-gray-400"
        onClick={handleSendClick}
        disabled={loading || playing || !input.trim()}
      >
        {loading ? '생성중...' : playing ? '재생중...' : 'TTS 재생'}
      </button>
    </div>
  );
};

export default TTSInput;
