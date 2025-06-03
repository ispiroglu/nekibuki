import ApiService, { ApiResponse, UploadProgress } from './api';

// Updated interfaces to match swagger definitions
export interface AttractionInfo {
  confidence: number;
  description: string;
  historical_info: string;
  interesting_facts: string[];
  location: {
    city: string;
    country: string;
    region: string;
  };
  name: string;
  significance: string;
}

export interface RecognitionResponse {
  message: string;
  session_id: string;
  status: string;
}

export interface RecognitionResult {
  attraction_info?: AttractionInfo;
  error?: {
    code: string;
    details: string;
    message: string;
  };
  processing_time_ms: number;
  session_id: string;
  status: string;
}

// Legacy interface for backward compatibility
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
  session_id: string;
  status: string;
}

export interface AnalysisStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: RecognitionResult;
  error?: string;
}

class PhotoService {
  private readonly POLLING_INTERVAL = 2000; // 2 seconds
  private readonly MAX_POLLING_ATTEMPTS = 30; // 1 minute total

  /**
   * Upload a photo for landmark analysis using the swagger-documented endpoint
   */
  async uploadPhoto(
    photoUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<RecognitionResponse>> {
    const fileName = `photo_${Date.now()}.jpg`;
    
    
      return ApiService.uploadFileWithPost<RecognitionResponse>(
        '/api/recognition/upload',
        photoUri,
        fileName,
        'photo' // use 'photo' as the form field name to match swagger
      );
    
  }

  /**
   * Get analysis result for a session ID
   */
  async getAnalysisResult(sessionId: string): Promise<ApiResponse<RecognitionResult>> {
    return ApiService.get<RecognitionResult>(`/api/recognition/result/${sessionId}`);
  }

  /**
   * Poll for analysis completion with automatic retry
   */
  async pollForAnalysisResult(
    sessionId: string,
    onProgress?: (status: string, attempt: number) => void
  ): Promise<ApiResponse<RecognitionResult>> {
    let attempt = 0;
    
    while (attempt < this.MAX_POLLING_ATTEMPTS) {
      attempt++;
      
      try {
        onProgress?.(`Checking analysis status... (${attempt}/${this.MAX_POLLING_ATTEMPTS})`, attempt);
        
        const response = await this.getAnalysisResult(sessionId);
        
        if (!response.success) {
          // If we get an error, continue polling as it might be temporary
          if (attempt === this.MAX_POLLING_ATTEMPTS) {
            return response;
          }
        } else if (response.data) {
          const result = response.data;
          
          // Check if processing is complete
          if (result.status === 'completed') {
            return response;
          } else if (result.status === 'failed') {
            return {
              success: false,
              error: result.error?.message || 'Analysis failed',
            };
          }
          // If status is 'pending' or 'processing', continue polling
        }
        
        // Wait before next attempt
        if (attempt < this.MAX_POLLING_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempt === this.MAX_POLLING_ATTEMPTS) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Polling failed',
          };
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
      }
    }
    
    return {
      success: false,
      error: 'Analysis timed out - please try again',
    };
  }

  /**
   * Complete upload and analysis workflow
   */
  async uploadPhotoAndWaitForAnalysis(
    photoUri: string,
    onUploadProgress?: (progress: UploadProgress) => void,
    onAnalysisProgress?: (status: string, attempt: number) => void
  ): Promise<ApiResponse<RecognitionResult>> {
    try {
      // Step 1: Upload photo with progress tracking if callback provided
      const uploadResponse = await this.uploadPhoto(photoUri, onUploadProgress);
      
      if (!uploadResponse.success || !uploadResponse.data) {
        return {
          success: false,
          error: uploadResponse.error || 'Failed to upload photo',
        };
      }
      
      const sessionId = uploadResponse.data.session_id;
      
      // Step 2: Poll for results
      const analysisResponse = await this.pollForAnalysisResult(sessionId, onAnalysisProgress);
      
      return analysisResponse;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload and analysis failed',
      };
    }
  }

  /**
   * Convert new AttractionInfo format to legacy LandmarkAnalysis format for backward compatibility
   */
  convertToLegacyFormat(attractionInfo: AttractionInfo): LandmarkAnalysis {
    return {
      id: `attraction_${Date.now()}`,
      name: attractionInfo.name,
      confidence: attractionInfo.confidence,
      location: {
        latitude: 0, // Not available in new format
        longitude: 0, // Not available in new format
        address: `${attractionInfo.location.city}, ${attractionInfo.location.region}, ${attractionInfo.location.country}`,
      },
      description: attractionInfo.description,
      facts: attractionInfo.interesting_facts,
      historicalInfo: {
        period: 'Unknown', // Not available in new format
        significance: attractionInfo.significance,
      },
      quickFacts: {
        'Historical Info': attractionInfo.historical_info,
        'Significance': attractionInfo.significance,
        'Location': `${attractionInfo.location.city}, ${attractionInfo.location.country}`,
      },
    };
  }

  /**
   * Get user's photo history (placeholder - not implemented in swagger)
   */
  async getPhotoHistory(): Promise<ApiResponse<any[]>> {
    // This endpoint is not defined in the swagger file
    // You may need to implement this on the backend
    return {
      success: false,
      error: 'Photo history endpoint not implemented',
    };
  }

  /**
   * Delete a photo (placeholder - not implemented in swagger)
   */
  async deletePhoto(photoId: string): Promise<ApiResponse<{ success: boolean }>> {
    // This endpoint is not defined in the swagger file
    // You may need to implement this on the backend
    return {
      success: false,
      error: 'Delete photo endpoint not implemented',
    };
  }

  /**
   * Get recent sessions for debugging
   */
  async getRecentSessions(limit: number = 10): Promise<ApiResponse<any[]>> {
    return ApiService.get<any[]>(`/api/recognition/sessions?limit=${limit}`);
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
   * Parse landmark analysis from JSON string (legacy method)
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
  async mockPhotoAnalysis(photoUri: string): Promise<ApiResponse<RecognitionResult>> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockAttractionInfo: AttractionInfo = {
          name: 'The Eiffel Tower',
          confidence: 95,
          description: 'The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.',
          historical_info: 'Built for the 1889 World\'s Fair as the entrance arch',
          interesting_facts: [
            'Built for the 1889 World\'s Fair',
            'Originally intended to be temporary',
            'Can be 15 cm taller in summer due to thermal expansion',
          ],
          location: {
            city: 'Paris',
            region: 'Île-de-France',
            country: 'France',
          },
          significance: 'Symbol of France and engineering marvel of the 19th century',
        };

        resolve({
          success: true,
          data: {
            session_id: `session_${Date.now()}`,
            status: 'completed',
            processing_time_ms: 2000,
            attraction_info: mockAttractionInfo,
          },
        });
      }, 2000); // Simulate 2 second processing time
    });
  }
}

export default new PhotoService(); 