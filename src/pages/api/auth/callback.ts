import { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // GET/POST 모두 지원
    let code: string | undefined;
    if (req.method === 'GET') {
      code = typeof req.query.code === 'string' ? req.query.code : undefined;
    } else if (req.method === 'POST') {
      // POST body 구조 로깅
      console.log('POST body:', req.body);
      if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          code = parsed.code || parsed['code'] || parsed?.params?.code;
        } catch {
          code = undefined;
        }
      } else if (typeof req.body === 'object' && req.body !== null) {
        code = req.body.code || req.body['code'] || req.body?.params?.code;
      } else {
        code = undefined;
      }
    }

    if (!code) {
      res.status(400).json({ error: 'code 파라미터가 없습니다.' });
      return;
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.session) {
      res.status(401).json({ error: '세션 교환에 실패했습니다.', detail: error?.message });
      return;
    }

    const { access_token, refresh_token } = data.session;
    res.setHeader('Set-Cookie', [
      serialize('sb-access-token', access_token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      }),
      serialize('sb-refresh-token', refresh_token, {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      }),
    ]);

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('auth/callback error:', e);
    res.status(500).json({ error: '서버 에러', detail: (e as Error).message });
  }
}
