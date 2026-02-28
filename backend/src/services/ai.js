import { getSetting } from '../db/index.js';
import fs from 'fs';
import path from 'path';

const EXTRACTION_PROMPT = `Analyze this document image/PDF and extract the following information as JSON:
{
  "biller": "company or service name",
  "bill_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "amount": 0.00,
  "account_number": "if visible",
  "usage_amount": null,
  "usage_unit": null,
  "category": "utilities/insurance/mortgage/credit_card/medical/other",
  "summary": "brief 1-line summary"
}
Only return valid JSON. If a field cannot be determined, use null.`;

export async function extractDocument(filePath) {
  const provider = getSetting('ai_provider');
  if (!provider) return { error: 'No AI provider configured', data: null };

  try {
    switch (provider) {
      case 'claude': return await extractWithClaude(filePath);
      case 'openai': return await extractWithOpenAI(filePath);
      case 'gemini': return await extractWithGemini(filePath);
      case 'ollama': return await extractWithOllama(filePath);
      default: return { error: `Unknown provider: ${provider}`, data: null };
    }
  } catch (err) {
    return { error: err.message, data: null };
  }
}

async function extractWithClaude(filePath) {
  const apiKey = getSetting('claude_api_key');
  if (!apiKey) return { error: 'Claude API key not configured', data: null };

  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  const result = await res.json();
  if (!res.ok) return { error: result.error?.message || 'Claude API error', data: null };

  const text = result.content?.[0]?.text || '';
  return parseAiResponse(text, 'claude');
}

async function extractWithOpenAI(filePath) {
  const apiKey = getSetting('openai_api_key');
  if (!apiKey) return { error: 'OpenAI API key not configured', data: null };

  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mediaType = ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  const result = await res.json();
  if (!res.ok) return { error: result.error?.message || 'OpenAI API error', data: null };

  const text = result.choices?.[0]?.message?.content || '';
  return parseAiResponse(text, 'openai');
}

async function extractWithGemini(filePath) {
  const apiKey = getSetting('gemini_api_key');
  if (!apiKey) return { error: 'Gemini API key not configured', data: null };

  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: EXTRACTION_PROMPT },
        ],
      }],
    }),
  });

  const result = await res.json();
  if (!res.ok) return { error: result.error?.message || 'Gemini API error', data: null };

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseAiResponse(text, 'gemini');
}

async function extractWithOllama(filePath) {
  const baseUrl = getSetting('ollama_url') || 'http://localhost:11434';

  const fileBuffer = fs.readFileSync(filePath);
  const base64 = fileBuffer.toString('base64');

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llava',
      prompt: EXTRACTION_PROMPT,
      images: [base64],
      stream: false,
    }),
  });

  const result = await res.json();
  if (!res.ok) return { error: 'Ollama API error', data: null };

  return parseAiResponse(result.response || '', 'ollama');
}

function parseAiResponse(text, provider) {
  try {
    // Extract JSON from response (may have markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: 'No JSON found in AI response', data: null, raw: text };

    const data = JSON.parse(jsonMatch[0]);
    return { data, provider, confidence: estimateConfidence(data), raw: text };
  } catch (e) {
    return { error: `Failed to parse AI response: ${e.message}`, data: null, raw: text };
  }
}

function estimateConfidence(data) {
  let score = 0;
  let fields = 0;
  const checks = ['biller', 'bill_date', 'due_date', 'amount', 'category'];
  for (const key of checks) {
    fields++;
    if (data[key] !== null && data[key] !== undefined && data[key] !== '') score++;
  }
  return fields > 0 ? Math.round((score / fields) * 100) : 0;
}
