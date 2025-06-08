import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import apiService, { RecognitionResponse, RecognitionResult } from '../services/api';

export interface UploadPhotoOptions {
  onProgress?: (attempt: number, status: string) => void;
  onComplete?: (result: RecognitionResult) => void;
  onError?: (error: Error) => void;
}

// Hook for uploading photo and automatically polling for results
export function useUploadPhoto(options: UploadPhotoOptions = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pollingSessionId, setPollingSessionId] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ photoUri }: { photoUri: string }) => apiService.uploadPhoto(photoUri),
    onSuccess: async (response: RecognitionResponse, { photoUri }) => {
      // Start polling for the result
      setPollingSessionId(response.session_id);
      try {
        const result = await apiService.pollRecognitionResult(response.session_id, {
          maxAttempts: 30,
          intervalMs: 2000,
          onProgress: (attempt, status) => {
            setPollAttempt(attempt);
            options.onProgress?.(attempt, status);
          },
        });

        // Cache the result
        queryClient.setQueryData(
          ['recognition-result', response.session_id],
          result
        );

        setPollingSessionId(null);
        setPollAttempt(0);
        options.onComplete?.(result);

        // Navigate to result screen
        router.push({
          pathname: '/recognition-result',
          params: { 
            sessionId: response.session_id,
            photoUri: photoUri 
          }
        } as any);
      } catch (error) {
        setPollingSessionId(null);
        setPollAttempt(0);
        options.onError?.(error as Error);
      }
    },
    onError: (error: Error) => {
      setPollingSessionId(null);
      setPollAttempt(0);
      options.onError?.(error);
    },
  });

  return {
    uploadPhoto: (photoUri: string) => uploadMutation.mutateAsync({ photoUri }),
    isUploading: uploadMutation.isPending,
    isPolling: pollingSessionId !== null,
    pollAttempt,
    error: uploadMutation.error,
    reset: uploadMutation.reset,
  };
}

// Hook for getting recognition result
export function useRecognitionResult(sessionId: string) {
  return useQuery({
    queryKey: ['recognition-result', sessionId],
    queryFn: () => apiService.getRecognitionResult(sessionId),
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });
}

// Hook for polling recognition result manually
export function usePollRecognitionResult(sessionId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['recognition-result-poll', sessionId],
    queryFn: () => apiService.getRecognitionResult(sessionId),
    enabled: enabled && !!sessionId,
    refetchInterval: (data) => {
      // Stop polling if processing is complete or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
    retry: false, // Don't retry, let polling handle it
  });
}

// Hook for getting recent sessions
export function useRecentSessions(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-sessions', limit],
    queryFn: () => apiService.getRecentSessions(limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Hook for health check
export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiService.checkHealth(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
} 