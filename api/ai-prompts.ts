import type { VercelRequest, VercelResponse } from '@vercel/node';
import prompts from './config/aiPrompts.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    return res.status(200).json({ prompts: prompts.prompts });
  } catch (error: any) {
    console.error("Failed to load AI prompts:", error);
    return res.status(500).json({ message: "Failed to load AI prompts" });
  }
}
