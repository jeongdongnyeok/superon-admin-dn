import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Use absolute path to the backend assets directory
const BACKEND_DIR = path.join(process.cwd(), '..', 'backend');
const MOTIONS_DIR = path.join(BACKEND_DIR, 'assets', 'motion');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure the directory exists
    if (!fs.existsSync(MOTIONS_DIR)) {
      fs.mkdirSync(MOTIONS_DIR, { recursive: true });
      return res.status(200).json({ files: [] });
    }

    // Read directory and filter for .mp4 files
    const files = fs.readdirSync(MOTIONS_DIR)
      .filter(file => file.toLowerCase().endsWith('.mp4'))
      .map(file => ({
        name: file,
        path: path.join('motion', file),
        url: `http://localhost:8000/assets/motion/${encodeURIComponent(file)}`
      }));

    return res.status(200).json({ files });
  } catch (error) {
    console.error('Error reading motion files:', error);
    return res.status(500).json({ 
      error: 'Failed to read motion files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
