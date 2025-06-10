import { useState, useEffect } from 'react';
import { Character } from '../types';

export function useCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/character');
        if (!response.ok) throw new Error('캐릭터 목록을 불러오는 데 실패했습니다.');
        const data = await response.json();
        setCharacters(data || []);
      } catch (err: any) {
        setError(err.message || '캐릭터 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, []);

  return { characters, isLoading, error };
}
