import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
const BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || 'http://localhost:8000';
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

  // 이미지 URL이 상대경로일 경우 /로 시작하도록 보정(강화)
  const getImageSrc = (url?: string | null) => {
    console.log('[getImageSrc] input:', url);
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.log('[getImageSrc] output: /default.png');
      return '/default.png';
    }
    if (url.startsWith('http')) {
      console.log('[getImageSrc] output:', url);
      return url;
    }
    const normalized = url.startsWith('/') ? url : '/' + url;
    if (!normalized.startsWith('/')) {
      console.error('[getImageSrc] next/image src runtime error: invalid src', url, normalized);
      return '/default.png';
    }
    console.log('[getImageSrc] output:', normalized);
    return normalized;
  };



  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/character');
      const chars: Character[] = response.data || [];
      setCharacters(chars);

      const urls: Record<string, string> = {};
      await Promise.all(
        chars.map(async (char) => {
          if (char.image_url) {
            try {
              if (char.image_url.includes('supabase.co/storage/v1/object/sign/')) {
                urls[char.id] = char.image_url;
                return;
              }
              // Supabase Storage: path should NOT start with a leading slash
              const storagePath = (char.image_url || '').replace(/^\//, '');
              const { data, error } = await supabase.storage
                .from('character-assets')
                .createSignedUrl(storagePath, 60 * 60);
              if (error) throw error;
              if (data?.signedUrl) {
                urls[char.id] = data.signedUrl;
              } else {
                urls[char.id] = '/default.png'; // signed URL이 없으면 기본 이미지
              }
            } catch (e) {
              console.error(`Error generating signed URL for character ${char.id}:`, e);
              urls[char.id] = '/default.png'; // 실패 시 기본 이미지
            }
          } else {
            urls[char.id] = '/default.png'; // image_url이 없으면 기본 이미지
          }
        })
      );
      setImageUrlsById(urls);
    } catch (error: any) {
      let errorMessage = '캐릭터 목록을 불러오는 중 오류가 발생했습니다.';
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === 'string') errorMessage = data;
        else if (typeof data?.error === 'string') errorMessage = data.error;
        else if (typeof data?.detail === 'string') errorMessage = data.detail;
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
      const res = await axios.post(`${BASE_URL}/start_session`, {
        characters_id: char.id,
      });
      if (res.data?.session_id) {
        await fetchCharacters();
      }
    } catch (error: unknown) {
      console.error('라이브 시작 실패:', error);
      let errorMessage = '라이브 시작 실패';
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;
        if (typeof data === 'string') errorMessage = data;
        else if (typeof data?.error === 'string') errorMessage = data.error;
        else if (typeof data?.detail === 'string') errorMessage = data.detail;
        else if (typeof data?.message === 'string') errorMessage = data.message;
        else errorMessage = error.message;
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

      await axios.post(`${BASE_URL}/end_session`, {
        session_id,
      });

      await fetchCharacters();
    } catch (e) {
      console.error('라이브 종료 실패:', e);
      let errorMessage = '라이브 종료 실패';
      if (axios.isAxiosError(e)) {
        const data = e.response?.data;
        if (typeof data === 'string') errorMessage = data;
        else if (typeof data?.error === 'string') errorMessage = data.error;
        else if (typeof data?.detail === 'string') errorMessage = data.detail;
        else if (typeof data?.message === 'string') errorMessage = data.message;
        else errorMessage = e.message;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      alert(`라이브 종료 실패: ${errorMessage}`);
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
              {(() => {
                const src = getImageSrc(imageUrlsById[char.id]);
                console.log('[CharacterTab] Rendering image for', char.id, 'src:', src);
                if (src === '/default.png') {
                  return (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center mb-2 rounded">
                      <span className="text-gray-400">이미지 없음</span>
                    </div>
                  );
                }
                return (
                  <Image
                    src={src}
                    alt={char.name}
                    width={400}
                    height={192}
                    className="w-full h-48 object-cover mb-2 rounded"
                  />
                );
              })()}

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
                <Link
                  href={`/dashboard/characters/${char.id}/settings`}
                  className="text-purple-600 underline text-sm mt-1 ml-2"
                >
                  ⚙️ 설정
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