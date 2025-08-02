import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useScheduleStore } from '@/store/useScheduleStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { initializeFromSupabase } = useScheduleStore();

  useEffect(() => {
    if (user) {
      initializeFromSupabase();
    }
  }, [user, initializeFromSupabase]);

  return <>{children}</>;
}