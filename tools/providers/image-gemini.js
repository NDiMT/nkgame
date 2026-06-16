// Gemini image provider.
//
// Uses the Google GenAI SDK (@google/genai) to generate an image per prompt
// and writes the bytes to disk. Requires GEMINI_API_KEY.
//
// Note: image-capable Gemini model ids evolve — keep GEMINI_IMAGE_MODEL
// overridable via env. The default below targets the Gemini image model;
// if it errors with "model not found", set GEMINI_IMAGE_MODEL to the current
// image-generation model id from the Gemini API docs.

import { writeFile } from 'node:fs/promises';

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

export class GeminiProvider {
  constructor(apiKey) {
    if (!apiKey) throw new Error('GEMINI_API_KEY is required for the Gemini image provider');
    this.apiKey = apiKey;
    this._client = null;
  }

  async _ai() {
    if (this._client) return this._client;
    const { GoogleGenAI } = await import('@google/genai');
    this._client = new GoogleGenAI({ apiKey: this.apiKey });
    return this._client;
  }

  extension() {
    return 'png';
  }

  async generate(prompt, outPath) {
    const ai = await this._ai();
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    // Find the inline image part in the response.
    const parts = res?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    if (!imgPart) throw new Error('Gemini returned no image data for prompt: ' + prompt.slice(0, 60));

    const bytes = Buffer.from(imgPart.inlineData.data, 'base64');
    await writeFile(outPath, bytes);
  }
}
