'use client';

import { useEffect } from 'react';
import { setupNotifications } from '@/services/notification';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupNotifications();
  }, []);

  return <>{children}</>;
}
