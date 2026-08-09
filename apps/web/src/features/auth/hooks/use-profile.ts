'use client';

import { useAuth } from '@/providers/auth-provider';
import { usersApi } from '@/services/auth.service';
import type { User } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';

export function useProfile() {
  const { isAuthenticated } = useAuth();

  return useQuery<User>({
    queryKey: ['profile'],
    queryFn: () => usersApi.me(),
    enabled: isAuthenticated,
  });
}
