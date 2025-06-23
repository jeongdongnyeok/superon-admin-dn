import dynamic from 'next/dynamic';

// 동적 import로 SSR 이슈 방지 (Next.js)
const CharacterSettings = dynamic(() => import('@/components/CharacterSettings'), { ssr: false });

export default function CharacterSettingsPage() {
  return <CharacterSettings />;
}
