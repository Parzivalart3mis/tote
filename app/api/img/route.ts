import { NextRequest, NextResponse } from 'next/server';
import { isSsrfSafe } from '@/lib/img-proxy';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 10_000;

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u) return NextResponse.json({ error: 'Missing u param' }, { status: 400 });

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // SSRF guard
  const safe = await isSsrfSafe(u);
  if (!safe) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstream = await fetch(u, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Tote-ImageProxy/1.0' },
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 415 });
    }

    // Read with size cap
    const reader = upstream.body?.getReader();
    if (!reader) return NextResponse.json({ error: 'No body' }, { status: 502 });

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_SIZE) {
          reader.cancel();
          return NextResponse.json({ error: 'Image too large' }, { status: 413 });
        }
        chunks.push(value);
      }
    }

    const body = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
