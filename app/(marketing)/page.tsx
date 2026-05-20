import Link from 'next/link';
import Image from 'next/image';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default async function MarketingPage() {
  const user = await currentUser();
  if (user) redirect('/stores');

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div className="mb-6">
        <Image src="/icons/icon-192.png" alt="Tote" width={80} height={80} className="mx-auto" />
      </div>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
        Tote
      </h1>
      <p className="mb-8 max-w-xs text-base" style={{ color: 'var(--text-muted)' }}>
        Your grocery lists, one per store.
      </p>
      <Link href="/sign-in">
        <Button
          size="lg"
          className="rounded-full px-8 font-medium"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Get started
        </Button>
      </Link>
    </div>
  );
}
