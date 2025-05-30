import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch character responses from your database or in-memory store
    // This is a simplified example - adjust according to your actual data structure
    const { data: responses, error } = await supabase
      .from('character_responses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Format the responses for the frontend
    const formattedResponses = (responses || []).map((response: any) => ({
      id: response.id,
      message: response.message,
      tags: response.tags || [],
      status: response.status || 'unknown',
      timestamp: response.created_at || new Date().toISOString()
    }));

    return res.status(200).json({ responses: formattedResponses });
  } catch (error) {
    console.error('Error fetching character responses:', error);
    
    // Return mock data for development if there's an error
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock data for character responses');
      return res.status(200).json({
        responses: [
          {
            id: '1',
            message: '안녕하세요! 오늘 기분이 어떠신가요?',
            tags: ['greeting', 'question'],
            status: 'success',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            message: '날씨가 정말 좋네요. 산책하러 가시는 건 어때요?',
            tags: ['small_talk', 'suggestion'],
            status: 'success',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString() // 5 minutes ago
          }
        ]
      });
    }

    return res.status(500).json({ 
      error: 'Failed to fetch character responses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
