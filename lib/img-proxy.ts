import { lookup } from 'node:dns/promises';

const PRIVATE_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
  /^localhost$/i,
];

export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function isSsrfSafe(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname;
    // Check raw hostname first
    if (isPrivateIp(hostname)) return false;
    // Resolve DNS
    const addrs = await lookup(hostname, { all: true });
    for (const { address } of addrs) {
      if (isPrivateIp(address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
