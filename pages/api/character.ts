import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API Request:', req.method, req.url);
  
  // Verify Supabase client is properly initialized
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ 
      error: '서버 설정 오류가 발생했습니다.',
      details: 'Missing Supabase configuration'
    });
  }

  if (req.method === 'GET') {
    try {
      console.log('Fetching characters from database...');
      
      // Fetch characters from the database
      console.log('Executing Supabase query...');
      const { data, error, status } = await supabase
        .from('characters')
        .select('*')
        .order('created_at', { ascending: false });
        
      console.log(`Supabase query completed with status: ${status}`);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          error: '데이터베이스 오류가 발생했습니다.',
          details: error.message 
        });
      }
      
      console.log(`Found ${data?.length || 0} characters`);

      // Process image URLs
      console.log('Processing image URLs for', data.length, 'characters');
      const charactersWithImages = await Promise.all(
        data.map(async (char) => {
          try {
            const image_url = char.image_url;
            
            if (!image_url) {
              console.log(`No image URL for character ${char.id}`);
              return { ...char, image_url: null };
            }
            
            console.log(`Processing image for character ${char.id}:`, image_url);
            
            // Skip processing if it's already a signed URL
            if (image_url.includes('supabase.co/storage/v1/object/sign/')) {
              console.log(`Skipping signed URL generation for character ${char.id} (already signed)`);
              return { ...char };
            }
            
            // Extract the path from the full URL if it's already a URL
            let path = image_url;
            if (image_url.includes('character-assets/')) {
              path = image_url.split('character-assets/')[1];
              console.log(`Extracted path for character ${char.id}:`, path);
            }
              
            // Skip if path is empty or invalid
            if (!path || path.trim() === '') {
              console.warn('Empty or invalid image path for character:', char.id);
              return { ...char, image_url: null };
            }
            
            console.log(`Generating signed URL for character ${char.id}, path:`, path);
            const { data: signedUrlData, error: urlError } = await supabase.storage
              .from('character-assets')
              .createSignedUrl(path, 3600); // 1 hour expiry
            
            if (urlError) {
              console.error('Error generating signed URL for character', char.id, ':', urlError);
              return { ...char, image_url: null };
            }
            
            if (signedUrlData?.signedUrl) {
              console.log(`Successfully generated signed URL for character ${char.id}`);
              return { ...char, image_url: signedUrlData.signedUrl };
            }
            
            // If we get here, return the character with the original URL
            return { ...char };
          } catch (error) {
            console.error(`Error processing image for character ${char.id}:`, error);
            // Return the character with null image_url on error
            return { ...char, image_url: null };
          }
        })
      );

      res.status(200).json(charactersWithImages);
    } catch (err) {
      const error = err as Error;
      console.error('Error in API route:', error);
      res.status(500).json({ 
        error: '서버 내부 오류가 발생했습니다.',
        details: error.message || '알 수 없는 오류가 발생했습니다.',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } else if (req.method === 'PATCH') {
    // PATCH: Update image_url for a character by id (server-side, avoids RLS issues)
    const { id, image_url } = req.body;
    if (!id || !image_url) {
      return res.status(400).json({ error: 'id와 image_url이 필요합니다.' });
    }
    const { error } = await supabase
      .from('characters')
      .update({ image_url })
      .eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  } else if (req.method === 'POST') {
    try {
      const characterData = req.body;
      
      // Insert new character
      const { data, error } = await supabase
        .from('characters')
        .insert([characterData])
        .select();

      if (error) {
        console.error('Database error on insert:', error);
        return res.status(400).json({ 
          error: 'Failed to create character',
          details: error.message 
        });
      }
      
      res.status(201).json(data[0]);
    } catch (err) {
      const error = err as Error;
      console.error('Error creating character:', error);
      res.status(500).json({ 
        error: '캐릭터 생성 중 오류가 발생했습니다.',
        details: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
