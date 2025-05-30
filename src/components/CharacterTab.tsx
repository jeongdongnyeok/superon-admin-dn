import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';

type Character = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  status: string;
  created_at?: string;
};

export default function CharactersTab() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageUrlsById, setImageUrlsById] = useState<Record<string, string>>({});

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/character');
      const chars = response.data || [];
      setCharacters(chars);
      
      // image_url이 storage path면 signed URL로 변환하여 표시 (이미 구현됨)
// Generate signed URLs for images
      const urls: Record<string, string> = {};
      await Promise.all(
        chars.map(async (char: Character) => {
          if (char.image_url) {
            try {
              // Skip if it's already a signed URL
              if (char.image_url.includes('supabase.co/storage/v1/object/sign/')) {
                urls[char.id] = char.image_url;
                return;
              }
              
              const { data, error } = await supabase.storage
                .from('character-assets')
                .createSignedUrl(char.image_url, 60 * 60);
                
              if (error) throw error;
              if (data?.signedUrl) {
                urls[char.id] = data.signedUrl;
              }
            } catch (e) {
              console.error(`Error generating signed URL for character ${char.id}:`, e);
              // Don't fail the whole operation if one image fails
            }
          }
        })
      );
      setImageUrlsById(urls);
    } catch (error: unknown) {
      console.error('캐릭터 목록을 불러오는 중 오류가 발생했습니다:', error);
      
      let errorMessage = '캐릭터 목록을 불러오는 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // 서버에서 응답이 왔지만 에러 상태 코드인 경우
          switch (error.response.status) {
            case 401:
              errorMessage = '인증이 필요합니다. 로그인 해주세요.';
              break;
            case 403:
              errorMessage = '이 작업을 수행할 권한이 없습니다.';
              break;
            case 500:
              errorMessage = '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
              break;
            default:
              errorMessage = `서버 오류 (${error.response.status})`;
          }
        } else if (error.request) {
          // 요청이 전송되었지만 응답을 받지 못한 경우
          errorMessage = '서버로부터 응답을 받지 못했습니다. 네트워크 연결을 확인해주세요.';
        } else {
          // 요청을 설정하는 중에 오류가 발생한 경우
          errorMessage = '요청을 처리하는 중 오류가 발생했습니다.';
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      // Clear characters on error to prevent showing stale data
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharacters();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      // Use the API endpoint for deletion
      const response = await axios.delete(`/api/characters/${id}`);
      
      if (response.status === 200) {
        // Update the local state to remove the deleted character
        setCharacters(prev => prev.filter(c => c.id !== id));
      } else {
        throw new Error('Failed to delete character');
      }
    } catch (error: unknown) {
      console.error('Error deleting character:', error);
      let errorMessage = '삭제 중 오류가 발생했습니다.';
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`삭제 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartSession = async (char: Character) => {
    try {
      const res = await axios.post('http://localhost:8000/start_session', {
        characters_id: char.id,
      });
      if (res.data?.session_id) {
        await fetchCharacters();
      }
    } catch (error: unknown) {
      console.error('라이브 시작 실패:', error);
      let errorMessage = '라이브 시작 실패';
      
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      alert(`세션 시작 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  const handleEndSession = async (char: Character) => {
    try {
      const res = await supabase
        .from('live_sessions')
        .select('id')
        .eq('characters_id', char.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      const session_id = res.data?.id;
      if (!session_id) {
        alert('세션 ID를 찾을 수 없습니다.');
        return;
      }

      await axios.post('http://localhost:8000/end_session', {
        session_id,
      });

      await fetchCharacters();
    } catch (e) {
      console.error('라이브 종료 실패:', e);
      alert('라이브 종료 실패');
    }
  };

  if (loading) return <p>불러오는 중...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">🧙 캐릭터 목록</h2>
        <Link href="/dashboard/characters/new">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            + 캐릭터 생성
          </button>
        </Link>
      </div>

      {characters.length === 0 ? (
        <p>등록된 캐릭터가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <div key={char.id} className="border rounded p-4 shadow-sm relative">
              {imageUrlsById[char.id] ? (
                <Image
                  src={imageUrlsById[char.id]}
                  alt={char.name}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover mb-2 rounded"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center mb-2 rounded">
                  <span className="text-gray-400">이미지 없음</span>
                </div>
              )}
              <h3 className="text-xl font-semibold">{char.name}</h3>
              <p className="text-sm text-gray-600">{char.description}</p>

              <p className="mt-2 text-sm">
                상태: <strong>{char.status}</strong>
              </p>

              <div className="mt-2 flex gap-2">
                {char.status === '대기' && (
                  <button
                    onClick={() => handleStartSession(char)}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                  >
                    라이브 시작
                  </button>
                )}
                {char.status === '라이브중' && (
                  <button
                    onClick={() => handleEndSession(char)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    라이브 종료
                  </button>
                )}
                <Link
                  href={`/dashboard/characters/${char.id}`}
                  className="text-blue-500 underline text-sm mt-1"
                >
                  ✏️ 수정
                </Link>
              </div>

              <button
                className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                onClick={() => handleDelete(char.id)}
                disabled={deletingId === char.id}
              >
                {deletingId === char.id ? '삭제중...' : '삭제'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}