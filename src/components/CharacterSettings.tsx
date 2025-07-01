import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

interface ExampleQA {
  user: string;
  character: string;
}

const CharacterSettings = () => {
  const router = useRouter();
  const { id } = router.query;

  const [instruction, setInstruction] = useState('');
  const [examples, setExamples] = useState<ExampleQA[]>([{ user: '', character: '' }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    axios.get(`/api/characters/${id}/settings`)
      .then(res => {
        setInstruction(res.data.instruction || '');
        setExamples(res.data.examples?.length ? res.data.examples : [{ user: '', character: '' }]);
      })
      .catch(() => {
        setError('설정 정보를 불러오는데 실패했습니다.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleExampleChange = (idx: number, field: 'user' | 'character', value: string) => {
    setExamples(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const handleAddExample = () => {
    if (examples.length >= 3) return;
    setExamples([...examples, { user: '', character: '' }]);
  };

  const handleRemoveExample = (idx: number) => {
    if (examples.length === 1) return;
    setExamples(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`/api/characters/${id}/settings`, {
        instruction,
        examples,
      });
      setSuccess('설정이 저장되었습니다.');
      setTimeout(() => {
        window.location.href = '/dashboard?tab=character';
      }, 700);
    } catch (e: unknown) {
      let errorMessage = '설정 저장에 실패했습니다.';
      if (axios.isAxiosError(e)) {
        const data = e.response?.data;
        if (typeof data === 'string') errorMessage = data;
        else if (typeof data?.error === 'string') errorMessage = data.error;
        else if (typeof data?.detail === 'string') errorMessage = data.detail;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">캐릭터 설정</h2>
      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <div className="mb-4">
            <label className="block font-semibold mb-1">Instruction Prompt</label>
            <textarea
              className="w-full border rounded px-2 py-1"
              rows={4}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              placeholder="캐릭터의 행동 원칙, 말투, 세계관 등 지침을 입력하세요."
            />
          </div>
          <div className="mb-4">
            <label className="block font-semibold mb-1">예시 Q&A (최대 3쌍)</label>
            {examples.map((ex, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <input
                  className="border rounded px-2 py-1 flex-1"
                  placeholder="유저 질문 예시"
                  value={ex.user}
                  onChange={e => handleExampleChange(idx, 'user', e.target.value)}
                />
                <input
                  className="border rounded px-2 py-1 flex-1"
                  placeholder="캐릭터 답변 예시"
                  value={ex.character}
                  onChange={e => handleExampleChange(idx, 'character', e.target.value)}
                />
                <button
                  className="ml-2 px-2 py-1 bg-red-200 rounded disabled:opacity-30"
                  onClick={() => handleRemoveExample(idx)}
                  disabled={examples.length === 1}
                  type="button"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              className="mt-2 px-3 py-1 bg-blue-200 rounded disabled:opacity-30"
              onClick={handleAddExample}
              disabled={examples.length >= 3}
              type="button"
            >
              + 예시 추가
            </button>
          </div>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {success && <div className="text-green-600 mb-2">{success}</div>}
          <button
            className="bg-blue-600 text-white px-6 py-2 rounded font-bold"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </>
      )}
    </div>
  );
};

export default CharacterSettings;
