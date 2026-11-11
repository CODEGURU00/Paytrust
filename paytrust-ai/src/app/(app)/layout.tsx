import { createClient } from '@/lib/supabase/server';
import { DemoRouterProvider } from '@/components/demo/demo-router';
import { AppShell } from '@/components/shell/app-shell';

export const dynamic = 'force-dynamic';

async function getViewer() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        displayName: 'Arjun Sharma',
        email: 'arjun@paytrust.demo',
        signedIn: false,
      };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    return {
      displayName:
        profile?.display_name ||
        (user.user_metadata?.display_name as string | undefined) ||
        user.email?.split('@')[0] ||
        'Arjun Sharma',
      email: user.email || 'demo@paytrust.app',
      signedIn: true,
    };
  } catch {
    return {
      displayName: 'Arjun Sharma',
      email: 'arjun@paytrust.demo',
      signedIn: false,
    };
  }
}

export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <DemoRouterProvider>
      <AppShell
        displayName={viewer.displayName}
        email={viewer.email}
        signedIn={viewer.signedIn}
      >
        {children}
      </AppShell>
    </DemoRouterProvider>
  );
}
