'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { Header } from '@/components/header';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const getTitle = () => {
    const segment = pathname.split('/').pop()?.replace('-', ' ') || 'dashboard';
    if (segment === 'dashboard') return 'Dashboard';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-12 w-12 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        <p className="text-muted-foreground">Securing your session...</p>
      </div>
    </div>
    );
  }

  return (
    <>
      <DashboardSidebar />
      <SidebarInset>
        <Header title={getTitle()} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
