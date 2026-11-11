'use client';

import { useRouter } from 'next/navigation';
import { DemoProvider } from './demo-provider';

export function DemoRouterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  return <DemoProvider router={router}>{children}</DemoProvider>;
}
