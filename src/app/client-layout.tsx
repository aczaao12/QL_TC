'use client';

import { useEffect } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // No notifications setup for now
  }, []);

  return <>{children}</>;
}
