import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse<Record<string, unknown>>) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: '캐릭터 ID가 제공되지 않았습니다.' });
  }
  const supabase = createPagesServerClient({ req, res });

  // GET: 캐릭터 instruction, examples 조회
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('profile')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다.' });
      const profile = data.profile || {};
      res.status(200).json({
        instruction: profile.instruction || '',
        examples: profile.examples || []
      });
    } catch (e: unknown) {
      let message = '알 수 없는 오류입니다.';
      if (e instanceof Error) message = e.message;
      else if (typeof e === 'string') message = e;
      res.status(500).json({ error: '설정 정보를 불러오는데 실패했습니다.', detail: message });
    }
  }
  // PUT: 캐릭터 instruction, examples 저장
  else if (req.method === 'PUT') {
    const { instruction, examples } = req.body;
    try {
      // 기존 profile 불러오기
      const { data: existingData, error: fetchError } = await supabase
        .from('characters')
        .select('profile')
        .eq('id', id)
        .maybeSingle();
      if (fetchError) throw fetchError;
      const prevProfile = existingData?.profile || {};
      // 병합
      const nextProfile = { ...prevProfile, instruction, examples };
      const { error } = await supabase
        .from('characters')
        .update({ profile: nextProfile })
        .eq('id', id);
      if (error) throw error;
      res.status(200).json({ message: '설정이 저장되었습니다.' });
    } catch (e: unknown) {
      let message = '알 수 없는 오류입니다.';
      if (e instanceof Error) message = e.message;
      else if (typeof e === 'string') message = e;
      res.status(500).json({ error: '설정 저장에 실패했습니다.', detail: message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
