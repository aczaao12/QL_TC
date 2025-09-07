'use client';

import { useEffect } from 'react';
import { setupNotifications } from '@/services/notification';
import { syncFromFirestore } from '@/services/db';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupNotifications();
    syncFromFirestore(); // Sync from Firestore on app load
  }, []);

  return <>{children}</>;
}
