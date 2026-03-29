import { HttpException, Injectable } from '@nestjs/common';

export type GeminiGenerateBody = {
  model: string;
  systemInstruction?: { parts: { text: string }[] };
  contents: { role: string; parts: { text: string }[] }[];
  generationConfig?: { maxOutputTokens?: number };
};

@Injectable()
export class GeminiProxyService {
  async generate(body: GeminiGenerateBody): Promise<{ text: string }> {
    const apiKey =
      process.env.GOOGLE_AI_STUDIO_API_KEY?.trim() ||
      process.env.VITE_GOOGLE_AI_STUDIO_API_KEY?.trim();
    if (!apiKey) {
      throw new HttpException(
        'Server is not configured: set GOOGLE_AI_STUDIO_API_KEY or VITE_GOOGLE_AI_STUDIO_API_KEY in the repo-root .env (or backend/.env), then restart the backend.',
        503,
      );
    }

    const model = body.model?.trim() || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: body.systemInstruction,
        contents: body.contents,
        generationConfig: body.generationConfig ?? { maxOutputTokens: 1000 },
      }),
    });

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      throw new HttpException(
        data.error?.message ?? res.statusText,
        res.status >= 500 ? 502 : 400,
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) {
      throw new HttpException('Empty response from Gemini', 502);
    }
    return { text };
  }
}
