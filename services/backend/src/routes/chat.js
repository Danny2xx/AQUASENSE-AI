import { Router } from 'express';
import { hf, CHAT_MODEL, buildSystemPrompt } from '../services/chatService.js';

const router = Router();

// POST /api/chat  — streaming SSE response
router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message required' });

  if (!process.env.HF_TOKEN) {
    return res.status(503).json({ error: 'HF_TOKEN not configured in .env' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    const system = buildSystemPrompt('demo-food-processing-plant');

    const messages = [
      { role: 'system', content: system },
      ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const stream = hf.chatCompletionStream({
      model: CHAT_MODEL,
      messages,
      max_tokens: 1024,
    });

    for await (const chunk of stream) {
      const token = chunk.choices?.[0]?.delta?.content;
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
  } catch (e) {
    console.error('[chat]', e.message);
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
  }

  res.end();
});

export default router;
