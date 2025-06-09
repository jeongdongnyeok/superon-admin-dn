import React from 'react';

interface RoomIdModalProps {
  show: boolean;
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRegister: () => void;
  onCancel: () => void;
}

const RoomIdModal: React.FC<RoomIdModalProps> = ({
  show,
  inputValue,
  onInputChange,
  onRegister,
  onCancel,
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
        <div className="mb-2 font-semibold">TikTok Room ID를 입력하세요</div>
        <input
          className="border px-2 py-1 rounded mb-2"
          type="text"
          placeholder="Room ID"
          value={inputValue}
          onChange={onInputChange}
          onKeyDown={e => {
            if (e.key === 'Enter') onRegister();
          }}
          autoFocus

        />
        <button
          className="bg-blue-500 text-white px-4 py-1 rounded mb-1"
          onClick={onRegister}
          disabled={!inputValue}
        >
          등록
        </button>
        <button
          className="mt-1 text-gray-500 underline"
          onClick={onCancel}
        >
          취소
        </button>
      </div>
    </div>
  );
};

export default RoomIdModal;
