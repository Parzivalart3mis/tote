import Image from 'next/image';
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src="/icons/icon-192.png" alt="Tote" width={56} height={56} className="rounded-2xl" priority />
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Welcome to Tote
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Your grocery lists, one per store.
        </p>
      </div>
      <SignIn />
    </div>
  );
}
