import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MarketingHero } from '@/components/marketing/marketing-hero';

export default async function MarketingPage() {
  const user = await currentUser();
  if (user) redirect('/stores');

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <MarketingHero />
    </div>
  );
}
