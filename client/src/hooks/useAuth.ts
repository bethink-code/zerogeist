import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  isAdmin: boolean;
  onboardingComplete: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        return await apiRequest("/api/auth/user");
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData(["auth-user"], null);
      window.location.href = "/";
    },
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin ?? false,
    logout: logoutMutation.mutate,
  };
}
