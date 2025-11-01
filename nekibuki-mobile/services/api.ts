// API Service for Nekibuki Backend
// Based on swagger.yaml specification

export interface LocationInfo {
  city: string;
  country: string;
  region: string;
}

export interface AttractionInfo {
  confidence: number;
  description: string;
  historical_info: string;
  interesting_facts: string[];
  quick_facts: Array<{ key: string; value: string }>;
  location: LocationInfo;
  name: string;
  significance: string;
}

export interface ErrorDetail {
  code: string;
  details: string;
  message: string;
}

export interface RecognitionResponse {
  message: string;
  session_id: string;
  status: string;
}

export interface RecognitionResult {
  attraction_info?: AttractionInfo;
  error?: ErrorDetail;
  processing_time_ms: number;
  session_id: string;
  status: string;
}

export interface SessionSummary {
  confidence_score: number;
  created_at: string;
  error_message: string;
  id: string;
  image_hash: string;
  image_path: string;
  primary_attraction: string;
  processing_completed_at: string;
  processing_started_at: string;
  status: string;
}

export interface ErrorResponse {
  code: number;
  error: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  system: {
    timestamp: string;
    uptime: string;
  };
  database: {
    status: string;
    connections: number;
    max_connections: number;
  };
}

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.14:8080';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Health Check
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  // Upload photo for recognition
  async uploadPhoto(photoUri: string): Promise<RecognitionResponse> {
    const formData = new FormData();
    
    // Create a file object from the photo URI
    const filename = photoUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('photo', {
      uri: photoUri,
      name: filename,
      type,
    } as any);

    const response = await fetch(`${this.baseUrl}/api/recognition/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  // Get recognition result by session ID
  async getRecognitionResult(sessionId: string): Promise<RecognitionResult> {
    const response = await fetch(`${this.baseUrl}/api/recognition/result/${sessionId}`);
    
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || `Failed to get result: ${response.status}`);
    }

    return response.json();
  }

  // Get recent sessions (for debugging)
  async getRecentSessions(limit: number = 10): Promise<SessionSummary[]> {
    const response = await fetch(`${this.baseUrl}/api/recognition/sessions?limit=${limit}`);
    
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.message || `Failed to get sessions: ${response.status}`);
    }

    return response.json();
  }

  // Polling function for recognition result
  async pollRecognitionResult(
    sessionId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (attempt: number, status: string) => void;
    } = {}
  ): Promise<RecognitionResult> {
    const { maxAttempts = 30, intervalMs = 2000, onProgress } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.getRecognitionResult(sessionId);
        
        onProgress?.(attempt, result.status);

        // Check if processing is complete
        if (result.status === 'completed' || result.status === 'failed') {
          return result;
        }

        // Wait before next attempt if not the last one
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        // If it's the last attempt, throw the error
        if (attempt === maxAttempts) {
          throw error;
        }
        
        // For other attempts, wait and retry
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    throw new Error(`Recognition polling timed out after ${maxAttempts} attempts`);
  }
}

export const apiService = new ApiService();
export default apiService; 