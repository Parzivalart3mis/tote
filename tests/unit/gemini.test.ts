import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stand-in SDK: records every request and answers from a per-test script.
const calls: { model: string; config: Record<string, unknown> }[] = [];
let respond: (model: string, config: Record<string, unknown>) => Promise<{ text: string }>;

vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status: number;
    constructor(opts: { message: string; status: number }) {
      super(opts.message);
      this.status = opts.status;
    }
  }
  class GoogleGenAI {
    models = {
      generateContent: (req: { model: string; config: Record<string, unknown> }) => {
        calls.push(req);
        return respond(req.model, req.config);
      },
    };
  }
  return { ApiError, GoogleGenAI };
});

const { ApiError } = await import('@google/genai');
const { generateJson, isAiTimeout, modelChain } = await import('@/lib/gemini');

const opts = { system: 's', prompt: 'p', schema: { type: 'object' } };

beforeEach(() => {
  calls.length = 0;
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
});

describe('generateJson', () => {
  it('sends no server deadline or temperature, only a client-side abort signal', async () => {
    respond = async () => ({ text: '{"ok":true}' });
    await expect(generateJson(opts)).resolves.toEqual({ ok: true });
    const config = calls[0]!.config;
    expect(config['httpOptions']).toBeUndefined(); // becomes X-Server-Timeout; Gemini rejects < 10s
    expect(config['temperature']).toBeUndefined();
    expect(config['abortSignal']).toBeInstanceOf(AbortSignal);
  });

  it('moves to the next model on 404 / 429 but stops on a bad request', async () => {
    const [first, second] = modelChain();
    respond = async (model) => {
      if (model === first) throw new ApiError({ message: 'quota', status: 429 });
      if (model === second) throw new ApiError({ message: 'invalid argument', status: 400 });
      return { text: '{}' };
    };
    await expect(generateJson(opts)).rejects.toMatchObject({ status: 400 });
    expect(calls.map((c) => c.model)).toEqual([first, second]);
  });

  it('gives up with a timeout error once the whole-chain budget is spent', async () => {
    respond = (_model, config) =>
      new Promise((_, reject) => {
        (config['abortSignal'] as AbortSignal).addEventListener('abort', () => reject(new Error('aborted')));
      });
    const err = await generateJson({ ...opts, timeoutMs: 50 }).catch((e: unknown) => e);
    expect(isAiTimeout(err)).toBe(true);
    expect(calls).toHaveLength(1); // no further models tried after the budget ran out
  });
});
