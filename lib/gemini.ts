import { ApiError, GoogleGenAI } from '@google/genai';

/**
 * Gemini via the current SDK (@google/genai). Categorizing is a light task, so
 * the chain is fast models only (each sorts 30 items in 2–5s). A retired model
 * (404) or quota/overload error (429, 5xx) moves on to the next model. The
 * bigger thinking models are left out: gemini-3.8-flash took 40s+ on 7 items.
 */
const DEFAULT_CHAIN = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

/** Budget for the whole chain when the caller sets none; under the routes' maxDuration (60s). */
const DEFAULT_TIMEOUT_MS = 45_000;

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

export function isAiQuotaError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

export function isAiTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}

/**
 * Structured output: the reply is constrained to `schema` (JSON Schema) and parsed.
 *
 * `timeoutMs` bounds the whole fallback chain, on our side only. It must not go
 * in `httpOptions.timeout`: the SDK forwards that to Google as a server
 * deadline, and Gemini rejects any deadline under 10s (400 INVALID_ARGUMENT).
 *
 * Temperature stays at the model default: at 0, gemini-3.8-flash stalled for
 * over a minute on a 7-item list. The enum in `schema` bounds the answers anyway.
 */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  schema: object;
  timeoutMs?: number;
}): Promise<T> {
  const ai = getClient();
  const signal = AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let lastError: unknown;
  for (const model of modelChain()) {
    if (signal.aborted) break;
    try {
      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: 'application/json',
          responseJsonSchema: opts.schema,
          abortSignal: signal,
        },
      });
      const text = res.text?.trim();
      if (!text) throw new Error(`Empty response from ${model}`);
      return JSON.parse(text) as T;
    } catch (err) {
      lastError = signal.aborted ? signal.reason : err;
      if (signal.aborted || !isRetryable(err)) break;
      console.warn(`[gemini] ${model} unavailable (${(err as ApiError).status}); trying next model`);
    }
  }
  throw lastError ?? signal.reason;
}
