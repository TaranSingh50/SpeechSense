import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useCallback } from "react";

export function useAudioLibrary() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch audio files with aggressive refresh settings
  const {
    data: audioFiles = [],
    isLoading,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ["/api/audio"],
    enabled: !!user,
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache results
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Force refresh function
  const forceRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/audio"] });
    await refetch();
  }, [queryClient, refetch]);

  // Auto-refresh after mutations
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refetch();
      }
    }, 5000); // Refresh every 5 seconds as fallback

    return () => clearInterval(interval);
  }, [user, refetch]);

  return {
    audioFiles,
    isLoading: isLoading || isRefetching,
    forceRefresh,
    refetch,
  };
}