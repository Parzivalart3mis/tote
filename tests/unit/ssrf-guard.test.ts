import { describe, it, expect } from 'vitest';
import { isPrivateIp } from '@/lib/img-proxy';

describe('isPrivateIp', () => {
  it('flags 10.x.x.x', () => expect(isPrivateIp('10.0.0.1')).toBe(true));
  it('flags 172.16.x.x', () => expect(isPrivateIp('172.16.0.1')).toBe(true));
  it('flags 172.31.x.x', () => expect(isPrivateIp('172.31.0.1')).toBe(true));
  it('does not flag 172.32.x.x', () => expect(isPrivateIp('172.32.0.1')).toBe(false));
  it('flags 192.168.x.x', () => expect(isPrivateIp('192.168.1.1')).toBe(true));
  it('flags 127.0.0.1', () => expect(isPrivateIp('127.0.0.1')).toBe(true));
  it('flags ::1', () => expect(isPrivateIp('::1')).toBe(true));
  it('flags localhost', () => expect(isPrivateIp('localhost')).toBe(true));
  it('does not flag 8.8.8.8', () => expect(isPrivateIp('8.8.8.8')).toBe(false));
  it('does not flag 1.1.1.1', () => expect(isPrivateIp('1.1.1.1')).toBe(false));
  it('flags fc00:: range', () => expect(isPrivateIp('fc00::1')).toBe(true));
});
