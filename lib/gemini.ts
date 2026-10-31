import { ApiError, GoogleGenAI } from '@google/genai';

/**
 * Gemini via the current SDK (@google/genai). Categorizing is a light task, so
 * the chain starts with Flash-Lite and falls back to Flash. A retired model
 * (404) or quota/overload error (429, 5xx) moves on to the next model.
 */
const DEFAULT_CHAIN = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.8-flash', 'gemini-flash-latest'];

export function modelChain(): string[] {
  const override = process.env['GEMINI_MODEL']?.trim();
  return [...new Set([override, ...DEFAULT_CHAIN].filter((m): m is string => !!m))];
}

export function geminiConfigured(): boolean {
  return !!process.env['GEMINI_API_KEY']?.trim();
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env['GEMINI_API_KEY']?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function isRetryable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 429 || err.status >= 500);
}

/** Structured output: the reply is constrained to `schema` (JSON Schema) and parsed. */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  timeoutMs?: number;
}): Promise<T> {
  const ai = getClient();
  let lastError: unknown;
  for (const model of modelChain()) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          temperature: 0,
          responseMimeType: 'application/json',
          responseJsonSchema: opts.schema,
          httpOptions: { timeout: opts.timeoutMs ?? 30_000 },
        },
      });
      const text = res.text?.trim();
      if (!text) throw new Error(`Empty response from ${model}`);
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) break;
      console.warn(`[gemini] ${model} unavailable (${(err as ApiError).status}); trying next model`);
    }
  }
  throw lastError;
}
