import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { supabase as clientSupabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  console.log('Request cookies:', req.headers.cookie);
  // 인증 세션이 포함된 supabase 인스턴스 생성
  const supabase = createPagesServerClient({ req, res });

  if (req.method === 'DELETE') {
    try {
      // Delete the character from the database
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Database error on delete:', error);
        return res.status(400).json({ 
          error: '캐릭터 삭제에 실패했습니다.',
          details: error.message 
        });
      }
      
      res.status(200).json({ message: 'Character deleted successfully' });
    } catch (err) {
      const error = err as Error;
      console.error('Error deleting character:', error);
      res.status(500).json({ 
        error: '캐릭터 삭제 중 오류가 발생했습니다.',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } else if (req.method === 'GET') {
    try {
      // 인증 유저 정보 로그
      const { data: { user } } = await supabase.auth.getUser();
      console.log('API 유저 정보:', user);
      // Get a single character by ID
      let realId = id;
      if (Array.isArray(realId)) realId = realId[0];
      console.log('API id:', realId, 'type:', typeof realId, 'length:', realId?.length);
      if (!realId) {
        return res.status(400).json({ error: '캐릭터 ID가 제공되지 않았습니다.' });
      }
      console.log('API id:', realId, 'type:', typeof realId);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', realId)
        .maybeSingle();
      console.log('maybeSingle 쿼리 결과:', data, error);

      if (!data) {
        return res.status(404).json({ error: '캐릭터를 찾을 수 없습니다.' });
      }

      // Process image URL if it exists
      let image_url = data.image_url;
      if (image_url) {
        try {
          // Extract the path from the full URL if it's already a URL
          const path = image_url.includes('character-assets/') 
            ? image_url.split('character-assets/')[1]
            : image_url;
            
          const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('character-assets')
            .createSignedUrl(path, 3600);
          
          if (!urlError && signedUrlData?.signedUrl) {
            image_url = signedUrlData.signedUrl;
          }
        } catch (error) {
          console.error('Error generating signed URL:', error);
          // Keep the original URL if signing fails
        }
      }

      res.status(200).json({
        ...data,
        image_url
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching character:', error);
      res.status(500).json({ 
        error: '캐릭터 정보를 불러오는 중 오류가 발생했습니다.',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const characterData = req.body;
      // name, description, country 등은 컬럼, profile은 JSONB로 분리
      const { name, description, country, profile } = characterData;
      // image_url은 별도 PATCH에서만 수정
      const updatePayload: Record<string, any> = {};
      if (name !== undefined) updatePayload.name = name;
      if (description !== undefined) updatePayload.description = description;
      if (country !== undefined) updatePayload.country = country;
      if (profile !== undefined) updatePayload.profile = profile;
      // DB 업데이트
      const { data, error } = await supabase
        .from('characters')
        .update(updatePayload)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Database error on update:', error);
        return res.status(400).json({ 
          error: '캐릭터 업데이트에 실패했습니다.',
          details: error.message 
        });
      }
      
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Character not found' });
      }
      
      res.status(200).json(data[0]);
    } catch (err) {
      const error = err as Error;
      console.error('Error updating character:', error);
      res.status(500).json({ 
        error: '캐릭터 업데이트 중 오류가 발생했습니다.',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { image_url } = req.body;
      if (!image_url) {
        return res.status(400).json({ error: 'image_url 값이 필요합니다.' });
      }
      const { data, error } = await supabase
        .from('characters')
        .update({ image_url })
        .eq('id', id)
        .select();
      if (error) {
        console.error('Database error on PATCH:', error);
        return res.status(400).json({ error: '이미지 URL 업데이트 실패', details: error.message });
      }
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Character not found' });
      }
      res.status(200).json(data[0]);
    } catch (err) {
      const error = err as Error;
      console.error('Error updating image_url:', error);
      res.status(500).json({ error: '이미지 URL 업데이트 중 오류가 발생했습니다.', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'PATCH']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
