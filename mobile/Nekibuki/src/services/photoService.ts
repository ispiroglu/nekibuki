import ApiService, { ApiResponse, UploadProgress } from './api';

export interface LandmarkAnalysis {
  id: string;
  name: string;
  confidence: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  description: string;
  facts: string[];
  historicalInfo: {
    period: string;
    architect?: string;
    significance: string;
  };
  quickFacts: {
    [key: string]: string;
  };
}

export interface PhotoUploadResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    prompt: string;
    analysis: LandmarkAnalysis; // Now a parsed object instead of JSON string
    status: string;
    createdAt: string;
    completedAt?: string;
    errorMsg?: string;
  };
  error?: string;
}

export interface AnalysisStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  analysis?: LandmarkAnalysis;
  error?: string;
}

class PhotoService {
  /**
   * Upload a photo for landmark analysis
   */
  async uploadPhoto(
    photoUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<PhotoUploadResponse>> {
    const fileName = `photo_${Date.now()}.jpg`;
    
    const response = await ApiService.uploadFile<PhotoUploadResponse>(
      '/api/v1/upload',
      photoUri,
      fileName,
      onProgress
    );

    return response;
  }

  /**
   * Get analysis status and results for a photo
   */
  async getAnalysisStatus(photoId: string): Promise<ApiResponse<AnalysisStatusResponse>> {
    return ApiService.get<AnalysisStatusResponse>(`/photos/${photoId}/analysis`);
  }

  /**
   * Get user's photo history
   */
  async getPhotoHistory(): Promise<ApiResponse<PhotoUploadResponse[]>> {
    return ApiService.get<PhotoUploadResponse[]>('/photos/history');
  }

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: string): Promise<ApiResponse<{ success: boolean }>> {
    return ApiService.post<{ success: boolean }>(`/photos/${photoId}/delete`, {});
  }

  /**
   * Get landmark information by ID
   */
  async getLandmarkInfo(landmarkId: string): Promise<ApiResponse<LandmarkAnalysis>> {
    return ApiService.get<LandmarkAnalysis>(`/landmarks/${landmarkId}`);
  }

  /**
   * Search landmarks by name or location
   */
  async searchLandmarks(query: string): Promise<ApiResponse<LandmarkAnalysis[]>> {
    return ApiService.get<LandmarkAnalysis[]>(`/landmarks/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Parse landmark analysis from JSON string
   */
  parseLandmarkAnalysis(analysisJson: string): LandmarkAnalysis | null {
    try {
      return JSON.parse(analysisJson) as LandmarkAnalysis;
    } catch (error) {
      console.error('Failed to parse landmark analysis:', error);
      return null;
    }
  }

  /**
   * Mock function for development - simulates photo analysis
   * Remove this when you have a real backend
   */
  async mockPhotoAnalysis(photoUri: string): Promise<ApiResponse<PhotoUploadResponse>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockLandmark: LandmarkAnalysis = {
          id: 'landmark_001',
          name: 'The Eiffel Tower',
          confidence: 95,
          location: {
            latitude: 48.8584,
            longitude: 2.2945,
            address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris, France',
          },
          description: 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.',
          facts: [
            'Built for the 1889 World\'s Fair',
            'Originally intended to be temporary',
            'Can be 15 cm taller in summer due to thermal expansion',
          ],
          historicalInfo: {
            period: '1887-1889',
            architect: 'Gustave Eiffel',
            significance: 'Symbol of France and engineering marvel of the 19th century',
          },
          quickFacts: {
            'Height': '330 meters',
            'Construction': '1887-1889',
            'Visitors/Year': '7 million',
            'Weight': '10,100 tons',
          },
        };

        resolve({
          success: true,
          data: {
            success: true,
            message: 'File analyzed successfully',
            data: {
              id: `photo_${Date.now()}`,
              fileName: 'photo.jpg',
              fileSize: 123456,
              mimeType: 'image/jpeg',
              prompt: 'Analyze this landmark',
              analysis: mockLandmark,
              status: 'completed',
              createdAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
            },
          },
        });
      }, 2000); // Simulate 2 second processing time
    });
  }
}

export default new PhotoService(); 