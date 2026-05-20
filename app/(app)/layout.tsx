import { TopBar } from '@/components/stores/top-bar';
import { InstallPrompt } from '@/components/install-prompt';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <TopBar />
      <main className="flex-1">{children}</main>
      <InstallPrompt />
    </div>
  );
}
